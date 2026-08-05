<template>
  <view class="page-wrap">
        <!-- 筛选栏 -->
        <view class="filter-bar glass-card fade-in-up">
          <view class="filter-left">
            <input v-model="keyword" class="sg-input" style="width:260px" placeholder="搜索昵称 / 邮箱 / 手机号" @keyup.enter="onSearch" />
            <select v-model="statusFilter" class="sg-select" style="width:140px" @change="onSearch">
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">已禁用</option>
            </select>
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

        <!-- 数据表格 -->
        <view v-else class="table-card glass-card fade-in-up" style="animation-delay: 0.1s">
          <view style="overflow-x:auto">
            <table class="sg-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>昵称</th>
                  <th>邮箱</th>
                  <th>手机号</th>
                  <th>性别</th>
                  <th>记录数</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in list" :key="u.id">
                  <td class="text-muted" style="font-size:12px;font-family:monospace">{{ u.id }}</td>
                  <td class="fw-600" style="color:var(--text-primary)">{{ u.nickname }}</td>
                  <td class="text-muted">{{ u.email }}</td>
                  <td class="text-muted">{{ u.phone || '—' }}</td>
                  <td>{{ u.gender }}</td>
                  <td>{{ u.records }}</td>
                  <td>
                    <text :class="u.status === 'active' ? 'sg-tag sg-tag-success' : 'sg-tag sg-tag-danger'">
                      {{ u.status === 'active' ? '正常' : '已禁用' }}
                    </text>
                  </td>
                  <td class="text-muted" style="font-size:13px">{{ u.registerTime }}</td>
                  <td>
                    <view class="flex gap-sm">
                      <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="openDetail(u)">详情</view>
                      <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="openEdit(u)">编辑</view>
                      <view
                        :class="u.status === 'active' ? 'sg-btn sg-btn-danger sg-btn-sm' : 'sg-btn sg-btn-primary sg-btn-sm'"
                        @click="toggleStatus(u)"
                      >{{ u.status === 'active' ? '禁用' : '启用' }}</view>
                    </view>
                  </td>
                </tr>
                <tr v-if="!list.length">
                  <td colspan="9" class="empty-text">暂无数据</td>
                </tr>
              </tbody>
            </table>
          </view>

          <!-- 分页 -->
          <view class="table-footer">
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
        </view>

        <!-- 编辑弹窗 -->
        <view v-if="editing" class="modal-mask" @click.self="editing = false">
          <view class="modal glass-card scale-in">
            <view class="modal-title">编辑用户信息</view>
            <view class="modal-body">
              <view class="form-row">
                <text class="form-label">昵称</text>
                <input v-model="form.nickname" class="sg-input" />
              </view>
              <view class="form-row">
                <text class="form-label">邮箱</text>
                <input v-model="form.email" class="sg-input" />
              </view>
              <view class="form-row">
                <text class="form-label">手机</text>
                <input v-model="form.phone" class="sg-input" />
              </view>
              <view class="form-row">
                <text class="form-label">性别</text>
                <select v-model="form.gender" class="sg-select">
                  <option>男</option>
                  <option>女</option>
                  <option>保密</option>
                </select>
              </view>
            </view>
            <view class="modal-footer">
              <view class="sg-btn sg-btn-ghost" @click="editing = false">取消</view>
              <view class="sg-btn sg-btn-primary" @click="saveEdit">保存</view>
            </view>
          </view>
        </view>

        <!-- 详情弹窗 -->
        <view v-if="detailVisible" class="modal-mask" @click.self="detailVisible = false">
          <view class="modal glass-card scale-in" style="max-width:480px">
            <view class="modal-title">用户详情</view>
            <view class="detail-grid">
              <view class="detail-item">
                <text class="detail-label">ID</text>
                <text class="detail-val" style="font-size:12px;font-family:monospace;word-break:break-all">{{ detail.id }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">昵称</text>
                <text class="detail-val fw-600">{{ detail.nickname }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">邮箱</text>
                <text class="detail-val">{{ detail.email || '—' }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">手机号</text>
                <text class="detail-val">{{ detail.phone || '—' }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">性别</text>
                <text class="detail-val">{{ detail.gender || '保密' }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">记录数</text>
                <text class="detail-val text-primary">{{ detail.records }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">状态</text>
                <text :class="detail.status === 'active' ? 'sg-tag sg-tag-success' : 'sg-tag sg-tag-danger'">
                  {{ detail.status === 'active' ? '正常' : '已禁用' }}
                </text>
              </view>
              <view class="detail-item">
                <text class="detail-label">注册时间</text>
                <text class="detail-val">{{ detail.registerTime }}</text>
              </view>
              <view class="detail-item">
                <text class="detail-label">最后登录</text>
                <text class="detail-val">{{ detail.lastLogin }}</text>
              </view>
            </view>
            <view class="modal-footer">
              <view class="sg-btn sg-btn-primary" @click="detailVisible = false">关闭</view>
            </view>
          </view>
        </view>

        <!-- 封禁配置弹窗 -->
        <view v-if="banVisible" class="modal-mask" @click.self="banVisible = false">
          <view class="modal glass-card scale-in" style="max-width:440px">
            <view class="modal-title">封禁用户</view>
            <view class="modal-body">
              <view class="form-row">
                <text class="form-label">用户</text>
                <text style="font-size:14px;color:var(--text-primary)">{{ banUser?.nickname }} ({{ banUser?.email }})</text>
              </view>
              <view class="form-row">
                <text class="form-label">封禁公告 <text style="color:#c0533c">*</text></text>
                <select v-model="banForm.announcementId" class="sg-select" style="width:100%">
                  <option value="">请选择封禁公告</option>
                  <option v-for="a in banAnnouncements" :key="a.id" :value="a.id">{{ a.title }}</option>
                </select>
                <text v-if="banAnnouncements.length === 0" style="font-size:12px;color:var(--text-muted);margin-top:4px">暂无已启用的封禁公告，请先在公告管理中创建</text>
              </view>
              <view class="form-row">
                <text class="form-label">封禁时长 <text style="color:#c0533c">*</text></text>
                <select v-model="banForm.banDuration" class="sg-select" style="width:100%">
                  <option value="1h">1 小时</option>
                  <option value="1d">1 天</option>
                  <option value="1m">30 天</option>
                  <option value="custom">自定义</option>
                  <option value="permanent">永久封禁</option>
                </select>
              </view>
              <view v-if="banForm.banDuration === 'custom'" class="form-row">
                <text class="form-label">自定义时长（小时）</text>
                <input v-model="banForm.customHours" type="number" class="sg-input" placeholder="请输入小时数" />
              </view>
            </view>
            <view class="modal-footer">
              <view class="sg-btn sg-btn-ghost" @click="banVisible = false">取消</view>
              <view class="sg-btn sg-btn-danger" @click="confirmBan">确认封禁</view>
            </view>
          </view>
        </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { userApi, announcementApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const list = ref([])
const total = ref(0)
let inited = false
const keyword = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = 10

const editing = ref(false)
const detailVisible = ref(false)
const form = reactive({})
const detail = ref({})

/* 封禁弹窗 */
const banVisible = ref(false)
const banUser = ref(null)
const banAnnouncements = ref([])
const banForm = reactive({
  announcementId: '',
  banDuration: '1d',
  customHours: ''
})

async function loadData() {
  if (loading.value || refreshing.value) return
  loading.value = true
  error.value = false
  try {
    const res = await userApi.getList({
      page: page.value,
      size: pageSize,
      keyword: keyword.value,
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
    const res = await userApi.getList({
      page: page.value,
      size: pageSize,
      keyword: keyword.value,
      status: statusFilter.value
    }, true)
    if (res && res.code === 0 && res.data) {
      list.value = res.data.list || []
      total.value = res.data.total || 0
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

const totalPages = () => Math.ceil(total.value / pageSize) || 1
function go(p) {
  if (p >= 1 && p <= totalPages()) {
    page.value = p
    loadData()
  }
}
function onSearch() {
  page.value = 1
  loadData()
}

function openEdit(u) {
  Object.assign(form, u)
  editing.value = true
}
async function saveEdit() {
  try {
    await userApi.update(form.id, {
      nickname: form.nickname,
      email: form.email,
      phone: form.phone,
      gender: form.gender
    })
    editing.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    refresh()
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
/* 打开封禁弹窗：先加载已启用的封禁公告列表 */
async function toggleStatus(u) {
  if (u.status === 'active') {
    /* 禁用 → 弹出封禁配置 */
    banUser.value = u
    banForm.announcementId = ''
    banForm.banDuration = '1d'
    banForm.customHours = ''
    banVisible.value = true
    /* 加载封禁类型公告 */
    try {
      const res = await announcementApi.getList(true, 'ban')
      if (res && res.code === 0 && res.data) {
        banAnnouncements.value = (res.data.list || []).filter(a => a.is_active)
      }
    } catch (e) {
      uni.showToast({ title: '获取封禁公告失败', icon: 'none' })
    }
  } else {
    /* 启用 → 解封 */
    try {
      await userApi.unban(u.id)
      uni.showToast({ title: '已解封', icon: 'success' })
      refresh()
    } catch (e) {
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
  }
}

/* 确认封禁 */
async function confirmBan() {
  if (!banForm.announcementId) {
    uni.showToast({ title: '请选择封禁公告', icon: 'none' })
    return
  }
  if (banForm.banDuration === 'custom' && !banForm.customHours) {
    uni.showToast({ title: '请输入自定义时长', icon: 'none' })
    return
  }
  try {
    await userApi.ban(banUser.value.id, banForm.announcementId, banForm.banDuration, banForm.customHours)
    banVisible.value = false
    uni.showToast({ title: '已封禁', icon: 'success' })
    refresh()
  } catch (e) {
    uni.showToast({ title: '封禁失败', icon: 'none' })
  }
}
async function openDetail(u) {
  const res = await userApi.getDetail(u.id)
  const d = res.data || u
  /* 格式化状态：后端返回数字(0/1)，统一转为字符串 */
  if (d.status === 1 || d.status === 'active') {
    d.status = 'active'
  } else {
    d.status = 'disabled'
  }
  /* 格式化性别 */
  if (d.gender === 'male') d.gender = '男'
  else if (d.gender === 'female') d.gender = '女'
  else if (!d.gender) d.gender = '保密'
  /* 格式化时间 */
  if (d.created_at && !d.registerTime) {
    const dt = new Date(d.created_at)
    d.registerTime = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }
  if (d.updated_at && !d.lastLogin) {
    const dt = new Date(d.updated_at)
    d.lastLogin = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }
  detail.value = d
  detailVisible.value = true
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
.empty-text {
  text-align: center;
  color: var(--text-placeholder);
  padding: 40px 0;
}
.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
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

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(42, 31, 21, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.modal {
  width: 100%;
  max-width: 520px;
  padding: 32px;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-label {
  font-size: 12px;
  color: var(--text-muted);
}
.detail-val {
  font-size: 14px;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
