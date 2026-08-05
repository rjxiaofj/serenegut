<template>
	<view class="page-wrap">
		<!-- 筛选栏 -->
		<view class="filter-bar glass-card fade-in-up">
			<view class="filter-left">
				<input v-model="keyword" class="sg-input" style="width: 200px;" placeholder="搜索标题 / 作者" @confirm="onSearch" />
				<select v-model="catFilter" class="sg-select" style="width: 130px;" @change="onSearch">
					<option value="">全部分类</option>
					<option v-for="c in cats" :key="c" :value="c">{{ c }}</option>
				</select>
				<select v-model="statusFilter" class="sg-select" style="width: 120px;" @change="onSearch">
					<option value="">全部状态</option>
					<option value="published">已发布</option>
					<option value="draft">草稿</option>
				</select>
				<view class="sg-btn sg-btn-primary sg-btn-sm" @click="onSearch">查询</view>
			</view>
		</view>

		<!-- 加载中（含刷新时也显示居中加载动画） -->
		<view v-if="loading || refreshing" class="loading-wrap glass-card">
			<view class="spinner"></view>
		</view>

		<!-- 网络异常 -->
		<view v-else-if="error" class="loading-wrap glass-card error-wrap">
			<text class="text-muted err-text">网络异常，请检查网络后重试</text>
			<view class="sg-btn sg-btn-primary sg-btn-sm" @click="loadData">重试</view>
		</view>

		<template v-else>
			<!-- 文章列表表格 -->
			<view v-if="list.length" class="article-table glass-card fade-in-up">
				<!-- 表头 -->
				<view class="table-header">
					<text class="th-col th-cover">封面</text>
					<text class="th-col th-title">标题</text>
					<text class="th-col th-cat">分类</text>
					<text class="th-col th-author">作者</text>
					<text class="th-col th-stats">数据</text>
					<text class="th-col th-status">状态</text>
					<text class="th-col th-time">发布时间</text>
					<text class="th-col th-actions">操作</text>
				</view>
				<!-- 表体 -->
				<view
					v-for="(a, i) in list"
					:key="a.id"
					class="table-row fade-in-up"
					:style="{ animationDelay: i * 0.03 + 's' }"
				>
					<!-- 封面缩略图 -->
					<view class="td-col td-cover">
						<image
							v-if="a.cover_image || a.coverImage"
							:src="a.cover_image || a.coverImage"
							mode="aspectFill"
							class="cover-thumb"
						/>
						<view v-else class="cover-placeholder-sm" :style="{ background: getCategoryColor(a.category) }">
							<text class="cover-placeholder-char">{{ (a.category || '?')[0] }}</text>
						</view>
					</view>
					<!-- 标题 + 摘要 -->
					<view class="td-col td-title">
						<view class="title-row">
							<text v-if="a.top" class="sg-tag sg-tag-warning row-badge">推流</text>
							<text class="row-title" @click="openEdit(a)">{{ a.title }}</text>
						</view>
						<text class="row-summary">{{ a.summary || '暂无摘要' }}</text>
					</view>
					<!-- 分类 -->
					<view class="td-col td-cat">
						<text class="cat-tag">{{ a.category || '未分类' }}</text>
					</view>
					<!-- 作者 -->
					<view class="td-col td-author">
						<text class="author-text">{{ a.author || '未知' }}</text>
					</view>
					<!-- 数据统计 -->
					<view class="td-col td-stats">
						<view class="stats-wrap">
							<text class="stat-item">{{ a.views }} 阅读</text>
							<text class="stat-item">{{ a.likes }} 赞</text>
						</view>
					</view>
					<!-- 状态 -->
					<view class="td-col td-status">
						<text :class="a.status === 'published' ? 'status-dot published' : 'status-dot draft'"></text>
						<text :class="a.status === 'published' ? 'status-text published' : 'status-text draft'">{{ a.status === 'published' ? '已发布' : '草稿' }}</text>
					</view>
					<!-- 发布时间 -->
					<view class="td-col td-time">
						<text class="time-text">{{ a.publishTime || '—' }}</text>
					</view>
					<!-- 操作 -->
					<view class="td-col td-actions">
						<view class="action-btn edit" @click="openEdit(a)">编辑</view>
						<view class="action-btn" @click="togglePublish(a)">{{ a.status === 'published' ? '下架' : '发布' }}</view>
						<view class="action-btn" @click="toggleTop(a)">{{ a.top ? '取消推流' : '推流' }}</view>
						<view class="action-btn danger" @click="del(a)">删除</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else class="empty-state-wrap glass-card fade-in-up">
				<view class="empty-circle"></view>
				<text class="empty-title">暂无文章</text>
				<text class="empty-hint">点击"发布文章"开始创作</text>
			</view>

			<!-- 分页 -->
			<view v-if="list.length" class="pagination-bar glass-card fade-in-up">
				<text class="page-info">共 {{ total }} 篇 · 第 {{ page }} / {{ totalPages }} 页</text>
				<view class="sg-pagination">
					<view class="sg-page-btn" :class="{ disabled: page === 1 }" @click="go(page - 1)">上一页</view>
					<view
						v-for="p in visiblePages"
						:key="p"
						class="sg-page-btn"
						:class="{ active: p === page }"
						@click="go(p)"
					>{{ p }}</view>
					<view class="sg-page-btn" :class="{ disabled: page === totalPages }" @click="go(page + 1)">下一页</view>
				</view>
			</view>
		</template>

		<!-- 右下角浮窗小球：刷新 + 新增 -->
		<view class="float-ball-group">
			<view class="float-ball float-ball-refresh" :class="{ spinning: refreshing }" @click="refresh">
				<text class="float-ball-icon">↻</text>
			</view>
			<view class="float-ball float-ball-add" @click="openCreate">
				<text class="float-ball-icon">+</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { articleApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const list = ref([])
const total = ref(0)
const keyword = ref('')
let inited = false
const catFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = 10

let needRefreshOnShow = false
const cats = ['饮食调理', '运动健康', '肠道菌群', '生活习惯', '疾病科普', '心理健康']

async function loadData() {
	if (loading.value || refreshing.value) return
	loading.value = true
	error.value = false
	try {
		const res = await articleApi.getList({
			page: page.value,
			size: pageSize,
			keyword: keyword.value,
			category: catFilter.value,
			status: statusFilter.value
		})
		if (res && res.code === 0 && res.data) {
			list.value = res.data.list || []
			total.value = res.data.total || 0
		} else {
			throw new Error(res && res.message ? res.message : '获取数据失败')
		}
	} catch (e) {
		error.value = true
		list.value = []
		total.value = 0
	} finally {
		loading.value = false
	}
}

async function refresh() {
	if (refreshing.value || loading.value) return
	refreshing.value = true
	try {
		const res = await articleApi.getList({
			page: page.value,
			size: pageSize,
			keyword: keyword.value,
			category: catFilter.value,
			status: statusFilter.value
		}, true)
		if (res && res.code === 0 && res.data) {
			list.value = res.data.list || []
			total.value = res.data.total || 0
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

onShow(() => {
	if (needRefreshOnShow && !loading.value && !refreshing.value) {
		needRefreshOnShow = false
		refresh()
	}
})

const totalPages = computed(() => Math.ceil(total.value / pageSize) || 1)
const visiblePages = computed(() => {
	const tp = totalPages.value
	const cur = page.value
	const pages = []
	for (let p = 1; p <= tp; p++) {
		if (p === 1 || p === tp || Math.abs(p - cur) <= 2) pages.push(p)
	}
	return pages
})

function go(p) {
	if (p >= 1 && p <= totalPages.value) {
		page.value = p
		loadData()
	}
}
function onSearch() {
	page.value = 1
	loadData()
}

function openCreate() {
	needRefreshOnShow = true
	uni.navigateTo({ url: '/pages/business/articles/edit' })
}

function openEdit(a) {
	needRefreshOnShow = true
	uni.navigateTo({ url: `/pages/business/articles/edit?id=${a.id}` })
}

async function togglePublish(a) {
	try {
		await articleApi.togglePublish(a.id)
		uni.showToast({ title: a.status === 'published' ? '已下架' : '已发布', icon: 'success' })
		refresh()
	} catch (e) {
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}
async function toggleTop(a) {
	try {
		await articleApi.toggleTop(a.id)
		uni.showToast({ title: a.top ? '已取消推流' : '已设为首页推流', icon: 'success' })
		refresh()
	} catch (e) {
		uni.showToast({ title: '操作失败', icon: 'none' })
	}
}
async function del(a) {
	const res = await uni.showModal({
		title: '确认删除',
		content: '确认删除该文章？此操作不可恢复。',
		confirmColor: '#c0533c'
	})
	if (!res.confirm) return
	try {
		await articleApi.delete(a.id)
		uni.showToast({ title: '删除成功', icon: 'success' })
		refresh()
	} catch (e) {
		uni.showToast({ title: '删除失败', icon: 'none' })
	}
}

function getCategoryColor(cat) {
	const colors = {
		'饮食调理': 'linear-gradient(135deg, #8d4b00 0%, #b15f00 100%)',
		'运动健康': 'linear-gradient(135deg, #2d7a3e 0%, #4a9e5e 100%)',
		'肠道菌群': 'linear-gradient(135deg, #4a3a8e 0%, #6b5ab5 100%)',
		'生活习惯': 'linear-gradient(135deg, #8e6b3a 0%, #b18a54 100%)',
		'疾病科普': 'linear-gradient(135deg, #8e3a3a 0%, #b15454 100%)',
		'心理健康': 'linear-gradient(135deg, #3a6b8e 0%, #548ab1 100%)'
	}
	return colors[cat] || 'linear-gradient(135deg, #8d4b00 0%, #b15f00 100%)'
}
</script>

<style scoped>
/* ===================== 筛选栏 ===================== */
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
.filter-center {
	display: flex;
	align-items: center;
}
.filter-right {
	display: flex;
	gap: 8px;
}

/* ===================== 文章表格 ===================== */
.article-table {
	overflow: hidden;
	padding: 0;
}

/* 表头 */
.table-header {
	display: flex;
	align-items: center;
	padding: 10px 16px;
	background: rgba(141, 75, 0, 0.04);
	border-bottom: 2px solid rgba(141, 75, 0, 0.08);
	font-size: 12px;
	font-weight: 600;
	color: var(--text-secondary);
	white-space: nowrap;
}
.th-col {
	padding: 0 6px;
}

/* 列宽分配 */
.th-cover, .td-cover { width: 72px; min-width: 72px; flex-shrink: 0; }
.th-title, .td-title { flex: 1; min-width: 0; }
.th-cat, .td-cat { width: 90px; flex-shrink: 0; }
.th-author, .td-author { width: 80px; flex-shrink: 0; }
.th-stats, .td-stats { width: 100px; flex-shrink: 0; }
.th-status, .td-status { width: 80px; flex-shrink: 0; }
.th-time, .td-time { width: 130px; flex-shrink: 0; }
.th-actions, .td-actions { width: 200px; flex-shrink: 0; }

/* 表行 */
.table-row {
	display: flex;
	align-items: center;
	padding: 10px 16px;
	border-bottom: 1px solid rgba(255, 220, 195, 0.12);
	transition: background 0.2s;
}
.table-row:last-child {
	border-bottom: none;
}
.table-row:hover {
	background: rgba(141, 75, 0, 0.025);
}
.td-col {
	padding: 0 6px;
}

/* ===================== 封面缩略图 ===================== */
.cover-thumb {
	width: 60px;
	height: 45px;
	border-radius: 8px;
	object-fit: cover;
}
.cover-placeholder-sm {
	width: 60px;
	height: 45px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
}
.cover-placeholder-char {
	font-size: 16px;
	font-weight: 700;
	color: rgba(255, 255, 255, 0.75);
}

/* ===================== 标题列 ===================== */
.td-title {
	display: flex;
	flex-direction: column;
	gap: 3px;
	min-width: 0;
}
.title-row {
	display: flex;
	align-items: center;
	gap: 6px;
}
.row-badge {
	font-size: 10px !important;
	padding: 1px 6px !important;
	border-radius: 3px !important;
	flex-shrink: 0;
}
.row-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-primary);
	cursor: pointer;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.row-title:hover {
	color: var(--primary);
}
.row-summary {
	font-size: 12px;
	color: var(--text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* ===================== 分类标签 ===================== */
.cat-tag {
	font-size: 12px;
	color: var(--text-secondary);
	background: rgba(141, 75, 0, 0.06);
	padding: 2px 8px;
	border-radius: 4px;
	white-space: nowrap;
}

/* ===================== 作者 ===================== */
.author-text {
	font-size: 13px;
	color: var(--text-secondary);
}

/* ===================== 数据统计 ===================== */
.stats-wrap {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
.stat-item {
	font-size: 11px;
	color: var(--text-muted);
}

/* ===================== 状态 ===================== */
.td-status {
	display: flex;
	align-items: center;
	gap: 5px;
}
.status-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}
.status-dot.published {
	background: #3ba55d;
	box-shadow: 0 0 6px rgba(59, 165, 93, 0.4);
}
.status-dot.draft {
	background: #b0a090;
}
.status-text {
	font-size: 12px;
}
.status-text.published {
	color: #3ba55d;
}
.status-text.draft {
	color: var(--text-muted);
}

/* ===================== 时间 ===================== */
.time-text {
	font-size: 12px;
	color: var(--text-muted);
	white-space: nowrap;
}

/* ===================== 操作按钮 ===================== */
.td-actions {
	display: flex;
	gap: 4px;
}
.action-btn {
	font-size: 12px;
	padding: 3px 10px;
	border-radius: 4px;
	color: var(--text-secondary);
	background: rgba(141, 75, 0, 0.04);
	cursor: pointer;
	transition: all 0.2s;
	white-space: nowrap;
}
.action-btn:hover {
	background: rgba(141, 75, 0, 0.1);
	color: var(--primary);
}
.action-btn.edit {
	color: var(--primary);
	background: rgba(141, 75, 0, 0.08);
}
.action-btn.edit:hover {
	background: rgba(141, 75, 0, 0.15);
}
.action-btn.danger {
	color: #c53535;
	background: rgba(197, 53, 53, 0.04);
}
.action-btn.danger:hover {
	background: rgba(197, 53, 53, 0.12);
}

/* ===================== 空状态 ===================== */
.empty-state-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding: 60px 20px;
}
.empty-circle {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	border: 2px dashed rgba(255, 220, 195, 0.4);
	background: var(--bg-veil);
}
.empty-title {
	font-size: 15px;
	font-weight: 600;
	color: var(--text-secondary);
}
.empty-hint {
	font-size: 13px;
	color: var(--text-muted);
}

/* ===================== 分页 ===================== */
.pagination-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 20px;
}
.page-info {
	font-size: 13px;
	color: var(--text-muted);
}

/* ===================== 响应式 ===================== */
@media (max-width: 1024px) {
	.th-time, .td-time { display: none; }
}
@media (max-width: 768px) {
	.th-author, .td-author,
	.th-stats, .td-stats { display: none; }
	.filter-left { flex-wrap: wrap; }
}

/* ===================== 右下角浮窗小球 ===================== */
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
.float-ball-add {
	background: linear-gradient(135deg, #3ba55d, #4a9e5e);
}
.float-ball.spinning {
	animation: ball-spin 0.8s linear infinite;
}
@keyframes ball-spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>
