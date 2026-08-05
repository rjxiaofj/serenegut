<template>
  <view class="page-wrap">
    <!-- 顶部标题栏 -->
    <view class="filter-bar glass-card fade-in-up">
      <view class="title-area">
        <text class="page-title">菜单管理</text>
        <text class="count-text">管理后台左侧导航菜单配置</text>
      </view>
      <view class="action-area">
        <view class="sg-btn sg-btn-ghost sg-btn-sm" :class="{ 'btn-spinning': refreshing }" @click="refresh">
          {{ refreshing ? '刷新中...' : '刷新' }}
        </view>
        <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="initMenus" v-if="!initializing">
          初始化菜单
        </view>
        <view class="sg-btn sg-btn-ghost sg-btn-sm btn-spinning" v-else>
          初始化中...
        </view>
        <view class="sg-btn sg-btn-primary" @click="goCreate">新增菜单</view>
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

    <!-- 数据表格 -->
    <view v-else class="table-card glass-card fade-in-up" style="animation-delay: 0.1s">
      <view style="overflow-x:auto">
        <table class="sg-table">
          <thead>
            <tr>
              <th>排序</th>
              <th>名称</th>
              <th>标识</th>
              <th>URL</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in treeList" :key="m.id">
              <td class="text-muted" style="font-size:13px">{{ m.sort != null ? m.sort : 0 }}</td>
              <td>
                <!-- 树形缩进显示，通过 _depth 控制缩进量，|- 表示子级 -->
                <text
                  class="menu-name"
                  :style="{ paddingLeft: (m._depth || 0) * 20 + 'px' }"
                >{{ m._depth > 0 ? '|-' : '' }}{{ m.name }}</text>
              </td>
              <td class="text-muted" style="font-size:12px;font-family:monospace">{{ m.menu_id }}</td>
              <td class="text-muted">{{ m.url || '-' }}</td>
              <td>
                <text :class="m.enable !== false ? 'sg-tag sg-tag-success' : 'sg-tag sg-tag-muted'">
                  {{ m.enable !== false ? '启用' : '禁用' }}
                </text>
              </td>
              <td>
                <view class="flex gap-sm">
                  <view
                    :class="m.enable !== false ? 'sg-btn sg-btn-ghost sg-btn-sm' : 'sg-btn sg-btn-primary sg-btn-sm'"
                    @click="toggleMenu(m)"
                  >{{ m.enable !== false ? '禁用' : '启用' }}</view>
                  <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="goEdit(m)">编辑</view>
                  <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="goAddChild(m)">新增子菜单</view>
                  <view class="sg-btn sg-btn-danger sg-btn-sm" @click="del(m)">删除</view>
                </view>
              </td>
            </tr>
            <tr v-if="!treeList.length">
              <td colspan="6" class="empty-text">暂无菜单数据，请点击「新增菜单」添加</td>
            </tr>
          </tbody>
        </table>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { menuApi, initApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const initializing = ref(false)
const rawList = ref([])  // 从 API 获取的扁平菜单列表
const treeList = ref([]) // 构建为树形后展平的列表（带层级缩进信息）
let inited = false
let firstShow = true // 标记是否为首次 onShow，避免与 onLoad 重复请求

/* ===================== 树形构建 ===================== */

/**
 * 将扁平菜单列表构建为树形结构，并展平为带层级信息的数组
 * 按 parent_id 关联父子关系，没有 parent_id 的是一级菜单
 * @param {Array} flatList 扁平菜单列表
 * @returns {Array} 展平后的列表，每项包含 _depth 属性表示层级深度
 */
function buildTreeList(flatList) {
  if (!flatList || !flatList.length) return []

  /* 按 menu_id 建立索引，方便查找父节点 */
  const menuMap = {}
  flatList.forEach(item => {
    menuMap[item.menu_id] = { ...item, children: [] }
  })

  /* 构建父子关系 */
  const roots = []
  flatList.forEach(item => {
    const node = menuMap[item.menu_id]
    if (item.parent_id && menuMap[item.parent_id]) {
      menuMap[item.parent_id].children.push(node)
    } else {
      roots.push(node)
    }
  })

  /* 递归排序并展平，_depth 记录层级深度用于缩进显示 */
  const result = []
  const flatten = (nodes, depth) => {
    nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0))
    nodes.forEach(node => {
      result.push({ ...node, _depth: depth })
      if (node.children && node.children.length > 0) {
        flatten(node.children, depth + 1)
      }
    })
  }
  flatten(roots, 0)
  return result
}

/* ===================== 数据加载 ===================== */

/* 加载菜单列表 */
async function loadData() {
  if (loading.value || refreshing.value) return
  loading.value = true
  error.value = false
  try {
    const res = await menuApi.getList(true)
    if (res && res.code === 0 && res.data) {
      rawList.value = res.data.list || []
      treeList.value = buildTreeList(rawList.value)
    } else {
      throw new Error(res && res.message ? res.message : '获取数据失败')
    }
  } catch (e) {
    error.value = true
    rawList.value = []
    treeList.value = []
  } finally {
    loading.value = false
  }
}

/* 刷新列表（保留旧数据，不触发全屏 loading） */
async function refresh() {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  try {
    const res = await menuApi.getList(true)
    if (res && res.code === 0 && res.data) {
      rawList.value = res.data.list || []
      treeList.value = buildTreeList(rawList.value)
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

/* 静默刷新数据（从编辑页返回时不显示 toast 提示） */
async function silentRefresh() {
  try {
    const res = await menuApi.getList(true)
    if (res && res.code === 0 && res.data) {
      rawList.value = res.data.list || []
      treeList.value = buildTreeList(rawList.value)
    }
  } catch (e) {
    /* 静默刷新失败时不提示用户 */
  }
}

/* ===================== 操作函数 ===================== */

/* 跳转到新增菜单页面 */
function goCreate() {
  uni.navigateTo({ url: '/pages/system/menu/edit' })
}

/* 一键初始化菜单数据 */
async function initMenus() {
  uni.showModal({
    title: '初始化菜单',
    content: '将完整的管理端菜单结构写入数据库（已存在的菜单会更新），是否继续？',
    success: async (res) => {
      if (!res.confirm) return
      initializing.value = true
      try {
        const result = await initApi.initMenus()
        uni.showToast({ title: result.message || '初始化成功', icon: 'none', duration: 3000 })
        /* 重新加载列表 */
        await loadData(true)
      } catch (e) {
        uni.showToast({ title: '初始化失败，请重试', icon: 'none' })
      } finally {
        initializing.value = false
      }
    }
  })
}

/* 跳转到编辑页面 */
function goEdit(m) {
  uni.navigateTo({ url: '/pages/system/menu/edit?id=' + m.id })
}

/* 跳转到新增子菜单页面，携带父菜单标识 */
function goAddChild(m) {
  uni.navigateTo({ url: '/pages/system/menu/edit?parent_id=' + m.menu_id })
}

/* 启用/禁用菜单 */
async function toggleMenu(m) {
  try {
    await menuApi.toggle(m.id)
    uni.showToast({
      title: m.enable !== false ? '已禁用' : '已启用',
      icon: 'success'
    })
    refresh()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

/* 删除菜单（含子菜单，由后端处理） */
async function del(m) {
  const res = await uni.showModal({
    title: '确认删除',
    content: '确认删除菜单「' + m.name + '」？如有子菜单将一并删除，此操作不可恢复。',
    confirmColor: '#c0533c'
  })
  if (!res.confirm) return
  try {
    await menuApi.delete(m.id)
    uni.showToast({ title: '删除成功', icon: 'success' })
    refresh()
  } catch (e) {
    uni.showToast({ title: '删除失败', icon: 'none' })
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
  min-height: calc(100vh - 48px);
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

/* 表格卡片 */
.table-card {
  padding: 4px 4px 16px;
  overflow: hidden;
  flex: 1;
}
.empty-text {
  text-align: center;
  color: var(--text-placeholder);
  padding: 40px 0;
}

/* 菜单名称样式 */
.menu-name {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
}
</style>
