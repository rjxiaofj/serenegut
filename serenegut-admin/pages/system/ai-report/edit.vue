<template>
  <view class="page-wrap">
    <!-- 表单卡片 -->
    <view class="form-card glass-card fade-in-up">
      <!-- 标题区 -->
      <view class="form-header">
        <text class="form-title">{{ isEdit ? '编辑AI模型' : '新增AI模型' }}</text>
        <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="goBack">返回</view>
      </view>

      <!-- 加载中 -->
      <view v-if="loading" class="loading-wrap">
        <view class="spinner"></view>
      </view>

      <!-- 表单内容 -->
      <view v-else class="form-body">
        <!-- 模型名称 -->
        <view class="form-row">
          <text class="form-label">模型名称 <text class="required">*</text></text>
          <input
            v-model="form.name"
            class="sg-input"
            placeholder="如 DeepSeek Chat"
            maxlength="50"
          />
        </view>

        <!-- 服务商 -->
        <view class="form-row">
          <text class="form-label">服务商</text>
          <select v-model="form.provider" class="sg-select" @change="onProviderChange">
            <option value="deepseek">DeepSeek</option>
            <option value="openai">OpenAI</option>
            <option value="custom">自定义</option>
          </select>
        </view>

        <!-- API地址 -->
        <view class="form-row">
          <text class="form-label">API地址 <text class="required">*</text></text>
          <input
            v-model="form.api_url"
            class="sg-input"
            placeholder="https://api.deepseek.com/v1/chat/completions"
          />
        </view>

        <!-- API密钥 -->
        <view class="form-row">
          <text class="form-label">API密钥 <text class="required">*</text></text>
          <view class="input-with-btn">
            <input
              v-model="form.api_key"
              class="sg-input"
              :type="showKey ? 'text' : 'password'"
              placeholder="sk-..."
              style="flex:1"
            />
            <view class="sg-btn sg-btn-ghost sg-btn-sm" @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </view>
          </view>
        </view>

        <!-- 模型标识符 -->
        <view class="form-row">
          <text class="form-label">模型标识符 <text class="required">*</text></text>
          <input
            v-model="form.model"
            class="sg-input"
            placeholder="deepseek-chat"
          />
        </view>

        <!-- 排序权重 -->
        <view class="form-row">
          <text class="form-label">排序权重</text>
          <input
            v-model="form.sort"
            class="sg-input"
            type="number"
            placeholder="0"
          />
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
import { aiModelApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const loading = ref(false)
const saving = ref(false)
const showKey = ref(false)
const modelId = ref(null) // 当前编辑的模型ID，null表示新增

/* 表单数据 */
const form = reactive({
  name: '',
  provider: 'deepseek',
  api_url: '',
  api_key: '',
  model: '',
  sort: 0
})

/* 是否为编辑模式 */
const isEdit = computed(() => modelId.value != null)

/* ===================== 服务商默认配置 ===================== */
/* 各服务商的默认 API 地址和模型标识符 */
const providerDefaults = {
  deepseek: {
    api_url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat'
  },
  openai: {
    api_url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  custom: {
    api_url: '',
    model: ''
  }
}

/* 切换服务商时自动填充默认配置（仅新增模式下生效） */
function onProviderChange() {
  if (isEdit.value) return
  const defaults = providerDefaults[form.provider]
  if (defaults) {
    form.api_url = defaults.api_url
    if (defaults.model && !form.model) {
      form.model = defaults.model
    }
  }
}

/* ===================== 数据加载 ===================== */

/* 编辑模式下，从列表中查找对应模型数据并填充表单 */
async function loadModelData() {
  loading.value = true
  try {
    const res = await aiModelApi.getList(true)
    if (res && res.code === 0 && res.data && res.data.list) {
      /* 根据 id 查找目标模型 */
      const target = res.data.list.find(item => String(item.id) === String(modelId.value))
      if (target) {
        form.name = target.name || ''
        form.provider = target.provider || 'deepseek'
        form.api_url = target.api_url || ''
        form.api_key = target.api_key || ''
        form.model = target.model || ''
        form.sort = target.sort != null ? target.sort : 0
      } else {
        uni.showToast({ title: '模型不存在', icon: 'none' })
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
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入模型名称', icon: 'none' })
    return false
  }
  if (!form.api_url.trim()) {
    uni.showToast({ title: '请输入API地址', icon: 'none' })
    return false
  }
  if (!form.api_key.trim()) {
    uni.showToast({ title: '请输入API密钥', icon: 'none' })
    return false
  }
  if (!form.model.trim()) {
    uni.showToast({ title: '请输入模型标识符', icon: 'none' })
    return false
  }
  return true
}

/* ===================== 保存操作 ===================== */

/* 保存模型数据（新增或更新） */
async function save() {
  if (!validateForm()) return
  if (saving.value) return
  saving.value = true

  try {
    /* 构建提交数据 */
    const data = {
      name: form.name.trim(),
      provider: form.provider,
      api_url: form.api_url.trim(),
      api_key: form.api_key.trim(),
      model: form.model.trim(),
      sort: Number(form.sort) || 0
    }

    if (isEdit.value) {
      /* 编辑模式：调用更新接口 */
      await aiModelApi.update(modelId.value, data)
    } else {
      /* 新增模式：调用创建接口 */
      await aiModelApi.create(data)
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
    modelId.value = options.id
    loadModelData()
  } else {
    /* 新增模式：填充服务商默认值 */
    onProviderChange()
  }
})
</script>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 表单卡片容器 */
.form-card {
  padding: 28px 32px;
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
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.required {
  color: var(--danger, #c0533c);
}

/* 带按钮的输入框（用于密钥显示/隐藏） */
.input-with-btn {
  display: flex;
  gap: 8px;
  align-items: center;
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
