<template>
	<view class="page-wrap">
		<view class="filter-bar glass-card fade-in-up">
			<view class="filter-left">
				<text class="count-text">共 {{ total }} 台已绑定设备</text>
			</view>
			<view class="sg-btn sg-btn-ghost sg-btn-sm" @click="loadData">刷新</view>
		</view>

		<view v-if="loading" class="loading-wrap glass-card">
			<text class="text-muted">加载中...</text>
		</view>

		<view v-else class="table-card glass-card fade-in-up">
			<view style="overflow-x:auto">
				<table class="sg-table">
					<thead>
						<tr>
							<th>用户</th>
							<th>平台</th>
							<th>设备</th>
							<th>状态</th>
							<th>最近同步</th>
							<th>静息心率</th>
							<th>血氧</th>
							<th>步数</th>
							<th>压力</th>
							<th>体温</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in list" :key="item._id">
							<td class="fw-600" style="color:var(--text-primary)">{{ item.nickname }}</td>
							<td>{{ item.provider_name || '华为运动健康' }}</td>
							<td class="text-muted">{{ item.device_name || '华为手环/手表' }}</td>
							<td>
								<text :class="item.status === 'connected' ? 'sg-tag sg-tag-success' : 'sg-tag sg-tag-danger'">
									{{ item.status === 'connected' ? '已连接' : '已断开' }}
								</text>
							</td>
							<td class="text-muted" style="font-size:13px">{{ formatTime(item.last_sync_at) }}</td>
							<td>{{ metricValue(item, 'resting_heart_rate') }}</td>
							<td>{{ metricValue(item, 'spo2') }}</td>
							<td>{{ metricValue(item, 'steps') }}</td>
							<td>{{ metricValue(item, 'stress') }}</td>
							<td>{{ metricValue(item, 'body_temperature') }}</td>
						</tr>
						<tr v-if="!list.length">
							<td colspan="10" class="empty-text">暂无设备绑定数据</td>
						</tr>
					</tbody>
				</table>
			</view>

			<view class="table-footer">
				<text class="page-info">第 {{ page }} / {{ totalPages }} 页</text>
				<view class="sg-pagination">
					<view class="sg-page-btn" :class="{ disabled: page === 1 }" @click="go(page - 1)">上一页</view>
					<view class="sg-page-btn" :class="{ disabled: page === totalPages }" @click="go(page + 1)">下一页</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { deviceApi } from '@/js_sdk/sg-admin/api.js'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = 20
const loading = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / size)))

async function loadData() {
	loading.value = true
	const res = await deviceApi.getList({ page: page.value, size })
	loading.value = false
	if (res && res.code === 0) {
		list.value = res.data.list || []
		total.value = res.data.total || 0
	} else {
		uni.showToast({ title: (res && res.message) || '加载失败', icon: 'none' })
	}
}

function go(target) {
	if (target < 1 || target > totalPages.value) return
	page.value = target
	loadData()
}

function metricValue(item, field) {
	if (!item.metrics) return '-'
	const value = item.metrics[field]
	if (value === undefined || value === null || value === 0) return '-'
	return value
}

function formatTime(timestamp) {
	if (!timestamp) return '-'
	const d = new Date(timestamp)
	const pad = n => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onLoad(loadData)
</script>

<style scoped>
.page-wrap {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
}

.count-text {
	font-size: 14px;
	color: var(--text-secondary, #554336);
}

.loading-wrap {
	padding: 40px;
	text-align: center;
}

.table-card {
	padding: 0;
	overflow: hidden;
}

.sg-table {
	width: 100%;
	border-collapse: collapse;
}

.sg-table th {
	text-align: left;
	font-size: 13px;
	font-weight: 600;
	color: var(--text-secondary, #554336);
	padding: 14px 16px;
	background: rgba(141, 75, 0, 0.04);
	white-space: nowrap;
}

.sg-table td {
	padding: 14px 16px;
	font-size: 13px;
	border-bottom: 1px solid rgba(141, 75, 0, 0.06);
	white-space: nowrap;
}

.empty-text {
	text-align: center;
	color: var(--text-muted, #887364);
	padding: 36px 0 !important;
}

.table-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	border-top: 1px solid rgba(141, 75, 0, 0.06);
}

.page-info {
	font-size: 13px;
	color: var(--text-muted, #887364);
}

.sg-pagination {
	display: flex;
	gap: 8px;
}

.sg-page-btn {
	font-size: 13px;
	padding: 6px 12px;
	border-radius: 8px;
	background: rgba(141, 75, 0, 0.06);
	color: var(--text-secondary, #554336);
	cursor: pointer;
}

.sg-page-btn.disabled {
	opacity: 0.4;
	pointer-events: none;
}

.sg-tag {
	font-size: 12px;
	padding: 3px 10px;
	border-radius: 100px;
}

.sg-tag-success {
	color: #10b981;
	background: rgba(16, 185, 129, 0.1);
}

.sg-tag-danger {
	color: #c0533c;
	background: rgba(192, 83, 60, 0.1);
}

.text-muted {
	color: var(--text-muted, #887364);
}

.fw-600 {
	font-weight: 600;
}
</style>