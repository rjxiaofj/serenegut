<template>
	<view class="page-wrap">
		<!-- 筛选栏 -->
		<view class="filter-bar glass-card fade-in-up">
			<view class="filter-left">
				<!-- 搜索类型下拉框：按昵称 / 手机号 / 用户ID 搜索 -->
				<select v-model="searchType" class="sg-select" style="width: 120px;">
					<option value="nickname">昵称</option>
					<option value="phone">手机号</option>
					<option value="id">用户ID</option>
				</select>
				<input v-model="keyword" class="sg-input" style="width: 240px;" placeholder="搜索昵称 / 手机号 / ID" @confirm="loadData" />
				<view class="sg-btn sg-btn-primary sg-btn-sm" @click="loadData">查询</view>
			</view>
			<text class="count-text">今日 {{ totalRanked }} 人上榜 · 共 {{ list.length }} 位用户</text>
		</view>

		<!-- 加载中 -->
		<view v-if="loading" class="loading-wrap glass-card">
			<view class="spinner"></view>
		</view>

		<!-- 网络异常 -->
		<view v-else-if="error" class="loading-wrap glass-card error-wrap">
			<text class="text-muted err-text">网络异常，请检查网络后重试</text>
			<view class="sg-btn sg-btn-primary sg-btn-sm" @click="loadData">重试</view>
		</view>

		<template v-else>
			<!-- 领奖台 -->
			<view v-if="top3.length" class="podium glass-card fade-in-up" style="animation-delay: 0.1s;">
				<view class="podium-row">
					<view v-if="top3[1]" class="podium-item silver">
						<text class="crown-emoji">🥈</text>
						<image v-if="top3[1].avatar" class="podium-avatar-img" :src="top3[1].avatar" mode="aspectFill"></image>
						<view v-else class="podium-avatar" :style="{ background: medalInfo.silver.grad }">2</view>
						<text class="podium-name">{{ top3[1].name }}</text>
						<text class="podium-score">{{ top3[1].time }}</text>
						<text class="podium-label">亚军</text>
					</view>
					<view v-if="top3[0]" class="podium-item gold">
						<text class="crown-emoji gold-emoji">👑</text>
						<image v-if="top3[0].avatar" class="podium-avatar-img gold-avatar" :src="top3[0].avatar" mode="aspectFill"></image>
						<view v-else class="podium-avatar gold-avatar" :style="{ background: medalInfo.gold.grad }">1</view>
						<text class="podium-name">{{ top3[0].name }}</text>
						<text class="podium-score gold-score">{{ top3[0].time }}</text>
						<text class="podium-label">冠军</text>
						<view class="gold-ring"></view>
					</view>
					<view v-if="top3[2]" class="podium-item bronze">
						<text class="crown-emoji">🥉</text>
						<image v-if="top3[2].avatar" class="podium-avatar-img" :src="top3[2].avatar" mode="aspectFill"></image>
						<view v-else class="podium-avatar" :style="{ background: medalInfo.bronze.grad }">3</view>
						<text class="podium-name">{{ top3[2].name }}</text>
						<text class="podium-score">{{ top3[2].time }}</text>
						<text class="podium-label">季军</text>
					</view>
				</view>
			</view>

			<!-- 排名列表 -->
			<view class="table-card glass-card fade-in-up" style="animation-delay: 0.2s;">
				<view class="table-scroll">
					<table class="sg-table">
						<thead>
							<tr>
								<th>排名</th>
								<th>用户</th>
								<th>总时长</th>
								<th>记录数</th>
								<th>状态</th>
								<th>操作</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="d in tableList" :key="d.userId">
								<td>
									<text v-if="d.rank > 0" class="rank-num">{{ d.rank }}</text>
									<text v-else class="rank-num rank-zero">-</text>
								</td>
								<td class="fw-600" style="color: var(--text-primary);">{{ d.name }}</td>
								<td><text class="text-primary fw-600">{{ d.time }}</text></td>
								<td>{{ d.recordCount }}</td>
								<td>
									<text :class="d.disabled ? 'sg-tag sg-tag-danger' : 'sg-tag sg-tag-success'">{{ d.disabled ? '已禁用' : '正常' }}</text>
								</td>
								<td>
									<view class="flex gap-sm">
										<view v-if="!d.disabled" class="sg-btn sg-btn-ghost sg-btn-sm" @click="handleDisable(d)">禁用</view>
										<view v-else class="sg-btn sg-btn-primary sg-btn-sm" @click="handleEnable(d)">启用</view>
										<view class="sg-btn sg-btn-danger sg-btn-sm" @click="handleDelete(d)">删除</view>
									</view>
								</td>
							</tr>
							<tr v-if="!tableList.length">
								<td colspan="6" class="empty-text">暂无数据</td>
							</tr>
						</tbody>
					</table>
				</view>
			</view>
		</template>

		<!-- 右下角浮窗小球：刷新 -->
		<view class="float-ball-group">
			<view class="float-ball float-ball-refresh" :class="{ spinning: refreshing }" @click="refresh">
				<text class="float-ball-icon">↻</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { rankingApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const list = ref([])
const keyword = ref('')
/* 搜索类型：nickname 昵称 / phone 手机号 / id 用户ID */
const searchType = ref('nickname')
const totalRanked = ref(0)
let inited = false

async function loadData() {
	if (loading.value || refreshing.value) return
	loading.value = true
	error.value = false
	try {
		/* 调用云函数时传入搜索类型 searchType，由后端按对应字段筛选 */
		const res = await rankingApi.getList({ keyword: keyword.value, searchType: searchType.value })
		console.log('[ranking loadData] 云函数返回:', JSON.stringify(res, null, 2))
		if (res && res.code === 0 && res.data) {
			list.value = res.data.list || []
			totalRanked.value = res.data.totalUsers || 0
			console.log('[ranking loadData] list:', list.value.length, 'totalRanked:', totalRanked.value)
		} else {
			console.warn('[ranking loadData] code != 0 或无 data:', res)
			throw new Error(res && res.message ? res.message : '获取数据失败')
		}
	} catch (e) {
		console.error('[ranking loadData] 请求失败:', e)
		error.value = true
		list.value = []
		totalRanked.value = 0
	} finally {
		loading.value = false
	}
}

async function refresh() {
	if (refreshing.value || loading.value) return
	refreshing.value = true
	try {
		/* 刷新时同样传入 searchType，保证与当前筛选条件一致 */
		const res = await rankingApi.getList({ keyword: keyword.value, searchType: searchType.value }, true)
		console.log('[ranking refresh] 云函数返回:', JSON.stringify(res, null, 2))
		if (res && res.code === 0 && res.data) {
			list.value = res.data.list || []
			totalRanked.value = res.data.totalUsers || 0
			console.log('[ranking refresh] list:', list.value.length, 'totalRanked:', totalRanked.value)
			if (list.value.length === 0) {
				uni.showToast({ title: '暂无数据', icon: 'none' })
			} else {
				uni.showToast({ title: '刷新成功', icon: 'success' })
			}
		} else {
			uni.showToast({ title: (res && res.message) || '刷新失败', icon: 'none' })
		}
	} catch (e) {
		uni.showToast({ title: '网络异常，刷新失败', icon: 'none' })
	} finally {
		refreshing.value = false
	}
}
onLoad(() => {
	if (inited) return
	inited = true
	loadData()
})

const top3 = computed(() => list.value.filter(d => d.rank > 0).slice(0, 3))
const tableList = computed(() => list.value.filter(d => d.rank > 0).concat(list.value.filter(d => d.rank === 0)))

async function handleDisable(item) {
	try {
		await rankingApi.disable(item.userId)
		uni.showToast({ title: '已禁用', icon: 'success' })
		await refresh()
	} catch (e) {
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}
async function handleEnable(item) {
	try {
		await rankingApi.enable(item.userId)
		uni.showToast({ title: '已启用', icon: 'success' })
		await refresh()
	} catch (e) {
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}
async function handleDelete(item) {
	const res = await uni.showModal({
		title: '确认删除',
		content: `确认从排行榜删除「${item.name}」？此操作将清除其所有健康记录。`,
		confirmColor: '#c0533c'
	})
	if (!res.confirm) return
	try {
		await rankingApi.delete(item.userId)
		uni.showToast({ title: '删除成功', icon: 'success' })
		await refresh()
	} catch (e) {
		uni.showToast({ title: '删除失败', icon: 'none' })
	}
}

const medalInfo = {
	gold: { label: '冠军', grad: 'linear-gradient(135deg, #d4a017, #b15f00)' },
	silver: { label: '亚军', grad: 'linear-gradient(135deg, #8d4b00, #b15f00)' },
	bronze: { label: '季军', grad: 'linear-gradient(135deg, #a06b3a, #c08a5a)' }
}
</script>

<style>
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
	flex-wrap: wrap;
	gap: 12px;
}
.filter-left {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
}
.count-text {
	font-size: 13px;
	color: var(--text-muted);
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
	padding: 60px;
}
.err-text {
	font-size: 15px;
}
.table-card {
	padding: 4px 4px 16px;
	overflow: hidden;
}
.table-scroll {
	overflow-x: auto;
}
.empty-text {
	text-align: center;
	color: var(--text-placeholder);
	padding: 40px 0;
}

.podium {
	padding: 40px 24px 32px;
}
.podium-row {
	display: flex;
	align-items: flex-end;
	justify-content: center;
	gap: 40px;
}
.podium-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	position: relative;
}
.podium-avatar {
	width: 64px;
	height: 64px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: #fff;
	font-size: 24px;
	font-weight: 700;
	box-shadow: var(--shadow-md);
	margin-bottom: 12px;
	position: relative;
	z-index: 1;
}
.podium-avatar-img {
	width: 64px;
	height: 64px;
	border-radius: 50%;
	object-fit: cover;
	box-shadow: var(--shadow-md);
	margin-bottom: 12px;
	border: 3px solid rgba(255, 255, 255, 0.6);
	position: relative;
	z-index: 1;
}
.podium-item.gold .podium-avatar,
.gold-avatar {
	width: 80px;
	height: 80px;
	font-size: 30px;
	box-shadow: 0 8px 32px rgba(212, 160, 23, 0.35), var(--shadow-md);
}
.podium-avatar-img.gold-avatar {
	width: 80px;
	height: 80px;
	box-shadow: 0 8px 32px rgba(212, 160, 23, 0.35), var(--shadow-md);
}
.podium-name {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-primary);
}
.podium-score {
	font-size: 24px;
	font-weight: 700;
	color: var(--primary);
	margin: 4px 0;
}
.gold-score {
	font-size: 32px;
	background: var(--grad-primary);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
}
.podium-label {
	font-size: 12px;
	color: var(--text-muted);
}
.crown-emoji {
	position: absolute;
	top: -24px;
	font-size: 32px;
	z-index: 2;
	animation: crown-bob 2s ease-in-out infinite;
}
.gold-emoji {
	font-size: 40px;
	top: -30px;
}
@keyframes crown-bob {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-4px); }
}
.gold-ring {
	position: absolute;
	top: -8px;
	width: 96px;
	height: 96px;
	border: 2px solid rgba(212, 160, 23, 0.2);
	border-radius: 50%;
	animation: ripple 3s ease-out infinite;
}
@keyframes ripple {
	0% { transform: scale(1); opacity: 0.5; }
	100% { transform: scale(1.5); opacity: 0; }
}

.rank-num {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	background: var(--bg-soft);
	color: var(--text-secondary);
	font-size: 13px;
	font-weight: 600;
}
.rank-zero {
	color: var(--text-placeholder);
}

@media (max-width: 600px) {
	.podium-row {
		gap: 16px;
	}
	.podium-item.gold .podium-avatar,
	.gold-avatar {
		width: 60px;
		height: 60px;
	}
}

/* 右下角浮窗小球：刷新 */
.float-ball-group {
	position: fixed;
	bottom: 32px;
	right: 32px;
	display: flex;
	flex-direction: column;
	gap: 14px;
	z-index: 100;
}
.float-ball {
	width: 52px;
	height: 52px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	box-shadow: 0 4px 16px rgba(141, 75, 0, 0.25);
	transition: transform 0.2s, box-shadow 0.2s;
}
.float-ball:hover {
	transform: scale(1.1);
	box-shadow: 0 6px 24px rgba(141, 75, 0, 0.35);
}
.float-ball-icon {
	font-size: 26px;
	color: #fff;
	font-weight: 300;
	line-height: 1;
}
.float-ball-refresh {
	background: var(--grad-primary);
}
.float-ball.spinning {
	animation: ball-spin 0.8s linear infinite;
}
@keyframes ball-spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
