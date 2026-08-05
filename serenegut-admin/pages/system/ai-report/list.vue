<template>
  <view class="page-wrap">
    <!-- 顶部标题栏 -->
    <view class="filter-bar glass-card fade-in-up">
      <view class="title-area">
        <text class="page-title">AI模型管理</text>
        <text class="count-text">配置和管理 AI 模型，支持多模型切换</text>
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
      <!-- 模型卡片网格 -->
      <view class="model-grid">
        <view
          v-for="(m, i) in list"
          :key="m.id"
          class="model-card glass-card fade-in-up"
          :style="{ animationDelay: i * 0.05 + 's' }"
        >
          <!-- 卡片顶部：名称 + 状态 -->
          <view class="card-top">
            <text class="model-name">{{ m.name }}</text>
            <text
              :class="isProviderTagClass(m.provider)"
              style="margin-left: 8px;"
            >{{ providerLabel(m.provider) }}</text>
            <text
              :class="isEnabled(m) ? 'sg-tag sg-tag-success' : 'sg-tag sg-tag-muted'"
              style="margin-left: auto;"
            >{{ isEnabled(m) ? '已启用' : '未启用' }}</text>
          </view>

          <!-- 卡片信息区 -->
          <view class="card-info">
            <view class="info-row">
              <text class="info-label">API地址</text>
              <text class="info-val" :title="m.api_url">{{ truncateUrl(m.api_url) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">模型标识</text>
              <text class="info-val model-id-text">{{ m.model }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">排序权重</text>
              <text class="info-val">{{ m.sort != null ? m.sort : 0 }}</text>
            </view>
          </view>

          <!-- 卡片操作区 -->
          <view class="card-actions">
            <view
              :class="isEnabled(m) ? 'sg-btn sg-btn-ghost sg-btn-sm' : 'sg-btn sg-btn-primary sg-btn-sm'"
              @click="toggleModel(m)"
            >{{ isEnabled(m) ? '取消启用' : '启用' }}</view>
            <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="goEdit(m)">编辑</view>
            <view
              class="sg-btn sg-btn-ghost sg-btn-sm"
              :class="{ 'btn-spinning': testingId === m.id }"
              @click="testConn(m)"
            >{{ testingId === m.id ? '测试中...' : '测试连接' }}</view>
            <view class="sg-btn sg-btn-danger sg-btn-sm" @click="del(m)">删除</view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="!list.length" class="empty-card glass-card">
          暂无AI模型，请点击「新增模型」添加
        </view>
      </view>
    </template>

    <!-- 右下角浮窗小球：刷新 + 新增 -->
    <view class="float-ball-group">
      <view class="float-ball float-ball-refresh" :class="{ spinning: refreshing }" @click="refresh">
        <text class="float-ball-icon">↻</text>
      </view>
      <view class="float-ball float-ball-add" @click="goCreate">
        <text class="float-ball-icon">+</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { aiModelApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const list = ref([])
const testingId = ref(null) // 当前正在测试连接的模型ID
let inited = false
let firstShow = true // 标记是否为首次 onShow，避免与 onLoad 重复请求

/* ===================== 服务商配置 ===================== */
/* 服务商标签颜色映射 */
const providerTagMap = {
  deepseek: 'sg-tag sg-tag-primary',
  openai: 'sg-tag sg-tag-success',
  custom: 'sg-tag sg-tag-warning'
}

/* 服务商显示名称映射 */
const providerLabelMap = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  custom: '自定义'
}

/* ===================== 工具函数 ===================== */

/* 判断模型是否已启用（后端字段为 is_active） */
function isEnabled(m) {
  return m.is_active === true
}

/* 获取服务商标签样式类 */
function isProviderTagClass(provider) {
  return providerTagMap[provider] || 'sg-tag sg-tag-muted'
}

/* 获取服务商显示名称 */
function providerLabel(provider) {
  return providerLabelMap[provider] || provider || '未知'
}

/* 截断过长的 API 地址 */
function truncateUrl(url) {
  if (!url) return '-'
  return url.length > 50 ? url.slice(0, 50) + '...' : url
}

/* ===================== 数据加载 ===================== */

/* 加载模型列表 */
async function loadData() {
  if (loading.value || refreshing.value) return
  loading.value = true
  error.value = false
  try {
    const res = await aiModelApi.getList(true)
    if (res && res.code === 0 && res.data) {
      list.value = res.data.list || []
    } else {
      throw new Error(res && res.message ? res.message : '获取数据失败')
    }
  } catch (e) {
    error.value = true
    list.value = []
  } finally {
    loading.value = false
  }
}

/* 刷新列表（保留旧数据，不触发全屏 loading） */
async function refresh() {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  try {
    const res = await aiModelApi.getList(true)
    if (res && res.code === 0 && res.data) {
      list.value = res.data.list || []
      uni.showToast({ title: '刷新成功', icon: 'success' })
    } else {
      uni.showToast({ title: (res && res.message) || '刷新失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络异常，刷新失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

/* ===================== 操作函数 ===================== */

/* 跳转到新增页面 */
function goCreate() {
  uni.navigateTo({ url: '/pages/system/ai-report/edit' })
}

/* 跳转到编辑页面 */
function goEdit(m) {
  uni.navigateTo({ url: '/pages/system/ai-report/edit?id=' + m.id })
}

/* 启用/取消启用模型 */
async function toggleModel(m) {
  try {
    const res = await aiModelApi.toggle(m.id)
    /* 根据后端返回的状态更新本地数据 */
    const newActive = (res && res.data && res.data.is_active === true)
    list.value.forEach(item => {
      item.is_active = (item.id === m.id) ? newActive : false
    })
    uni.showToast({
      title: newActive ? '已启用' : '已取消启用',
      icon: 'success'
    })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

/* 测试模型连接 */
async function testConn(m) {
  if (testingId.value) return
  testingId.value = m.id
  try {
    const res = await aiModelApi.testConnection()
    if (res && res.code === 0) {
      uni.showToast({ title: '连接成功', icon: 'success' })
    } else {
      uni.showToast({
        title: (res && res.message) || '连接失败，请检查配置',
        icon: 'none'
      })
    }
  } catch (e) {
    uni.showToast({
      title: '连接失败: ' + (e.message || '网络错误'),
      icon: 'none'
    })
  } finally {
    testingId.value = null
  }
}

/* 删除模型 */
async function del(m) {
  const res = await uni.showModal({
    title: '确认删除',
    content: '确认删除模型「' + m.name + '」？此操作不可恢复。',
    confirmColor: '#c0533c'
  })
  if (!res.confirm) return
  try {
    await aiModelApi.delete(m.id)
    uni.showToast({ title: '删除成功', icon: 'success' })
    refresh()
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

/* 静默刷新数据（从编辑页返回时不显示 toast 提示） */
async function silentRefresh() {
  try {
    const res = await aiModelApi.getList(true)
    if (res && res.code === 0 && res.data) {
      list.value = res.data.list || []
    }
  } catch (e) {
    /* 静默刷新失败时不提示用户 */
  }
}

/* ===================== 生命周期 ===================== */
onLoad(() => {
  if (inited) return
  inited = true
  loadData()
})

/* 页面显示时静默刷新数据（从编辑页返回后能及时更新） */
onShow(() => {
  /* 跳过首次 onShow，因为 onLoad 已经加载过数据 */
  if (firstShow) {
    firstShow = false
    return
  }
  if (inited) {
    silentRefresh()
  }
})
</script>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 顶部标题栏 */
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.count-text {
  font-size: 13px;
  color: var(--text-muted);
}
.action-area {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 加载与异常状态 */
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

/* 模型卡片网格 */
.model-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.model-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.empty-card {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 0;
  color: var(--text-placeholder);
}

/* 卡片顶部：名称 + 标签 */
.card-top {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.model-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 卡片信息区 */
.card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 220, 195, 0.3);
  border-bottom: 1px solid rgba(255, 220, 195, 0.3);
}
.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.info-label {
  font-size: 12px;
  color: var(--text-muted);
  width: 70px;
  flex-shrink: 0;
}
.info-val {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.model-id-text {
  font-family: monospace;
  font-size: 12px;
}

/* 卡片操作区 */
.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式：移动端单列 */
@media (max-width: 768px) {
  .model-grid {
    grid-template-columns: 1fr;
  }
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
