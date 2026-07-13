<template>
	<view class="page-container-no-tab">
		<ConfirmModal
			:visible="showConfirmModal"
			:title="confirmModalTitle"
			:content="confirmModalContent"
			:confirmText="confirmModalConfirmText"
			:cancelText="confirmModalCancelText"
			@confirm="confirmConfirmModal"
			@cancel="closeConfirmModal"
		/>

		<view class="content">
			<view class="form-card">
				<view class="form-item">
					<text class="form-label">批量同步间隔（秒）</text>
					<input
						v-model.number="form.interval"
						class="form-input"
						type="number"
						placeholder="建议 60-600 秒"
					/>
					<text class="form-tip">客户端每隔 N 秒将累积的阅读/点赞等操作批量提交一次，默认 300 秒（5 分钟）</text>
				</view>

				<view class="form-item">
					<text class="form-label">启用批量同步</text>
					<view class="toggle-row">
						<text class="toggle-label">{{ form.enabled ? '已启用' : '已关闭' }}</text>
						<view
							:class="['toggle-switch', { active: form.enabled }]"
							@click="form.enabled = !form.enabled"
						>
							<view class="toggle-thumb"></view>
						</view>
					</view>
					<text class="form-tip">关闭后每条操作将不再合并，实时触发云函数（不推荐）</text>
				</view>
			</view>

			<view class="info-card">
				<text class="info-title">当前状态</text>
				<view class="info-row">
					<text class="info-label">队列长度</text>
					<text class="info-value">{{ status.queueLength }} 条</text>
				</view>
				<view class="info-row">
					<text class="info-label">上次同步</text>
					<text class="info-value">{{ status.lastSync || '尚未同步' }}</text>
				</view>
			</view>

			<view class="save-btn" @click="handleSave">
				<text class="save-text">保存配置</text>
			</view>

			<view class="save-btn secondary" @click="handleFlushNow">
				<text class="save-text secondary-text">立即同步累积数据</text>
			</view>
		</view>
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
import sync from '@/utils/sync.js'
import { configApi } from '@/js_sdk/sg-client/api.js'

export default {
	name: 'SyncConfig',
	components: { ConfirmModal },
	data() {
		return {
			form: {
				interval: 300,
				enabled: true
			},
			status: {
				queueLength: 0,
				lastSync: ''
			},
			pageIcons: {},
			showConfirmModal: false,
			confirmModalTitle: '',
			confirmModalContent: '',
			confirmModalConfirmText: '确定',
			confirmModalCancelText: '取消',
			confirmModalCallback: null
		}
	},
	onLoad() {
		this.loadPageIcons()
		this.loadConfig()
		this.updateStatus()
	},
	methods: {
		async loadConfig() {
			try {
				/* 使用 API 服务层获取应用配置 */
				const res = await configApi.get()
				if (res && res.code === 0 && res.data) {
					this.form.interval = res.data.batch_interval || 300
					this.form.enabled = res.data.batch_enabled !== false
				}
			} catch (err) {
				console.error('加载配置失败:', err)
			}
		},
		updateStatus() {
			this.status.queueLength = sync.getQueueLength()
			this.status.lastSync = uni.getStorageSync('lastSyncTime') || '尚未同步'
		},
		showModal(title, content, confirmText = '确定', cancelText = '取消', callback = null) {
			this.confirmModalTitle = title
			this.confirmModalContent = content
			this.confirmModalConfirmText = confirmText
			this.confirmModalCancelText = cancelText
			this.confirmModalCallback = callback
			this.showConfirmModal = true
		},
		closeConfirmModal() {
			this.showConfirmModal = false
			this.confirmModalCallback = null
		},
		confirmConfirmModal() {
			if (this.confirmModalCallback) this.confirmModalCallback()
			this.closeConfirmModal()
		},
		async handleSave() {
			const interval = Number(this.form.interval)
			if (!interval || interval < 30) {
				uni.showToast({ title: '间隔不能少于 30 秒', icon: 'none' })
				return
			}

			this.showModal('确认修改', `将同步间隔设为 ${interval} 秒，是否保存？`, '保存', '取消', async () => {
				try {
					/* 使用 API 服务层更新应用配置 */
					const res = await configApi.update({
						batch_interval: interval,
						batch_enabled: this.form.enabled
					})
					if (res && res.code === 0) {
						uni.showToast({ title: '保存成功，下次启动生效', icon: 'success' })
					} else {
						uni.showToast({ title: res?.message || '保存失败', icon: 'none' })
					}
				} catch (err) {
					console.error('保存配置失败:', err)
					uni.showToast({ title: '保存失败', icon: 'none' })
				}
			})
		},
		handleFlushNow() {
			this.showModal('立即同步', '将本地累积的队列数据立即提交到服务器？', '确定', '取消', async () => {
				await sync.flush()
				uni.setStorageSync('lastSyncTime', new Date().toLocaleString())
				this.updateStatus()
				uni.showToast({ title: '同步完成', icon: 'success' })
			})
		},
		goBack() {
			uni.navigateBack()
		},
		loadPageIcons() {
			this.pageIcons = {
				left: '/static/images/other-icons/left.png',
				right: '/static/images/other-icons/right.png',
				set: '/static/images/other-icons/set.png'
			}
		}
	}
}
</script>

<style lang="scss" scoped>
$primary-color: #8d4b00;
$text-primary: #2a1f15;
$text-muted: #887364;

.content {
	padding: 32rpx 32rpx 60rpx;
	display: flex;
	flex-direction: column;
	gap: 32rpx;
}

.form-card {
	background: rgba(255, 249, 240, 0.82);
	backdrop-filter: blur(20px) saturate(1.08);
	-webkit-backdrop-filter: blur(20px) saturate(1.08);
	border-radius: 48rpx;
	padding: 40rpx;
	border: 1rpx solid rgba(255, 220, 195, 0.45);
	box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
}

.form-item {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-bottom: 32rpx;
	&:last-child { margin-bottom: 0; }
}

.form-label {
	font-size: 24rpx;
	font-weight: 600;
	color: $text-muted;
	text-transform: uppercase;
	letter-spacing: 4rpx;
	padding-left: 8rpx;
}

.form-input {
	box-sizing: border-box;
	width: 100%;
	height: 88rpx;
	background: rgba(255, 248, 235, 0.55);
	border-radius: 32rpx;
	padding: 28rpx 32rpx;
	border: 2rpx solid rgba(141, 75, 0, 0.08);
	font-size: 30rpx;
	font-weight: 600;
	color: $text-primary;
}

.form-tip {
	font-size: 22rpx;
	color: $text-muted;
	padding-left: 8rpx;
	line-height: 1.5;
}

.toggle-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 8rpx;
}

.toggle-label {
	font-size: 28rpx;
	color: $text-primary;
}

.toggle-switch {
	position: relative;
	width: 88rpx;
	height: 48rpx;
	border-radius: 24rpx;
	background: rgba(141, 75, 0, 0.12);
	transition: background 0.3s;
	&.active { background: $primary-color; }
}

.toggle-thumb {
	position: absolute;
	top: 4rpx;
	left: 4rpx;
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background: #fff;
	transition: transform 0.3s;
	.toggle-switch.active & { transform: translateX(40rpx); }
}

.info-card {
	background: rgba(255, 249, 240, 0.82);
	backdrop-filter: blur(20px) saturate(1.08);
	-webkit-backdrop-filter: blur(20px) saturate(1.08);
	border-radius: 48rpx;
	padding: 40rpx;
	border: 1rpx solid rgba(255, 220, 195, 0.45);
	box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
}

.info-title {
	font-size: 28rpx;
	font-weight: 700;
	color: $primary-color;
	margin-bottom: 24rpx;
	display: block;
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx 0;
	border-bottom: 1px solid rgba(141, 75, 0, 0.08);
	&:last-child { border-bottom: none; }
}

.info-label { font-size: 26rpx; color: $text-muted; }
.info-value { font-size: 26rpx; font-weight: 600; color: $text-primary; }

.save-btn {
	height: 100rpx;
	border-radius: 48rpx;
	background: $primary-color;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
	margin: 0 32rpx;
	transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

	&:active {
		transform: scale(0.97);
		box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
	}

	&.secondary {
		background: rgba($primary-color, 0.1);
		box-shadow: none;
	}
}

.save-text {
	font-size: 32rpx;
	font-weight: 600;
	color: #ffffff;
	&.secondary-text { color: $primary-color; }
}
</style>
