<template>
  <view class="fix-top-window">
    <view class="page-wrap">
      <view v-if="loading" class="loading-wrap"><view class="spinner"></view></view>
      <!-- 网络异常 -->
      <view v-else-if="error" class="loading-wrap glass-card error-wrap" style="padding:60px;border-radius:24px">
      <text class="text-muted err-text" style="font-size:15px">网络异常，请检查网络后重试</text>
      <view class="sg-btn sg-btn-primary sg-btn-sm" style="margin-top:16px" @click="loadData">重试</view>
    </view>
      <view v-else class="dashboard">
        <!-- 统计卡片 -->
        <view class="stat-grid">
          <view v-for="(s, i) in stats" :key="i" class="stat-card glass-card fade-in-up" :style="{ animationDelay: i * 0.08 + 's' }">
            <view class="stat-icon" :style="{ background: s.grad }"></view>
            <view class="stat-body">
              <text class="stat-label">{{ s.label }}</text>
              <text class="stat-value">{{ s.value.toLocaleString() }}</text>
              <text class="stat-sub">{{ s.sub }}</text>
            </view>
          </view>
        </view>

        <!-- 用户增长趋势 + 系统概要 -->
        <view class="chart-row">
          <view class="chart-card glass-card fade-in-up" style="animation-delay: 0.3s">
            <view class="chart-header">
              <text class="chart-title">用户增长趋势</text>
              <text class="sg-tag sg-tag-warning">半年</text>
            </view>
            <view class="line-chart">
              <view class="line-svg" v-html="chartSvg"></view>
              <view class="line-labels">
                <text v-for="(d, i) in userGrowth" :key="i" class="line-label">{{ d.month }}</text>
              </view>
            </view>
          </view>

          <view v-if="data" class="chart-card glass-card fade-in-up" style="animation-delay: 0.4s">
            <view class="chart-header">
              <text class="chart-title">系统概要</text>
            </view>
            <view class="summary-list">
              <view class="summary-item">
                <text class="summary-label">用户活跃率</text>
                <text class="summary-value fw-600">{{ data.totalUsers ? Math.round(data.activeUsers / data.totalUsers * 100) : 0 }}%</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">文章发布率</text>
                <text class="summary-value text-primary fw-600">{{ data.totalArticles ? Math.round(data.publishedArticles / data.totalArticles * 100) : 0 }}%</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">注册用户总数</text>
                <text class="summary-value text-success fw-600">{{ data.totalUsers }}</text>
              </view>
              <view class="summary-item">
                <text class="summary-label">健康记录总数</text>
                <text class="summary-value fw-600">{{ data.totalRecords.toLocaleString() }}</text>
              </view>
              <view class="summary-item highlight">
                <text class="summary-label">系统状态</text>
                <view class="summary-value">
                  <view class="status-dot"></view>
                  <text>运行正常</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { dashboardApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const error = ref(false)
const data = ref(null)
let inited = false

onLoad(async () => {
  if (inited) return
  inited = true
  await loadData()
})

async function loadData() {
  if (loading.value) return
  loading.value = true
  error.value = false
  try {
    const res = await dashboardApi.getStats()
    data.value = res.data
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

const stats = computed(() => {
  if (!data.value) return []
  const d = data.value
  return [
    { label: '注册用户', value: d.totalUsers, sub: `活跃 ${d.activeUsers}`, grad: 'linear-gradient(135deg, #8d4b00, #b15f00)' },
    { label: '今日记录', value: d.todayRecords, sub: '实时统计', grad: 'linear-gradient(135deg, #6b9e5e, #8bb87e)' },
    { label: '健康记录总数', value: d.totalRecords, sub: '持续增长中', grad: 'linear-gradient(135deg, #d99441, #e8b06a)' },
    { label: '科普文章', value: d.publishedArticles, sub: `共 ${d.totalArticles} 篇`, grad: 'linear-gradient(135deg, #5b8aa8, #7ba6c4)' }
  ]
})

const userGrowth = computed(() => data.value?.userGrowth || [])
const maxGrowth = computed(() => Math.max(...userGrowth.value.map(d => d.count), 1))

const chartSvg = computed(() => {
  const growth = userGrowth.value
  if (!growth.length) return ''
  const pts = growth.map((d, i) =>
    `${(i / Math.max(growth.length - 1, 1)) * 580 + 10},${190 - (d.count / maxGrowth.value) * 160}`
  ).join(' ')
  return `<svg viewBox="0 0 600 200" preserveAspectRatio="none" style="width:100%;height:100%;display:block">
    <defs><linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(141,75,0,0.25)"/>
      <stop offset="100%" stop-color="rgba(141,75,0,0)"/>
    </linearGradient></defs>
    <polygon points="10,190 ${pts} 590,190" fill="url(#lineGrad)"/>
    <polyline points="${pts}" fill="none" stroke="#8d4b00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
}
.stat-icon {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.stat-body {
  display: flex;
  flex-direction: column;
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin: 2px 0;
}
.stat-sub {
  font-size: 12px;
  color: var(--text-placeholder);
}
.chart-row {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 18px;
}
.chart-card {
  padding: 24px;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.line-chart {
  height: 200px;
  display: flex;
  flex-direction: column;
}
.line-svg {
  flex: 1;
  width: 100%;
}
.line-labels {
  display: flex;
  justify-content: space-between;
  padding: 8px 10px 0;
}
.line-label {
  font-size: 12px;
  color: var(--text-muted);
}
.summary-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-veil);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 220, 195, 0.3);
}
.summary-item.highlight {
  background: var(--success-soft);
  border-color: rgba(107, 158, 94, 0.2);
}
.summary-label {
  font-size: 14px;
  color: var(--text-secondary);
}
.summary-value {
  font-size: 15px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  animation: breathing-pulse 2s ease-in-out infinite;
}

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-row { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .stat-grid { grid-template-columns: 1fr; }
}
</style>
