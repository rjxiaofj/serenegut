<template>
  <view class="page-wrap">
    <!-- 顶部操作栏：仅保留标题，刷新/新增移至右下角浮窗小球 -->
    <view class="filter-bar glass-card fade-in-up">
      <view class="filter-left">
        <text class="page-title">系统公告</text>
      </view>
    </view>

    <!-- 类型筛选 Tab -->
    <view class="type-tabs glass-card fade-in-up">
      <view
        v-for="t in typeTabs"
        :key="t.value"
        class="type-tab-item"
        :class="{ active: filterType === t.value }"
        @click="switchFilter(t.value)"
      >{{ t.label }}</view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap glass-card"><view class="spinner"></view></view>

    <!-- 网络异常 -->
    <view v-else-if="error" class="loading-wrap glass-card error-wrap">
      <text class="text-muted err-text">网络异常，请检查网络后重试</text>
      <view class="sg-btn sg-btn-primary sg-btn-sm" @click="loadData">重试</view>
    </view>

    <!-- 数据表格 -->
    <view v-else class="table-card glass-card fade-in-up" style="animation-delay: 0.1s">
      <view style="overflow-x:auto">
        <table class="sg-table">
          <thead>
            <tr>
              <th style="min-width:160px">公告标题</th>
              <th style="width:100px">类型</th>
              <th style="width:90px">状态</th>
              <th style="width:80px">排序</th>
              <th style="width:180px">创建时间</th>
              <th style="width:240px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in list"
              :key="a.id"
              :class="{ 'ban-row': isBan(a) }"
            >
              <td class="fw-600" style="color:var(--text-primary)">{{ a.title }}</td>
              <td>
                <!-- 类型标签：普通公告=蓝色，封禁公告=红色 -->
                <text :class="isBan(a) ? 'sg-tag sg-tag-danger' : 'sg-tag sg-tag-primary'">
                  {{ isBan(a) ? '封禁公告' : '普通公告' }}
                </text>
              </td>
              <td>
                <!-- 状态标签：已启用绿色 / 未启用灰色 -->
                <text :class="isEnabled(a) ? 'sg-tag sg-tag-success' : 'sg-tag sg-tag-muted'">
                  {{ isEnabled(a) ? '已启用' : '未启用' }}
                </text>
              </td>
              <td>{{ a.sort || 0 }}</td>
              <td class="text-muted" style="font-size:13px">{{ formatTime(a) }}</td>
              <td>
                <view class="flex gap-sm">
                  <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="toggleStatus(a)">
                    {{ isEnabled(a) ? '禁用' : '启用' }}
                  </view>
                  <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="openEdit(a)">编辑</view>
                  <view class="sg-btn sg-btn-danger sg-btn-sm" @click="del(a)">删除</view>
                </view>
              </td>
            </tr>
            <!-- 空数据提示 -->
            <tr v-if="!list.length">
              <td colspan="6" class="empty-text">暂无公告</td>
            </tr>
          </tbody>
        </table>
      </view>
    </view>

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
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { announcementApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const list = ref([])
let inited = false

/* 类型筛选：'' 全部、'normal' 普通公告、'ban' 封禁公告 */
const filterType = ref('')
const typeTabs = [
  { label: '全部', value: '' },
  { label: '普通公告', value: 'normal' },
  { label: '封禁公告', value: 'ban' }
]

/* ===================== 数据加载 ===================== */
/* 加载公告列表（首次进入触发，显示全屏 loading） */
async function loadData() {
  if (loading.value || refreshing.value) return
  loading.value = true
  error.value = false
  try {
    /* force = true 强制跳过缓存，确保获取最新数据 */
    const res = await announcementApi.getList(true, filterType.value)
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

/* 刷新：保留旧数据显示，不触发全屏 loading */
async function refresh() {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  try {
    /* force = true 强制跳过缓存，请求最新数据 */
    const res = await announcementApi.getList(true, filterType.value)
    if (res && res.code === 0 && res.data) {
      list.value = res.data.list || []
    } else {
      uni.showToast({ title: (res && res.message) || '刷新失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络异常，刷新失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

/* 切换类型筛选，重新加载数据 */
async function switchFilter(type) {
  if (filterType.value === type) return
  filterType.value = type
  /* 直接加载，不走 loadData 的 guard（避免与 onShow 的 refresh 冲突） */
  loading.value = true
  error.value = false
  try {
    const res = await announcementApi.getList(true, filterType.value)
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

/* 标记：是否从编辑页返回（用于 onShow 时判断是否需要刷新） */
let needRefreshOnShow = false

onLoad(() => {
  if (inited) return
  inited = true
  loadData()
})

/* 从编辑页返回时自动刷新列表数据 */
onShow(() => {
  if (needRefreshOnShow && !loading.value && !refreshing.value) {
    needRefreshOnShow = false
    refresh()
  }
})

/* ===================== 工具函数 ===================== */
/* 判断公告是否为封禁类型 */
function isBan(a) {
  return a.type === 'ban'
}

/* 判断公告是否已启用（兼容多种状态字段格式） */
function isEnabled(a) {
  if (a.is_active !== undefined) {
    return a.is_active === true || a.is_active === 1
  }
  if (a.status !== undefined) {
    return a.status === 1 || a.status === true || a.status === 'enabled'
  }
  if (a.is_enabled !== undefined) {
    return a.is_enabled === true || a.is_enabled === 1
  }
  return false
}

/* 格式化创建时间（兼容时间戳和字符串，兼容多种字段名） */
function formatTime(a) {
  const t = a.created_at || a.createTime || a.create_time || a.createdAt
  if (!t) return '-'
  if (typeof t === 'number') {
    const d = new Date(t)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return t
}

/* ===================== 操作方法 ===================== */
/* 跳转到新增公告页 */
function openCreate() {
  needRefreshOnShow = true
  uni.navigateTo({ url: '/pages/system/announcement/edit' })
}

/* 跳转到编辑公告页，携带 id 参数 */
function openEdit(a) {
  needRefreshOnShow = true
  uni.navigateTo({ url: `/pages/system/announcement/edit?id=${a.id}` })
}

/* 启用/禁用切换 */
async function toggleStatus(a) {
  try {
    await announcementApi.toggle(a.id)
    uni.showToast({ title: isEnabled(a) ? '已禁用' : '已启用', icon: 'success' })
    refresh()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

/* 删除公告（二次确认） */
async function del(a) {
  const res = await uni.showModal({
    title: '确认删除',
    content: '确认删除该公告？此操作不可恢复。',
    confirmColor: '#c0533c'
  })
  if (!res.confirm) return
  try {
    await announcementApi.delete(a.id)
    uni.showToast({ title: '删除成功', icon: 'success' })
    refresh()
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}
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
  flex-wrap: wrap;
  gap: 12px;
}
.filter-left {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.filter-right {
  display: flex;
  gap: 12px;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
/* 类型筛选 Tab 栏 */
.type-tabs {
  display: flex;
  gap: 4px;
  padding: 6px;
}
.type-tab-item {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}
.type-tab-item:hover {
  color: var(--primary);
  background: var(--primary-veil);
}
.type-tab-item.active {
  background: var(--grad-primary);
  color: #fff;
  box-shadow: var(--shadow-btn);
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
.empty-text {
  text-align: center;
  color: var(--text-placeholder);
  padding: 40px 0;
}
/* 封禁类型公告行：浅红色背景标识 */
.ban-row {
  background: rgba(192, 83, 60, 0.06);
}
.ban-row:hover {
  background: rgba(192, 83, 60, 0.12);
}

/* 右下角浮窗小球 */
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
