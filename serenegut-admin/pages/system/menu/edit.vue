<template>
  <view class="page-wrap">
    <!-- 表单卡片 -->
    <view class="form-card glass-card fade-in-up">
      <!-- 标题区 -->
      <view class="form-header">
        <text class="form-title">{{ isEdit ? '编辑菜单' : '新增菜单' }}</text>
        <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="goBack">返回</view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrap">
        <view class="spinner"></view>
      </view>

      <!-- 表单内容 -->
      <view v-else class="form-body">
        <!-- 菜单标识 -->
        <view class="form-row">
          <text class="form-label">菜单标识 <text class="required">*</text></text>
          <input
            v-model="form.menu_id"
            class="sg-input"
            placeholder="请输入菜单标识，不可重复"
            :disabled="isEdit"
          />
          <text class="form-tip">唯一标识，编辑模式下不可修改</text>
        </view>

        <!-- 显示名称 -->
        <view class="form-row">
          <text class="form-label">显示名称 <text class="required">*</text></text>
          <input
            v-model="form.name"
            class="sg-input"
            placeholder="请输入菜单名称"
          />
        </view>

        <!-- 图标 -->
        <view class="form-row">
          <text class="form-label">图标</text>
          <input
            v-model="form.icon"
            class="sg-input"
            placeholder="填写 uni-icons 的 type 值，如 home、list、contact"
          />
          <text class="form-tip">对应 uni-icons 组件的 type 属性</text>
        </view>

        <!-- 页面URL -->
        <view class="form-row">
          <text class="form-label">页面URL</text>
          <input
            v-model="form.url"
            class="sg-input"
            placeholder="以 / 开头，为空表示是目录"
          />
          <text class="form-tip">以 / 开头的页面路径，留空表示该菜单为目录</text>
        </view>

        <!-- 排序 -->
        <view class="form-row">
          <text class="form-label">排序</text>
          <input
            v-model="form.sort"
            class="sg-input"
            type="number"
            placeholder="0"
          />
        </view>

        <!-- 父菜单标识 -->
        <view class="form-row">
          <text class="form-label">父菜单标识</text>
          <input
            v-model="form.parent_id"
            class="sg-input"
            placeholder="一级菜单不需要填写"
          />
          <text class="form-tip">指定父级菜单的 menu_id，一级菜单留空</text>
        </view>

        <!-- 是否启用 -->
        <view class="form-row form-row--inline">
          <text class="form-label">是否启用</text>
          <switch :checked="form.enable" @change="onEnableChange" />
        </view>
      </view>

      <!-- 底部操作按钮 -->
      <view v-if="!loading" class="form-footer">
        <view class="sg-btn sg-btn-ghost" @click="goBack">取消</view>
        <view class="sg-btn sg-btn-primary" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { menuApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const loading = ref(false)
const saving = ref(false)
const menuId = ref(null) // 当前编辑的菜单ID，null 表示新增

/* 表单数据 */
const form = reactive({
  menu_id: '',
  name: '',
  icon: '',
  url: '',
  sort: 0,
  parent_id: '',
  enable: true
})

/* 是否为编辑模式 */
const isEdit = computed(() => menuId.value != null)

/* ===================== 事件处理 ===================== */

/* 启用开关变更 */
function onEnableChange(e) {
  form.enable = e.detail.value
}

/* ===================== 数据加载 ===================== */

/* 编辑模式下，从列表中查找对应菜单数据并填充表单 */
async function loadMenuData() {
  loading.value = true
  try {
    const res = await menuApi.getList(true)
    if (res && res.code === 0 && res.data && res.data.list) {
      /* 根据 id 查找目标菜单 */
      const target = res.data.list.find(item => String(item.id) === String(menuId.value))
      if (target) {
        form.menu_id = target.menu_id || ''
        form.name = target.name || ''
        form.icon = target.icon || ''
        form.url = target.url || ''
        form.sort = target.sort != null ? target.sort : 0
        form.parent_id = target.parent_id || ''
        form.enable = target.enable !== false
      } else {
        uni.showToast({ title: '菜单不存在', icon: 'none' })
        setTimeout(() => goBack(), 1000)
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/* ===================== 表单验证 ===================== */

/* 验证表单必填字段 */
function validateForm() {
  if (!form.menu_id.trim()) {
    uni.showToast({ title: '请输入菜单标识', icon: 'none' })
    return false
  }
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入显示名称', icon: 'none' })
    return false
  }
  return true
}

/* ===================== 保存操作 ===================== */

/* 保存菜单数据（新增或更新） */
async function save() {
  if (!validateForm()) return
  if (saving.value) return
  saving.value = true

  try {
    /* 构建提交数据 */
    const data = {
      menu_id: form.menu_id.trim(),
      name: form.name.trim(),
      icon: form.icon.trim(),
      url: form.url.trim(),
      sort: Number(form.sort) || 0,
      parent_id: form.parent_id.trim(),
      enable: form.enable
    }

    if (isEdit.value) {
      /* 编辑模式：调用更新接口 */
      await menuApi.update(menuId.value, data)
    } else {
      /* 新增模式：调用创建接口 */
      await menuApi.create(data)
    }

    uni.showToast({
      title: isEdit.value ? '保存成功' : '创建成功',
      icon: 'success'
    })
    /* 延迟返回上一页，确保提示显示完成 */
    setTimeout(() => goBack(), 800)
  } catch (e) {
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/* 返回上一页 */
function goBack() {
  uni.navigateBack()
}

/* ===================== 生命周期 ===================== */
onLoad((options) => {
  /* 通过 URL 参数 id 判断是新增还是编辑 */
  if (options && options.id) {
    menuId.value = options.id
    loadMenuData()
  } else {
    /* 新增模式：如果 URL 携带 parent_id 则填充到表单 */
    if (options && options.parent_id) {
      form.parent_id = options.parent_id
    }
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

/* 表单卡片容器 */
.form-card {
  padding: 28px 32px;
  max-width: 680px;
  flex: 1;
}

/* 标题区 */
.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 220, 195, 0.3);
}
.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 加载状态 */
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

/* 表单内容区 */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 表单行 */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row--inline {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.required {
  color: var(--danger, #c0533c);
}
.form-tip {
  font-size: 12px;
  color: var(--text-muted);
}

/* 底部操作按钮 */
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 220, 195, 0.3);
}

/* 响应式：移动端适配 */
@media (max-width: 768px) {
  .form-card {
    padding: 20px;
  }
}
</style>
