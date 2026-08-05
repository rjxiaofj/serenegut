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
        <text class="form-title">{{ isEdit ? '编辑文章' : '发布新文章' }}</text>
      </view>

      <view class="form-body">
        <!-- 文章标题 -->
        <view class="form-row">
          <text class="form-label">标题 <text class="required">*</text></text>
          <input v-model="form.title" class="sg-input" placeholder="请输入文章标题" maxlength="100" />
        </view>

        <!-- 分类 + 作者 -->
        <view class="form-row-2">
          <view class="form-row">
            <text class="form-label">分类</text>
            <select v-model="form.category" class="sg-select">
              <option v-for="c in cats" :key="c" :value="c">{{ c }}</option>
            </select>
          </view>
          <view class="form-row">
            <text class="form-label">作者</text>
            <input v-model="form.author" class="sg-input" />
          </view>
        </view>

        <!-- 摘要 -->
        <view class="form-row">
          <text class="form-label">摘要</text>
          <textarea v-model="form.summary" class="sg-textarea" maxlength="200" placeholder="一句话概括文章内容" />
        </view>

        <!-- 封面图 -->
        <view class="form-row">
          <text class="form-label">封面图</text>
          <view class="cover-upload-area">
            <view v-if="form.coverImage || form.coverLocal" class="cover-preview">
              <image :src="form.coverImage || form.coverLocal" mode="aspectFill" class="cover-img" />
              <view class="cover-overlay">
                <text class="cover-btn" @click="chooseCover">更换</text>
                <text class="cover-btn cover-del" @click="form.coverImage = ''; form.coverLocal = ''">删除</text>
              </view>
            </view>
            <view v-else class="cover-placeholder" @click="chooseCover">
              <text class="cover-placeholder-text" v-if="!coverUploading">点击上传封面图</text>
              <view v-else class="flex-center" style="gap:8px">
                <view class="spinner" style="width:14px;height:14px"></view>
                <text class="text-muted" style="font-size:12px">上传中...</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 富文本内容 -->
        <view class="form-row">
          <text class="form-label">正文内容 <text class="required">*</text></text>
          <!-- 工具栏 -->
          <view class="editor-toolbar">
            <view class="toolbar-btn" style="font-weight:700" @click="format('bold')">B</view>
            <view class="toolbar-btn" style="font-style:italic" @click="format('italic')">I</view>
            <view class="toolbar-btn" style="text-decoration:underline" @click="format('underline')">U</view>
            <view class="toolbar-btn" @click="format('indent')">缩进</view>
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
            placeholder="请输入文章正文内容"
            @ready="onEditorReady"
          ></editor>
        </view>

        <!-- 状态 + 推流 -->
        <view class="form-row-2">
          <view class="form-row">
            <text class="form-label">状态</text>
            <select v-model="form.status" class="sg-select">
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
            </select>
          </view>
          <view class="form-row check-row">
            <text class="form-label">首页推流</text>
            <view class="switch" :class="{ on: form.top }" @click="form.top = !form.top">
              <view class="slider"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作按钮 -->
      <view class="form-footer">
        <view class="sg-btn sg-btn-ghost" @click="goBack">取消</view>
        <view class="sg-btn sg-btn-primary" :class="{ 'btn-spinning': saving }" @click="save">
          {{ saving ? '保存中...' : (isEdit ? '保存' : '发布') }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, getCurrentInstance } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { articleApi } from '@/js_sdk/sg-admin/api.js'

/* ===================== 响应式状态 ===================== */
const isEdit = ref(false)
const articleId = ref(null)
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const coverUploading = ref(false)

/* 编辑器实例 */
const editorCtx = ref(null)
const pendingHtml = ref('')

/* 获取当前组件实例 */
const instance = getCurrentInstance()

/* 表单数据 */
const form = reactive({
  title: '',
  category: '饮食调理',
  author: 'Admin',
  summary: '',
  coverImage: '',
  coverLocal: '',
  status: 'draft',
  top: false
})

const cats = ['饮食调理', '运动健康', '肠道菌群', '生活习惯', '疾病科普', '心理健康']

/* ===================== 页面初始化 ===================== */
onLoad((options) => {
  if (options && options.id) {
    isEdit.value = true
    articleId.value = options.id
    loadDetail()
  }
})

/* ===================== 数据加载 ===================== */
async function loadDetail() {
  loading.value = true
  try {
    const res = await articleApi.getDetail(articleId.value)
    if (res && res.code === 0 && res.data) {
      const item = res.data
      form.title = item.title || ''
      form.category = item.category_name || item.category || '饮食调理'
      form.author = item.author_name || item.author || 'Admin'
      form.summary = item.summary || ''
      form.coverImage = item.cover_image || item.coverImage || ''
      form.status = item.status === 1 || item.status === 'published' ? 'published' : 'draft'
      form.top = !!item.is_top || !!item.top
      /* 富文本内容暂存 */
      pendingHtml.value = item.content || ''
    } else {
      uni.showToast({ title: '文章不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1000)
    }
  } catch (e) {
    uni.showToast({ title: '加载数据失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/* ===================== 富文本编辑器 ===================== */
function onEditorReady() {
  uni.createSelectorQuery()
    .in(instance.proxy)
    .select('#editor')
    .fields({ context: true })
    .exec((res) => {
      if (res && res[0] && res[0].context) {
        editorCtx.value = res[0].context
        if (pendingHtml.value) {
          editorCtx.value.setContents({ html: pendingHtml.value })
          pendingHtml.value = ''
        }
      }
    })
}

function format(name, value) {
  if (!editorCtx.value) return
  editorCtx.value.format(name, value)
}

/* 插入图片到富文本编辑器 */
function insertImage() {
  if (!editorCtx.value || uploading.value) return
  uni.chooseImage({
    count: 1,
    success: async (chooseRes) => {
      const tempPath = chooseRes.tempFilePaths[0]
      uploading.value = true
      uni.showLoading({ title: '上传中...', mask: true })
      try {
        const cloudPath = `article/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const uploadRes = await uniCloud.uploadFile({
          filePath: tempPath,
          cloudPath
        })
        uni.hideLoading()
        editorCtx.value.insertImage({
          src: uploadRes.fileID,
          alt: '文章图片'
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

/* 从 HTML 中提取纯文本 */
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

/* ===================== 封面图上传 ===================== */
function chooseCover() {
  if (coverUploading.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0]
      coverUploading.value = true
      try {
        const cloudPath = `article/cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const uploadRes = await uniCloud.uploadFile({
          filePath: tempPath,
          cloudPath
        })
        form.coverImage = uploadRes.fileID
        form.coverLocal = ''
      } catch (e) {
        uni.showToast({ title: '封面上传失败', icon: 'none' })
      } finally {
        coverUploading.value = false
      }
    }
  })
}

/* ===================== 表单校验 ===================== */
function validate() {
  if (!form.title.trim()) {
    uni.showToast({ title: '标题不能为空', icon: 'none' })
    return false
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

  if (!text.trim()) {
    uni.showToast({ title: '正文内容不能为空', icon: 'none' })
    saving.value = false
    return
  }

  uni.showLoading({ title: '保存中...', mask: true })
  try {
    const data = {
      title: form.title.trim(),
      category: form.category,
      author: form.author || 'Admin',
      summary: form.summary || '',
      content: html,
      cover_image: form.coverImage || '',
      status: form.status,
      top: form.top
    }

    if (isEdit.value) {
      await articleApi.update(articleId.value, data)
    } else {
      await articleApi.create(data)
    }

    uni.hideLoading()
    uni.showToast({ title: isEdit.value ? '保存成功' : '发布成功', icon: 'success' })
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
.form-row-2 {
  display: flex;
  gap: 20px;
}
.form-row-2 > .form-row {
  flex: 1;
}
.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
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

/* ===================== 封面图 ===================== */
.cover-upload-area {
  width: 100%;
}
.cover-preview {
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 300px;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.cover-img {
  width: 100%;
  height: 100%;
}
.cover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
  background: rgba(0, 0, 0, 0.5);
}
.cover-btn {
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.cover-del {
  color: #ff9999;
}
.cover-placeholder {
  width: 100%;
  max-width: 400px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-veil);
  border: 2px dashed rgba(255, 220, 195, 0.5);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.cover-placeholder-text {
  font-size: 14px;
  color: var(--text-muted);
}
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
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
.ql-editor {
  width: 100%;
  min-height: 320px;
  padding: 12px 16px;
  background: var(--bg-veil);
  border: 1px solid rgba(255, 220, 195, 0.5);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

/* ===================== 开关 ===================== */
.check-row {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}
.switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #d4c5b9;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
}
.switch.on {
  background: var(--grad-primary);
}
.slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.3s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}
.switch.on .slider {
  transform: translateX(20px);
}

/* ===================== 响应式 ===================== */
@media (max-width: 768px) {
  .form-card {
    padding: 20px;
  }
  .form-row-2 {
    flex-direction: column;
    gap: 18px;
  }
}
</style>
