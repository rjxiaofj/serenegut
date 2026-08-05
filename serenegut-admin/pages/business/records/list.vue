<template>
	<view class="page-wrap">
		<!-- 筛选栏 -->
		<view class="filter-bar glass-card fade-in-up">
			<view class="filter-left">
				<input v-model="keyword" class="sg-input" style="width:260px" placeholder="搜索用户昵称" @keyup.enter="onSearch" />
				<view class="sg-btn sg-btn-primary sg-btn-sm" @click="onSearch">查询</view>
			</view>
			<text class="count-text">共 {{ total }} 位用户</text>
			<view class="sg-btn sg-btn-ghost sg-btn-sm" :class="{ 'btn-spinning': refreshing }" @click="refresh">
				{{ refreshing ? '刷新中...' : '刷新' }}
			</view>
		</view>

		<!-- 加载中 -->
		<view v-if="loading" class="loading-wrap glass-card"><view class="spinner"></view></view>

		<!-- 网络异常 -->
		<view v-else-if="error" class="loading-wrap glass-card error-wrap">
			<text class="text-muted err-text">网络异常，请检查网络后重试</text>
			<view class="sg-btn sg-btn-primary sg-btn-sm" @click="loadData">重试</view>
		</view>

		<template v-else>
			<!-- 用户卡片列表（按用户分组展示） -->
			<view v-if="paginatedUsers.length" class="user-grid">
				<view
					v-for="(u, i) in paginatedUsers"
					:key="u.userId"
					class="user-card glass-card fade-in-up"
					:style="{ animationDelay: i * 0.05 + 's' }"
					@click="openUserRecords(u)"
				>
					<view class="user-avatar-wrap">
						<image v-if="u.avatar_url" :src="u.avatar_url" mode="aspectFill" class="user-avatar" />
						<view v-else class="user-avatar-placeholder">{{ (u.nickname || '?')[0] }}</view>
					</view>
					<view class="user-info">
						<view class="user-name-row">
							<text class="user-nickname">{{ u.nickname || '未知用户' }}</text>
							<text class="user-record-count">{{ u.recordCount }} 条记录</text>
						</view>
						<view class="user-meta">
							<text class="meta-item">{{ u.email || '无邮箱' }}</text>
							<text class="meta-item">最新: {{ u.latestTime }}</text>
						</view>
					</view>
					<view class="user-arrow">›</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else class="empty-state glass-card fade-in-up">
				<text class="empty-text">暂无记录数据</text>
			</view>

			<!-- 分页（按用户分页） -->
			<view v-if="userList.length" class="table-footer glass-card fade-in-up">
				<text class="page-info">第 {{ page }} / {{ totalPages() }} 页</text>
				<view class="sg-pagination">
					<view class="sg-page-btn" :class="{ disabled: page === 1 }" @click="go(page - 1)">上一页</view>
					<template v-for="p in totalPages()" :key="p">
						<view
							v-show="Math.abs(p - page) < 3 || p === 1 || p === totalPages()"
							class="sg-page-btn"
							:class="{ active: p === page }"
							@click="go(p)"
						>{{ p }}</view>
					</template>
					<view class="sg-page-btn" :class="{ disabled: page === totalPages() }" @click="go(page + 1)">下一页</view>
				</view>
			</view>
		</template>

		<!-- 用户记录详情弹窗 -->
		<view v-if="detailVisible" class="modal-mask" @click.self="detailVisible = false">
			<view class="modal glass-card scale-in" style="max-width:900px">
				<view class="modal-title">{{ currentUser && currentUser.nickname }} 的健康记录</view>
			<view class="detail-filters">
				<select v-model="detailTypeFilter" class="sg-select" style="width:140px">
					<option value="">全部类型</option>
					<option v-for="t in 7" :key="t" :value="t">{{ t }}型</option>
				</select>
				<select v-model="detailSortOrder" class="sg-select" style="width:140px">
					<option value="desc">最新优先</option>
					<option value="asc">最早优先</option>
				</select>
			</view>
			<view style="overflow-x:auto">
					<table class="sg-table">
						<thead>
							<tr>
								<th>布里斯托类型</th>
								<th>评分</th>
								<th>感受</th>
								<th>时长(分)</th>
								<th>饮水量(ml)</th>
								<th>膳食纤维(g)</th>
								<th>记录时间</th>
							<th>操作</th>
						</tr>
						</thead>
						<tbody>
							<tr v-for="r in filteredUserRecords" :key="r.id">
								<td>
									<text class="type-badge" :style="{ background: r.color }"></text>
									<text>{{ r.bristolType }}</text>
								</td>
								<td>
									<text class="score-pill" :class="getScoreClass(r.score)">{{ r.score }}</text>
								</td>
								<td class="text-muted">{{ r.mood || '—' }}</td>
								<td class="text-muted">{{ r.duration || '—' }}</td>
								<td class="text-muted">{{ r.water ? r.water + ' ml' : '—' }}</td>
								<td class="text-muted">{{ r.fiber ? r.fiber + ' g' : '—' }}</td>
								<td class="text-muted" style="font-size:13px">{{ r.recordTime }}</td>
								<td>
									<view class="flex gap-sm">
										<view class="sg-btn sg-btn-ghost sg-btn-sm" @click="openEditRecord(r)">编辑</view>
										<view class="sg-btn sg-btn-danger sg-btn-sm" @click="confirmDeleteRecord(r)">删除</view>
									</view>
								</td>
							</tr>
							<tr v-if="!filteredUserRecords.length">
								<td colspan="8" class="empty-text">暂无记录</td>
							</tr>
						</tbody>
					</table>
				</view>
				<view class="modal-footer">
				<view class="sg-btn sg-btn-primary" @click="detailVisible = false">关闭</view>
			</view>
		</view>
	</view>

	<!-- 编辑记录弹窗 -->
	<view v-if="editRecordVisible" class="modal-mask" @click.self="editRecordVisible = false">
		<view class="modal glass-card scale-in" style="max-width:480px">
			<view class="modal-title">编辑记录</view>
			<view class="modal-body">
				<view class="form-row">
					<text class="form-label">布里斯托类型</text>
					<select v-model="editRecordForm.bristol_type" class="sg-select">
						<option v-for="t in 7" :key="t" :value="t">{{ t }}型</option>
					</select>
				</view>
				<view class="form-row">
					<text class="form-label">评分 (0-10)</text>
					<input v-model="editRecordForm.score" type="number" min="0" max="10" class="sg-input" />
				</view>
				<view class="form-row">
					<text class="form-label">感受</text>
					<input v-model="editRecordForm.feeling" class="sg-input" />
				</view>
				<view class="form-row">
					<text class="form-label">时长（分钟）</text>
					<input v-model="editRecordForm.duration" type="number" class="sg-input" />
				</view>
				<view class="form-row">
					<text class="form-label">饮水量（ml）</text>
					<input v-model="editRecordForm.water_intake" type="number" class="sg-input" />
				</view>
				<view class="form-row">
					<text class="form-label">膳食纤维（g）</text>
					<input v-model="editRecordForm.fiber_intake" type="number" class="sg-input" />
				</view>
			</view>
			<view class="modal-footer">
				<view class="sg-btn sg-btn-ghost" @click="editRecordVisible = false">取消</view>
				<view class="sg-btn sg-btn-primary" @click="saveEditRecord">保存</view>
			</view>
		</view>
	</view>
</view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { recordApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const userList = ref([])
const total = ref(0)
const keyword = ref('')
const page = ref(1)
const pageSize = 20
let inited = false

// 详情弹窗状态
const detailVisible = ref(false)
const currentUser = ref(null)
const currentUserRecords = ref([])

// 详情弹窗筛选与编辑状态
const detailTypeFilter = ref('')
const detailSortOrder = ref('desc')
const editRecordVisible = ref(false)
const editRecordForm = reactive({
	id: '',
	bristol_type: 1,
	score: 0,
	feeling: '',
	duration: '',
	water_intake: '',
	fiber_intake: ''
})

// 前端分页：对分组后的用户列表按当前页切片展示
const paginatedUsers = computed(() => {
	const start = (page.value - 1) * pageSize
	return userList.value.slice(start, start + pageSize)
})

// 详情弹窗记录筛选：按布里斯托类型过滤 + 按时间排序
const filteredUserRecords = computed(() => {
	let records = [...currentUserRecords.value]
	if (detailTypeFilter.value) {
		records = records.filter(r => Number(r.bristolType) === Number(detailTypeFilter.value))
	}
	if (detailSortOrder.value === 'asc') {
		records.reverse()
	}
	return records
})

// 加载全部记录并按用户分组
async function loadData() {
	if (loading.value || refreshing.value) return
	loading.value = true
	error.value = false
	try {
		const res = await recordApi.getList({
			page: 1,
			size: 1000,
			keyword: keyword.value
		})
		if (res && res.code === 0 && res.data) {
			// 后端已按 created_at 倒序返回，故每个用户首条记录即为其最新记录
			const userMap = {}
			for (const r of (res.data.list || [])) {
				const uid = r.userId
				if (!uid) continue
				if (!userMap[uid]) {
					userMap[uid] = {
						userId: uid,
						nickname: r.userName || '未知用户',
						avatar_url: r.avatar_url || '',
						email: r.email || '',
						recordCount: 0,
						latestTime: r.recordTime || '—',
						records: []
					}
				}
				userMap[uid].recordCount++
				userMap[uid].records.push(r)
			}
			// 转为数组并按记录数降序排列
			userList.value = Object.values(userMap).sort((a, b) => b.recordCount - a.recordCount)
			total.value = userList.value.length
			page.value = 1
		} else {
			throw new Error(res && res.message ? res.message : '获取数据失败')
		}
	} catch (e) {
		error.value = true
		userList.value = []
		total.value = 0
	} finally {
		loading.value = false
	}
}

async function refresh() {
	if (refreshing.value || loading.value) return
	refreshing.value = true
	try {
		await loadData()
	} finally {
		refreshing.value = false
	}
}

// 评分等级样式（评分范围 1-5：4-5 良好，3 中等，1-2 较差）
function getScoreClass(score) {
	if (score >= 4) return 'score-high'
	if (score === 3) return 'score-mid'
	return 'score-low'
}

function totalPages() {
	return Math.ceil(total.value / pageSize) || 1
}

function go(p) {
	if (p >= 1 && p <= totalPages()) {
		page.value = p
	}
}

function onSearch() {
	page.value = 1
	loadData()
}

// 点击用户卡片，直接展示已加载的该用户记录
// 避免按昵称重复请求接口造成的重名歧义问题
function openUserRecords(u) {
	currentUser.value = u
	currentUserRecords.value = (u.records || []).map(r => ({
		id: r.id,
		bristolType: r.bristolType || '—',
		color: r.color || '#999',
		score: r.healthScore || 0,
		mood: r.mood || r.feeling || '',
		duration: r.duration || 0,
		water: r.water || 0,
		fiber: r.fiber || 0,
		recordTime: r.recordTime || '—'
	}))
	detailVisible.value = true
}

// 打开编辑弹窗：将驼峰字段映射回下划线表单字段
function openEditRecord(r) {
	editRecordForm.id = r.id
	editRecordForm.bristol_type = Number(r.bristolType) || 1
	editRecordForm.score = r.score || 0
	editRecordForm.feeling = r.mood || ''
	editRecordForm.duration = r.duration || ''
	editRecordForm.water_intake = r.water || ''
	editRecordForm.fiber_intake = r.fiber || ''
	editRecordVisible.value = true
}

// 保存编辑：调用后端更新接口，并同步更新本地原始记录后刷新弹窗
async function saveEditRecord() {
	try {
		await recordApi.update(editRecordForm.id, {
			bristol_type: editRecordForm.bristol_type,
			score: editRecordForm.score,
			feeling: editRecordForm.feeling,
			duration: editRecordForm.duration,
			water_intake: editRecordForm.water_intake,
			fiber_intake: editRecordForm.fiber_intake
		})
		editRecordVisible.value = false
		uni.showToast({ title: '修改成功', icon: 'success' })
		// 同步更新本地原始记录，再刷新弹窗展示
		if (currentUser.value && currentUser.value.records) {
			const rec = currentUser.value.records.find(item => item.id === editRecordForm.id)
			if (rec) {
				rec.bristolType = editRecordForm.bristol_type
				rec.healthScore = editRecordForm.score
				rec.feeling = editRecordForm.feeling
				rec.mood = editRecordForm.feeling
				rec.duration = editRecordForm.duration
				rec.water = editRecordForm.water_intake
				rec.fiber = editRecordForm.fiber_intake
			}
			await openUserRecords(currentUser.value)
		}
	} catch (e) {
		uni.showToast({ title: '修改失败', icon: 'none' })
	}
}

// 删除记录确认：删除后同步移除本地列表与原始记录
async function confirmDeleteRecord(r) {
	uni.showModal({
		title: '确认删除',
		content: '确定要删除这条记录吗？',
		success: async (res) => {
			if (res.confirm) {
				try {
					await recordApi.delete(r.id)
					uni.showToast({ title: '删除成功', icon: 'success' })
					// 从当前展示列表与原始记录中同步移除
					currentUserRecords.value = currentUserRecords.value.filter(item => item.id !== r.id)
					if (currentUser.value && currentUser.value.records) {
						currentUser.value.records = currentUser.value.records.filter(item => item.id !== r.id)
						currentUser.value.recordCount--
					}
				} catch (e) {
					uni.showToast({ title: '删除失败', icon: 'none' })
				}
			}
		}
	})
}

onLoad(() => {
	if (inited) return
	inited = true
	loadData()
})
</script>

<style scoped>
.page-wrap {
	display: flex;
	flex-direction: column;
	gap: 18px;
}
.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
}
.filter-left {
	display: flex;
	align-items: center;
	gap: 10px;
}
.count-text {
	font-size: 13px;
	color: var(--text-muted);
}

/* 用户卡片网格 */
.user-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
	gap: 16px;
}
.user-card {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 16px 20px;
	cursor: pointer;
	transition: transform 0.2s, box-shadow 0.2s;
}
.user-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 24px rgba(141, 75, 0, 0.08);
}
.user-avatar-wrap {
	flex-shrink: 0;
}
.user-avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	object-fit: cover;
}
.user-avatar-placeholder {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: var(--grad-primary);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	font-weight: 700;
	color: #fff;
}
.user-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.user-name-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.user-nickname {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.user-record-count {
	font-size: 13px;
	color: var(--primary);
	font-weight: 500;
	flex-shrink: 0;
}
.user-meta {
	display: flex;
	gap: 16px;
}
.meta-item {
	font-size: 12px;
	color: var(--text-muted);
}
.user-arrow {
	font-size: 24px;
	color: var(--text-placeholder);
	flex-shrink: 0;
}

/* 弹窗 */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}
.modal {
	width: 90%;
	max-height: 80vh;
	overflow-y: auto;
	padding: 28px;
}
.modal-title {
	font-size: 18px;
	font-weight: 700;
	color: var(--text-primary);
	margin-bottom: 20px;
}
.modal-footer {
	display: flex;
	justify-content: flex-end;
	margin-top: 20px;
}

/* 详情弹窗筛选栏 */
.detail-filters {
	display: flex;
	gap: 12px;
	margin-bottom: 16px;
}

/* 编辑记录表单 */
.modal-body {
	display: flex;
	flex-direction: column;
	gap: 14px;
}
.form-row {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.form-label {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-secondary);
}

/* 类型圆点徽章 */
.type-badge {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	margin-right: 6px;
	vertical-align: middle;
}

/* 评分胶囊 */
.score-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	height: 24px;
	padding: 0 8px;
	border-radius: var(--radius-full);
	font-size: 12px;
	font-weight: 600;
}
.score-high {
	background: var(--success-soft);
	color: var(--success);
}
.score-mid {
	background: var(--warning-soft);
	color: var(--warning);
}
.score-low {
	background: var(--danger-soft);
	color: var(--danger);
}

.loading-wrap {
	display: flex;
	justify-content: center;
	padding: 80px 0;
}
.error-wrap {
	flex-direction: column;
	align-items: center;
	gap: 16px;
}
.err-text {
	font-size: 15px;
}
.empty-state {
	padding: 60px;
	text-align: center;
}
.empty-text {
	color: var(--text-placeholder);
	font-size: 14px;
}
.table-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
	flex-wrap: wrap;
	gap: 12px;
}
.page-info {
	font-size: 13px;
	color: var(--text-muted);
}
.sg-page-btn.disabled {
	opacity: 0.4;
	pointer-events: none;
}

@media (max-width: 768px) {
	.user-grid {
		grid-template-columns: 1fr;
	}
}
</style>
