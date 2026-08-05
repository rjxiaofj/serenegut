<template>
	<view class="page-wrap">
		<view v-if="loading" class="loading-wrap glass-card">
			<view class="spinner"></view>
		</view>

		<!-- 网络异常 -->
		<view v-else-if="error" class="loading-wrap glass-card error-wrap">
			<text class="text-muted err-text">网络异常，请检查网络后重试</text>
			<view class="sg-btn sg-btn-primary sg-btn-sm" @click="retry">重试</view>
		</view>

		<template v-else>
			<!-- 功能开关 -->
			<view class="settings-card glass-card fade-in-up" style="animation-delay: 0.05s;">
				<view class="card-title">功能开关</view>
				<view class="switch-list">
					<view class="switch-item">
						<view class="switch-info">
							<text class="switch-label">允许新用户注册</text>
							<text class="switch-desc">关闭后客户端将无法创建新账号</text>
						</view>
						<view class="switch" :class="{ on: form.registrationEnabled }" @click="form.registrationEnabled = !form.registrationEnabled">
							<view class="slider"></view>
						</view>
					</view>
					<view class="switch-item">
						<view class="switch-info">
							<text class="switch-label">AI 智能报告</text>
							<text class="switch-desc">基于健康记录生成个性化分析报告</text>
						</view>
						<view class="switch" :class="{ on: form.aiReportEnabled }" @click="form.aiReportEnabled = !form.aiReportEnabled">
							<view class="slider"></view>
						</view>
					</view>
					<view class="switch-item">
						<view class="switch-info">
							<text class="switch-label">排行榜展示</text>
							<text class="switch-desc">允许客户端查看健康积分排行榜</text>
						</view>
						<view class="switch" :class="{ on: form.rankingEnabled }" @click="form.rankingEnabled = !form.rankingEnabled">
							<view class="slider"></view>
						</view>
					</view>
					<view class="switch-item">
						<view class="switch-info">
							<text class="switch-label">维护模式</text>
							<text class="switch-desc">开启后客户端将进入维护提示页，无法正常使用</text>
						</view>
						<view class="switch" :class="{ on: form.maintenanceMode }" @click="form.maintenanceMode = !form.maintenanceMode">
							<view class="slider"></view>
						</view>
					</view>
				</view>
				<view v-if="form.maintenanceMode" class="form-group" style="margin-top: 18px; max-width: 600px;">
					<text class="form-label">维护公告内容</text>
					<textarea v-model="form.maintenanceAnnouncement" class="sg-textarea" placeholder="开启维护模式后向用户展示的公告内容" style="min-height: 80px;"></textarea>
				</view>
			</view>

			<view class="settings-card glass-card fade-in-up" style="animation-delay: 0.1s;">
				<view class="card-title">华为运动健康</view>
				<view class="form-group" style="max-width: 600px;">
					<text class="form-label">Client ID</text>
					<input v-model="form.huaweiClientId" class="sg-input" placeholder="华为开发者联盟 Health Kit 应用的 Client ID" />
				</view>
				<view class="form-group" style="max-width: 600px; margin-top: 16px;">
					<text class="form-label">Client Secret</text>
					<input v-model="form.huaweiClientSecret" class="sg-input" placeholder="华为开发者联盟 Health Kit 应用的 Client Secret" />
				</view>
				<text class="form-hint" style="display:block; margin-top:12px; font-size:13px; color:#887364; line-height:1.6;">配置后，用户可在客户端「设置与安全 → 绑定设备」授权华为运动健康，同步心率、血氧、步数等数据。</text>
			</view>

			<!-- 操作栏 -->
			<view class="action-bar glass-card fade-in-up" style="animation-delay: 0.2s;">
				<text v-if="saved" class="saved-tip">
					<view class="saved-dot"></view>设置已保存
				</text>
				<text v-else class="action-hint">修改后请点击保存</text>
			<view class="flex gap-sm">
				<view class="sg-btn sg-btn-ghost sg-btn-sm" :class="{ 'btn-spinning': refreshing }" @click="refresh">
					{{ refreshing ? '刷新中...' : '刷新' }}
				</view>
				<view class="sg-btn sg-btn-ghost" @click="reset">重置</view>
				<view class="sg-btn sg-btn-primary" @click="save">保存设置</view>
			</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { configApi } from '@/js_sdk/sg-admin/api.js'

const loading = ref(false)
const error = ref(false)
const refreshing = ref(false)
const saved = ref(false)
let inited = false
const form = reactive({
	registrationEnabled: true,
	aiReportEnabled: true,
	rankingEnabled: true,
	maintenanceMode: false,
	maintenanceAnnouncement: '',
	huaweiClientId: '',
	huaweiClientSecret: ''
})

function applyData(data) {
	if (!data) return
	form.registrationEnabled = data.registrationEnabled ?? true
	form.aiReportEnabled = data.aiReportEnabled ?? true
	form.rankingEnabled = data.rankingEnabled ?? true
	form.maintenanceMode = data.maintenanceMode ?? false
	form.maintenanceAnnouncement = data.maintenanceAnnouncement ?? ''
	form.huaweiClientId = data.huawei_client_id ?? ''
	form.huaweiClientSecret = data.huawei_client_secret ?? ''
}

onLoad(async () => {
	if (inited) return
	inited = true
	loading.value = true
	try {
		const res = await configApi.get()
		applyData(res.data)
	} catch (e) {
		error.value = true
	} finally {
		loading.value = false
	}
})

async function retry() {
	if (loading.value) return
	loading.value = true
	error.value = false
	try {
		const res = await configApi.get()
		applyData(res.data)
	} catch (e) {
		error.value = true
	} finally {
		loading.value = false
	}
}

async function refresh() {
	if (refreshing.value || loading.value) return
	refreshing.value = true
	try {
		const res = await configApi.get(true)
		if (res && res.data) applyData(res.data)
		uni.showToast({ title: '刷新成功', icon: 'success' })
	} catch (e) {
		uni.showToast({ title: '刷新失败', icon: 'none' })
	} finally {
		refreshing.value = false
	}
}

async function save() {
	await configApi.update({
		registrationEnabled: form.registrationEnabled,
		aiReportEnabled: form.aiReportEnabled,
		rankingEnabled: form.rankingEnabled,
		maintenanceMode: form.maintenanceMode,
		maintenanceAnnouncement: form.maintenanceAnnouncement,
		huawei_client_id: form.huaweiClientId,
		huawei_client_secret: form.huaweiClientSecret
	})
	saved.value = true
	setTimeout(() => (saved.value = false), 2000)
}

async function reset() {
	const res = await configApi.get()
	applyData(res.data)
}
</script>

<style>
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
.error-wrap {
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 60px;
}
.err-text {
	font-size: 15px;
}

.settings-card {
	padding: 28px 32px;
}
.card-title {
	font-size: 17px;
	font-weight: 600;
	color: var(--text-primary);
	margin-bottom: 24px;
	padding-bottom: 16px;
	border-bottom: 1px solid rgba(255, 220, 195, 0.3);
}

.form-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 28px 32px;
}
.form-group {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.form-label {
	font-size: 13px;
	font-weight: 500;
	color: var(--text-secondary);
}
.form-hint {
	font-size: 12px;
	color: var(--text-placeholder);
}

.switch-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.switch-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 22px 0;
	border-bottom: 1px solid rgba(255, 220, 195, 0.2);
}
.switch-item:last-child {
	border-bottom: none;
}
.switch-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.switch-label {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-primary);
}
.switch-desc {
	font-size: 12px;
	color: var(--text-muted);
}

.switch {
	position: relative;
	display: inline-block;
	width: 46px;
	height: 26px;
	flex-shrink: 0;
}
.slider {
	position: absolute;
	cursor: pointer;
	inset: 0;
	background: var(--bg-soft);
	border: 1px solid rgba(255, 220, 195, 0.4);
	border-radius: var(--radius-full);
	transition: 0.3s;
}
.slider::before {
	content: '';
	position: absolute;
	height: 20px;
	width: 20px;
	left: 2px;
	bottom: 2px;
	background: #fff;
	border-radius: 50%;
	transition: 0.3s var(--ease-spring);
	box-shadow: var(--shadow-sm);
}
.switch.on .slider {
	background: var(--grad-primary);
	border-color: transparent;
}
.switch.on .slider::before {
	transform: translateX(20px);
}

.action-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
}
.saved-tip {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	color: var(--success);
}
.saved-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--success);
	animation: breathing-pulse 1.5s ease-in-out infinite;
}
.action-hint {
	font-size: 13px;
	color: var(--text-muted);
}

@media (max-width: 768px) {
	.form-grid {
		grid-template-columns: 1fr;
	}
}
</style>
