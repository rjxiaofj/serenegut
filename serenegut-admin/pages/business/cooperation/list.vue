<template>
    <view class="page-wrap">
        <view class="page-header glass-card fade-in-up">
            <text class="page-title">合作信息</text>
        </view>

        <view v-if="loading" class="loading-wrap glass-card">
            <view class="spinner"></view>
        </view>

        <view v-else class="content-wrap glass-card fade-in-up">
            <!-- 字段与小程序端商务合作页面对齐：微信客服、联系电话、联系邮箱、公司理念 -->
            <view class="form-group">
                <text class="form-label">微信客服</text>
                <input
                    v-model="form.wechatService"
                    class="text-input"
                    placeholder="请输入微信客服展示文字，如：联系客服"
                    :maxlength="20"
                />
            </view>
            <view class="form-group">
                <text class="form-label">联系电话</text>
                <input
                    v-model="form.contactPhone"
                    class="text-input"
                    placeholder="请输入联系电话，如：400-888-0000"
                    :maxlength="30"
                />
            </view>
            <view class="form-group">
                <text class="form-label">联系邮箱</text>
                <input
                    v-model="form.contactEmail"
                    class="text-input"
                    placeholder="请输入联系邮箱，如：partner@serenegut.com"
                    :maxlength="50"
                />
            </view>
            <view class="form-group">
                <text class="form-label">公司理念</text>
                <textarea
                    v-model="form.companyPhilosophy"
                    class="textarea-input"
                    placeholder="请输入公司理念文字"
                    :maxlength="200"
                    rows="4"
                />
            </view>

            <view class="save-btn-wrap">
                <view class="sg-btn sg-btn-primary" :class="{ 'btn-spinning': saving }" @click="save">
                    {{ saving ? '保存中...' : '保存' }}
                </view>
            </view>
        </view>

        <!-- 右下角浮窗小球：仅刷新功能 -->
        <view class="float-ball-group">
            <view class="float-ball float-ball-refresh" :class="{ spinning: refreshing }" @click="loadData">
                <text class="float-ball-icon">↻</text>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { configApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const refreshing = ref(false)
const saving = ref(false)

const form = reactive({
    wechatService: '',     // 微信客服展示文字
    contactPhone: '',      // 联系电话
    contactEmail: '',      // 联系邮箱
    companyPhilosophy: ''  // 公司理念文字
})

const loadData = async () => {
    if (refreshing.value || loading.value) return
    refreshing.value = true
    try {
        const res = await configApi.get(true)
        if (res && res.code === 0 && res.data) {
            form.wechatService = res.data.wechatService || ''
            form.contactPhone = res.data.contactPhone || ''
            form.contactEmail = res.data.contactEmail || ''
            form.companyPhilosophy = res.data.companyPhilosophy || ''
        }
    } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' })
    } finally {
        refreshing.value = false
        loading.value = false
    }
}

const save = async () => {
    if (saving.value) return
    saving.value = true
    try {
        const res = await configApi.update({
            wechatService: form.wechatService,
            contactPhone: form.contactPhone,
            contactEmail: form.contactEmail,
            companyPhilosophy: form.companyPhilosophy
        })
        if (res && res.code === 0) {
            uni.showToast({ title: '保存成功', icon: 'success' })
        } else {
            uni.showToast({ title: res.message || '保存失败', icon: 'none' })
        }
    } catch (e) {
        uni.showToast({ title: '保存失败', icon: 'none' })
    } finally {
        saving.value = false
    }
}

loadData()
loading.value = true
setTimeout(() => { loading.value = false }, 300)
</script>

<style scoped>
.page-wrap {
    display: flex;
    flex-direction: column;
    gap: 18px;
}
.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
}
.page-title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.loading-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 80px 0;
}
.content-wrap { padding: 28px 32px; }
.form-group { margin-bottom: 20px; }
.form-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}
.text-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 14px;
    box-sizing: border-box;
}
.textarea-input {
    width: 100%;
    min-height: 80px;
    padding: 10px 14px;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    font-size: 14px;
    box-sizing: border-box;
}
.save-btn-wrap {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
}

/* 右下角浮窗小球样式 */
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
.float-ball.spinning {
    animation: ball-spin 0.8s linear infinite;
}
@keyframes ball-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>
