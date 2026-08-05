<template>
	<view class="page-wrap">
		<!-- 顶部标题栏：页面标题 + 描述 + 新增按钮 -->
		<view class="page-header glass-card fade-in-up">
			<view class="header-left">
				<text class="page-title">公告</text>
				<text class="page-desc">管理排行榜页跑马灯公告，同一时间仅可启用一条</text>
			</view>
			<view class="header-actions">
				<view class="sg-btn sg-btn-primary sg-btn-sm" @click="openAddDialog">+ 新增公告</view>
			</view>
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
			<!-- 公告列表表格 -->
			<view v-if="list.length" class="notice-table glass-card fade-in-up">
				<!-- 表头 -->
				<view class="table-header">
					<text class="th-col th-index">序号</text>
					<text class="th-col th-text">公告文案</text>
					<text class="th-col th-time">创建时间</text>
					<text class="th-col th-status">状态</text>
					<text class="th-col th-actions">操作</text>
				</view>
				<!-- 表体 -->
				<view
					v-for="(item, i) in list"
					:key="item.id"
					class="table-row fade-in-up"
					:style="{ animationDelay: i * 0.03 + 's' }"
				>
					<!-- 序号 -->
					<view class="td-col td-index">
						<text class="index-num">{{ i + 1 }}</text>
					</view>
					<!-- 文案（截断显示，hover 看 title 完整内容） -->
					<view class="td-col td-text">
						<text class="notice-text" :title="item.text">{{ truncate(item.text, 50) }}</text>
					</view>
					<!-- 创建时间 -->
					<view class="td-col td-time">
						<text class="time-text">{{ formatTime(item.createdAt) }}</text>
					</view>
					<!-- 启用状态 -->
					<view class="td-col td-status">
						<text :class="item.isActive ? 'status-dot active' : 'status-dot inactive'"></text>
						<text :class="item.isActive ? 'status-text active' : 'status-text inactive'">
							{{ item.isActive ? '启用中' : '未启用' }}
						</text>
					</view>
					<!-- 操作：启用/取消启用 + 删除 -->
					<view class="td-col td-actions">
						<view class="action-btn" :class="item.isActive ? 'cancel' : 'enable'" @click="toggleActive(item)">
							{{ item.isActive ? '取消启用' : '启用' }}
						</view>
						<view class="action-btn danger" @click="removeItem(item)">删除</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else class="empty-state glass-card fade-in-up">
				<view class="empty-circle"></view>
				<text class="empty-title">暂无公告</text>
				<text class="empty-hint">点击右上角"新增公告"开始创建</text>
			</view>
		</template>

		<!-- 右下角浮窗小球：仅刷新 -->
		<view class="float-ball-group">
			<view class="float-ball float-ball-refresh" :class="{ spinning: refreshing }" @click="refresh">
				<text class="float-ball-icon">↻</text>
			</view>
		</view>

		<!-- 新增公告弹窗 -->
		<view v-if="showAddDialog" class="modal-mask" @click.self="closeAddDialog">
			<view class="modal-card glass-card fade-in-up">
				<text class="modal-title">新增公告</text>
				<text class="modal-desc">请输入公告文案，最多 200 字。新增后默认未启用，需手动启用。</text>
				<textarea
					v-model="newText"
					class="modal-textarea"
					placeholder="请输入公告文案，如：温馨提示：本榜单依据蹲坑排名时间进行排名，仅供娱乐"
					:maxlength="200"
					rows="5"
				/>
				<text class="char-count">{{ newText.length }}/200</text>
				<view class="modal-actions">
					<view class="sg-btn sg-btn-ghost" @click="closeAddDialog">取消</view>
					<view class="sg-btn sg-btn-primary" :class="{ 'btn-spinning': saving }" @click="confirmAdd">
						{{ saving ? '保存中...' : '确认' }}
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { configApi } from '@/js_sdk/sg-admin/api.js'

// ===================== 响应式状态 =====================
const loading = ref(false)       // 首次加载
const refreshing = ref(false)    // 浮窗刷新
const saving = ref(false)        // 新增/启用/删除等写操作进行中
const error = ref(false)         // 加载失败标识
const list = ref([])             // 公告数组，结构与 rankingAnnouncements 一致

// 新增弹窗相关
const showAddDialog = ref(false)
const newText = ref('')

let inited = false

// ===================== 工具函数 =====================
// 生成唯一 id：时间戳 + 随机串，足够公告场景使用
function genId() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 时间戳格式化为 yyyy-MM-dd HH:mm
function formatTime(ts) {
	if (!ts) return '—'
	const d = new Date(ts)
	const pad = n => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 文案截断显示，避免表格被长文本撑开
function truncate(text, len = 50) {
	if (!text) return ''
	return text.length > len ? text.slice(0, len) + '...' : text
}

// ===================== 数据加载 =====================
// force=true 表示强制拉取最新（绕过缓存）
async function loadData(force = false) {
	if (loading.value || refreshing.value) return
	loading.value = true
	error.value = false
	try {
		const res = await configApi.get(force)
		if (res && res.code === 0 && res.data) {
			// 兼容历史数据：字段不存在或非数组时按空列表处理
			list.value = Array.isArray(res.data.rankingAnnouncements) ? res.data.rankingAnnouncements : []
		} else {
			throw new Error(res && res.message ? res.message : '加载失败')
		}
	} catch (e) {
		error.value = true
		list.value = []
	} finally {
		loading.value = false
	}
}

// 浮窗刷新：强制拉取最新并 Toast 反馈
async function refresh() {
	if (refreshing.value || loading.value) return
	refreshing.value = true
	try {
		const res = await configApi.get(true)
		if (res && res.code === 0 && res.data) {
			list.value = Array.isArray(res.data.rankingAnnouncements) ? res.data.rankingAnnouncements : []
			uni.showToast({ title: '刷新成功', icon: 'success' })
		} else {
			uni.showToast({ title: (res && res.message) || '刷新失败', icon: 'none' })
		}
	} catch (e) {
		uni.showToast({ title: '刷新失败', icon: 'none' })
	} finally {
		refreshing.value = false
	}
}

// ===================== 新增公告 =====================
function openAddDialog() {
	newText.value = ''
	showAddDialog.value = true
}

function closeAddDialog() {
	if (saving.value) return
	showAddDialog.value = false
	newText.value = ''
}

async function confirmAdd() {
	const text = newText.value.trim()
	if (!text) {
		uni.showToast({ title: '请输入公告文案', icon: 'none' })
		return
	}
	if (saving.value) return
	saving.value = true
	try {
		// 新增项默认未启用，不影响 rankingMarqueeText
		const next = [...list.value, {
			id: genId(),
			text,
			isActive: false,
			createdAt: Date.now()
		}]
		const res = await configApi.update({ rankingAnnouncements: next })
		if (res && res.code === 0) {
			list.value = next
			uni.showToast({ title: '新增成功', icon: 'success' })
			closeAddDialog()
		} else {
			uni.showToast({ title: (res && res.message) || '新增失败', icon: 'none' })
		}
	} catch (e) {
		uni.showToast({ title: '新增失败', icon: 'none' })
	} finally {
		saving.value = false
	}
}

// ===================== 启用 / 取消启用 =====================
// 互斥规则：同一时间仅一条公告可启用，故启用当前项时其他全部置为 false
async function toggleActive(item) {
	if (saving.value) return
	saving.value = true
	try {
		// 点击项切换状态，其余一律 false；由此保证"只能有一个启用"
		const next = list.value.map(a => ({
			...a,
			isActive: a.id === item.id ? !a.isActive : false
		}))
		// 同步 rankingMarqueeText：启用谁就写成谁的文案，全部未启用则清空
		const active = next.find(a => a.isActive)
		const marqueeText = active ? active.text : ''
		const res = await configApi.update({
			rankingAnnouncements: next,
			rankingMarqueeText: marqueeText
		})
		if (res && res.code === 0) {
			list.value = next
			uni.showToast({ title: active ? '已启用' : '已取消启用', icon: 'success' })
		} else {
			uni.showToast({ title: (res && res.message) || '操作失败', icon: 'none' })
		}
	} catch (e) {
		uni.showToast({ title: '操作失败', icon: 'none' })
	} finally {
		saving.value = false
	}
}

// ===================== 删除公告 =====================
async function removeItem(item) {
	const res = await uni.showModal({
		title: '确认删除',
		content: '确认删除该公告？此操作不可恢复。',
		confirmColor: '#c0533c'
	})
	if (!res.confirm) return
	if (saving.value) return
	saving.value = true
	try {
		const next = list.value.filter(a => a.id !== item.id)
		const payload = { rankingAnnouncements: next }
		// 若删除的恰是启用项，需同步清空 rankingMarqueeText，避免小程序端显示已删除文案
		if (item.isActive) payload.rankingMarqueeText = ''
		const r = await configApi.update(payload)
		if (r && r.code === 0) {
			list.value = next
			uni.showToast({ title: '删除成功', icon: 'success' })
		} else {
			uni.showToast({ title: (r && r.message) || '删除失败', icon: 'none' })
		}
	} catch (e) {
		uni.showToast({ title: '删除失败', icon: 'none' })
	} finally {
		saving.value = false
	}
}

// ===================== 初始化 =====================
onLoad(() => {
	if (inited) return
	inited = true
	loadData()
})
</script>

<style scoped>
/* ===================== 标题栏 ===================== */
.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
}
.header-left {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.page-title {
	font-size: 18px;
	font-weight: 700;
	color: var(--text-primary);
}
.page-desc {
	font-size: 12px;
	color: var(--text-muted);
}
.header-actions {
	display: flex;
	gap: 8px;
}

/* ===================== 加载 / 异常 ===================== */
.loading-wrap {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 80px 0;
}
.error-wrap {
	flex-direction: column;
	gap: 16px;
	padding: 60px;
}
.err-text {
	font-size: 15px;
}

/* ===================== 公告表格 ===================== */
.notice-table {
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
.th-index, .td-index { width: 56px; min-width: 56px; flex-shrink: 0; }
.th-text,  .td-text  { flex: 1; min-width: 0; }
.th-time,  .td-time  { width: 140px; flex-shrink: 0; }
.th-status,.td-status{ width: 100px; flex-shrink: 0; }
.th-actions,.td-actions { width: 180px; flex-shrink: 0; }

/* 表行 */
.table-row {
	display: flex;
	align-items: center;
	padding: 12px 16px;
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

/* 序号 */
.index-num {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	background: var(--bg-soft);
	color: var(--text-secondary);
	font-size: 12px;
	font-weight: 600;
}

/* 文案：单行截断 */
.notice-text {
	font-size: 13px;
	color: var(--text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: block;
}

/* 时间 */
.time-text {
	font-size: 12px;
	color: var(--text-muted);
	white-space: nowrap;
}

/* 状态 */
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
.status-dot.active {
	background: #3ba55d;
	box-shadow: 0 0 6px rgba(59, 165, 93, 0.4);
}
.status-dot.inactive {
	background: #b0a090;
}
.status-text {
	font-size: 12px;
}
.status-text.active {
	color: #3ba55d;
}
.status-text.inactive {
	color: var(--text-muted);
}

/* 操作按钮 */
.td-actions {
	display: flex;
	gap: 6px;
}
.action-btn {
	font-size: 12px;
	padding: 3px 10px;
	border-radius: 4px;
	cursor: pointer;
	transition: all 0.2s;
	white-space: nowrap;
}
.action-btn.enable {
	color: var(--primary);
	background: rgba(141, 75, 0, 0.08);
}
.action-btn.enable:hover {
	background: rgba(141, 75, 0, 0.15);
}
.action-btn.cancel {
	color: var(--text-secondary);
	background: rgba(141, 75, 0, 0.04);
}
.action-btn.cancel:hover {
	background: rgba(141, 75, 0, 0.1);
}
.action-btn.danger {
	color: #c53535;
	background: rgba(197, 53, 53, 0.04);
}
.action-btn.danger:hover {
	background: rgba(197, 53, 53, 0.12);
}

/* ===================== 空状态 ===================== */
.empty-state {
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

/* ===================== 响应式：窄屏隐藏创建时间列 ===================== */
@media (max-width: 768px) {
	.th-time, .td-time { display: none; }
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
.float-ball.spinning {
	animation: ball-spin 0.8s linear infinite;
}
@keyframes ball-spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* ===================== 新增公告弹窗 ===================== */
.modal-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 200;
	padding: 20px;
}
.modal-card {
	width: 100%;
	max-width: 460px;
	padding: 24px 24px 20px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.modal-title {
	font-size: 16px;
	font-weight: 700;
	color: var(--text-primary);
}
.modal-desc {
	font-size: 12px;
	color: var(--text-muted);
	margin-bottom: 6px;
}
.modal-textarea {
	width: 100%;
	min-height: 120px;
	padding: 12px 14px;
	border: 1px solid var(--border-color, #e0e0e0);
	border-radius: 8px;
	font-size: 14px;
	color: var(--text-primary);
	background: var(--bg-input, #fff);
	box-sizing: border-box;
	resize: vertical;
}
.char-count {
	display: block;
	text-align: right;
	font-size: 12px;
	color: var(--text-muted);
}
.modal-actions {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	margin-top: 8px;
}
</style>
