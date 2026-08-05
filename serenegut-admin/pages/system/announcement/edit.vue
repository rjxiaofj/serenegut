<template>
  <view class="page-wrap">
    <!-- 加载中 -->
    <view v-if="loading" class="loading-wrap glass-card">
      <view class="spinner"></view>
    </view>

    <!-- 编辑表单 -->
    <view v-else class="form-card glass-card fade-in-up">
      <!-- 表单标题 -->
      <view class="form-header">
        <text class="form-title">{{ isEdit ? '编辑公告' : '新增公告' }}</text>
      </view>

      <view class="form-body">
        <!-- 公告标题 -->
        <view class="form-row">
          <text class="form-label">公告标题 <text class="required">*</text></text>
          <input v-model="form.title" class="sg-input" placeholder="请输入公告标题" maxlength="100" />
        </view>

        <!-- 公告类型（按钮组切换） -->
        <view class="form-row">
          <text class="form-label">公告类型 <text class="required">*</text></text>
          <view class="type-btn-group">
            <view
              class="type-btn"
              :class="{ active: form.type === 'normal' }"
              @click="form.type = 'normal'"
            >普通公告</view>
            <view
              class="type-btn"
              :class="{ active: form.type === 'ban' }"
              @click="form.type = 'ban'"
            >封禁公告</view>
          </view>
        </view>

        <!-- 富文本内容 -->
        <view class="form-row">
          <text class="form-label">公告内容 <text class="required">*</text></text>
          <!-- 工具栏 -->
          <view class="editor-toolbar">
            <view class="toolbar-btn" style="font-weight:700" @click="format('bold')">B</view>
            <view class="toolbar-btn" style="font-style:italic" @click="format('italic')">I</view>
            <view class="toolbar-btn" style="text-decoration:underline" @click="format('underline')">U</view>
            <view class="toolbar-divider"></view>
            <view class="toolbar-btn" @click="format('align', 'left')">左</view>
            <view class="toolbar-btn" @click="format('align', 'center')">中</view>
            <view class="toolbar-btn" @click="format('align', 'right')">右</view>
            <view class="toolbar-divider"></view>
            <view class="toolbar-btn" @click="format('list', 'ordered')">1.</view>
            <view class="toolbar-btn" @click="format('list', 'bullet')">•</view>
            <view class="toolbar-divider"></view>
            <view
              class="toolbar-btn"
              :class="{ 'btn-spinning': uploading }"
              @click="insertImage"
            >{{ uploading ? '上传中' : '图片' }}</view>
          </view>
          <!-- 编辑器本体 -->
          <editor
            id="editor"
            class="ql-editor"
            placeholder="请输入公告内容"
            @ready="onEditorReady"
          ></editor>
        </view>

        <!-- 封禁时长（仅封禁类型显示） -->
        <view v-if="form.type === 'ban'" class="form-row">
          <text class="form-label">封禁时长 <text class="required">*</text></text>
          <select v-model="form.ban_duration" class="sg-select" style="max-width:240px">
            <option value="1h">1小时</option>
            <option value="1d">1天</option>
            <option value="1m">1个月</option>
            <option value="custom">自定义时长</option>
            <option value="permanent">永久封禁</option>
          </select>
          <!-- 自定义时长输入框 -->
          <view v-if="form.ban_duration === 'custom'" class="custom-hours-row">
            <input
              v-model="form.ban_custom_hours"
              type="number"
              class="sg-input"
              placeholder="请输入小时数"
              style="max-width:200px"
            />
            <text class="form-hint">小时</text>
          </view>
        </view>

        <!-- 触发频率（仅普通公告显示） -->
        <view v-if="form.type === 'normal'" class="form-row">
          <text class="form-label">触发频率 <text class="required">*</text></text>
          <view class="type-btn-group">
            <view class="type-btn" :class="{ active: form.trigger_frequency === 'once' }" @click="form.trigger_frequency = 'once'">仅读一次</view>
            <view class="type-btn" :class="{ active: form.trigger_frequency === 'every_time' }" @click="form.trigger_frequency = 'every_time'">每次进入</view>
            <view class="type-btn" :class="{ active: form.trigger_frequency === 'daily' }" @click="form.trigger_frequency = 'daily'">每天一次</view>
            <view class="type-btn" :class="{ active: form.trigger_frequency === 'weekly' }" @click="form.trigger_frequency = 'weekly'">每周一次</view>
          </view>
        </view>

        <!-- 排序权重 -->
        <view class="form-row">
          <text class="form-label">排序权重</text>
          <input
            v-model="form.sort"
            type="number"
            class="sg-input"
            placeholder="数字越小越靠前，默认 0"
            style="max-width: 200px;"
          />
        </view>
      </view>

      <!-- 底部操作按钮 -->
      <view class="form-footer">
        <view class="sg-btn sg-btn-ghost" @click="goBack">取消</view>
        <view class="sg-btn sg-btn-primary" :class="{ 'btn-spinning': saving }" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, getCurrentInstance } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { announcementApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const isEdit = ref(false)        // 是否为编辑模式
const announcementId = ref(null) // 编辑模式下的公告 ID
const loading = ref(false)       // 加载详情中
const saving = ref(false)        // 保存中
const uploading = ref(false)     // 图片上传中

/* 编辑器实例 */
const editorCtx = ref(null)
/* 待回填的富文本内容（编辑模式下，编辑器 ready 前暂存） */
const pendingHtml = ref('')

/* 获取当前组件实例，用于 selectorQuery 定位编辑器 */
const instance = getCurrentInstance()

/* 表单数据 */
const form = reactive({
  title: '',
  type: 'normal',
  sort: 0,
  trigger_frequency: 'once', // 触发频率（仅普通公告）
  ban_duration: '1h',
  ban_custom_hours: ''
})

/* ===================== 页面初始化 ===================== */
onLoad((options) => {
  /* 通过 URL 参数 id 判断是新增还是编辑 */
  if (options && options.id) {
    isEdit.value = true
    announcementId.value = options.id
    loadDetail()
  }
})

/* ===================== 数据加载 ===================== */
/* 编辑模式下，从列表接口获取公告详情并填充表单 */
async function loadDetail() {
  loading.value = true
  try {
    /* force = true 跳过缓存，确保获取最新数据 */
    const res = await announcementApi.getList(true)
    if (res && res.code === 0 && res.data) {
      const item = (res.data.list || []).find(a => String(a.id) === String(announcementId.value))
      if (item) {
        form.title = item.title || ''
        form.type = item.type || 'normal'
        form.sort = item.sort || 0
        form.ban_duration = item.ban_duration || '1h'
        form.ban_custom_hours = item.ban_custom_hours || ''
        form.trigger_frequency = item.trigger_frequency || 'once'
        /* 富文本内容暂存，等编辑器 ready 后回填 */
        pendingHtml.value = item.rich_content || ''
      } else {
        uni.showToast({ title: '公告不存在', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1000)
      }
    }
  } catch (e) {
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/* ===================== 富文本编辑器 ===================== */
/* 编辑器初始化完成回调，获取 editorCtx 实例 */
function onEditorReady() {
  uni.createSelectorQuery()
    .in(instance.proxy)
    .select('#editor')
    .fields({ context: true })
    .exec((res) => {
      if (res && res[0] && res[0].context) {
        editorCtx.value = res[0].context
        /* 编辑模式下，若有待回填内容则设置到编辑器 */
        if (pendingHtml.value) {
          editorCtx.value.setContents({ html: pendingHtml.value })
          pendingHtml.value = ''
        }
      }
    })
}

/* 应用格式（加粗、斜体、下划线、对齐、列表等） */
function format(name, value) {
  if (!editorCtx.value) return
  editorCtx.value.format(name, value)
}

/* 插入图片：选择图片 -> 上传 uniCloud -> 插入编辑器 */
function insertImage() {
  if (!editorCtx.value || uploading.value) return
  uni.chooseImage({
    count: 1,
    success: async (chooseRes) => {
      const tempPath = chooseRes.tempFilePaths[0]
      uploading.value = true
      uni.showLoading({ title: '上传中...', mask: true })
      try {
        /* 生成云端唯一文件路径 */
        const cloudPath = `announcement/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
        const uploadRes = await uniCloud.uploadFile({
          filePath: tempPath,
          cloudPath
        })
        uni.hideLoading()
        /* 将上传后的图片 URL 插入编辑器 */
        editorCtx.value.insertImage({
          src: uploadRes.fileID,
          alt: '公告图片'
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '图片上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}

/* 从 HTML 中提取纯文本（getContents 未返回 text 时的降级方案） */
function extractPlainText(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/* ===================== 表单校验 ===================== */
function validate() {
  if (!form.title.trim()) {
    uni.showToast({ title: '公告标题不能为空', icon: 'none' })
    return false
  }
  /* 封禁类型需要选择封禁时长 */
  if (form.type === 'ban') {
    if (!form.ban_duration) {
      uni.showToast({ title: '请选择封禁时长', icon: 'none' })
      return false
    }
    if (form.ban_duration === 'custom' && !form.ban_custom_hours) {
      uni.showToast({ title: '请输入自定义封禁时长', icon: 'none' })
      return false
    }
  }
  return true
}

/* ===================== 保存 ===================== */
async function save() {
  if (!validate()) return
  if (saving.value) return
  saving.value = true

  /* 从编辑器获取富文本内容 */
  let html = ''
  let text = ''
  if (editorCtx.value) {
    const content = await new Promise((resolve) => {
      editorCtx.value.getContents({
        success: (res) => resolve(res),
        fail: () => resolve(null)
      })
    })
    if (content) {
      html = content.html || ''
      text = content.text || extractPlainText(html)
    }
  }

  /* 校验内容不为空 */
  if (!text.trim()) {
    uni.showToast({ title: '公告内容不能为空', icon: 'none' })
    saving.value = false
    return
  }

  uni.showLoading({ title: '保存中...', mask: true })
  try {
    /* 构建提交数据 */
    const data = {
      title: form.title.trim(),
      type: form.type,
      rich_content: html,
      content: text.trim(),
      sort: Number(form.sort) || 0,
      trigger_frequency: form.trigger_frequency
    }

    /* 封禁类型附加封禁配置字段 */
    if (form.type === 'ban') {
      data.ban_duration = form.ban_duration
      data.ban_is_permanent = form.ban_duration === 'permanent'
      if (form.ban_duration === 'custom') {
        data.ban_custom_hours = Number(form.ban_custom_hours) || 0
      }
    }

    if (isEdit.value) {
      await announcementApi.update(announcementId.value, data)
    } else {
      await announcementApi.create(data)
    }

    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 800)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

/* 返回上一页 */
function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 80px 0;
}
/* 表单卡片：撑满父容器宽度，无 max-width 限制 */
.form-card {
  padding: 28px 32px;
}
.form-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 220, 195, 0.3);
}
.form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.form-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
/* 必填标记 */
.required {
  color: #c0533c;
}
.form-hint {
  font-size: 13px;
  color: var(--text-muted);
}
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 220, 195, 0.3);
}

/* ===================== 类型按钮组 ===================== */
.type-btn-group {
  display: inline-flex;
  gap: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid rgba(255, 220, 195, 0.5);
}
.type-btn {
  padding: 9px 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-veil);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  white-space: nowrap;
}
.type-btn:hover {
  color: var(--primary);
  background: var(--primary-veil);
}
.type-btn.active {
  background: var(--grad-primary);
  color: #fff;
}

/* ===================== 富文本编辑器 ===================== */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--bg-soft);
  border: 1px solid rgba(255, 220, 195, 0.5);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border-bottom: none;
  flex-wrap: wrap;
}
.toolbar-btn {
  min-width: 34px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 14px;
  color: var(--text-secondary);
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  user-select: none;
}
.toolbar-btn:hover {
  background: var(--primary-veil);
  color: var(--primary);
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 220, 195, 0.5);
  margin: 0 4px;
}
/* 编辑器本体 */
.ql-editor {
  width: 100%;
  min-height: 240px;
  padding: 12px 16px;
  background: var(--bg-veil);
  border: 1px solid rgba(255, 220, 195, 0.5);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

/* ===================== 封禁时长 ===================== */
.custom-hours-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

/* ===================== 响应式 ===================== */
@media (max-width: 768px) {
  .form-card {
    padding: 20px;
  }
  .type-btn {
    padding: 9px 16px;
  }
}
</style>
