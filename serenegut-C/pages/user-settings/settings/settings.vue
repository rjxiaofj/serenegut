<template>
	<view class="page-container-no-tab">
		<custom-nav title="设置与安全" showBack />
		<ConfirmModal
			:visible="showConfirmModal"
			:title="confirmModalTitle"
			:content="confirmModalContent"
			:confirmText="confirmModalConfirmText"
			:cancelText="confirmModalCancelText"
			@confirm="confirmConfirm"
			@cancel="closeConfirmModal"
		/>
		<view class="content">
			<view class="section">
				<text class="section-label">账户资料</text>
				<view class="menu-list">
					<view class="menu-item" @click="editProfile">
						<view class="menu-icon avatar">
							<AppIcon class="icon-text" name="user" :size="28" />
						</view>
						<view class="menu-content">
							<text class="menu-text">个人信息</text>
							<text class="menu-desc">修改头像、姓名、手机号等信息</text>
						</view>
						<image :src="pageIcons.right" class="menu-arrow" mode="aspectFit" />
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-label">健康设备</text>
				<view class="menu-list">
					<view class="menu-item" @click="goToDevices">
						<view class="menu-icon device">
							<AppIcon class="icon-text" name="device-watch" :size="28" />
						</view>
						<view class="menu-content">
							<text class="menu-text">绑定设备</text>
							<text class="menu-desc">绑定小米 / 华为手环，让 AI 分析更准确</text>
						</view>
						<image :src="pageIcons.right" class="menu-arrow" mode="aspectFit" />
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-label">数据管理</text>
				<view class="menu-list">
					<view class="menu-item" @click="exportData">
						<view class="menu-icon export">
							<AppIcon class="icon-text" name="chart-bar" :size="28" />
						</view>
						<text class="menu-text">导出 CSV</text>
						<image :src="pageIcons.right" class="menu-arrow" mode="aspectFit" />
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-label">关于</text>
				<view class="menu-list">
					<view class="menu-item" @click="showAbout">
						<view class="menu-icon about">
							<AppIcon class="icon-text" name="info-circle" :size="28" />
						</view>
						<text class="menu-text">关于我们</text>
						<image :src="pageIcons.right" class="menu-arrow" mode="aspectFit" />
					</view>
					<view class="menu-item">
						<view class="menu-icon version">
							<AppIcon class="icon-text" name="device-mobile" :size="28" />
						</view>
						<text class="menu-text">版本号</text>
						<text class="menu-value">1.0.0</text>
					</view>
				</view>
			</view>

			<view class="action-buttons">
				<view class="logout-btn" @click="logout">
					<text class="logout-text">退出登录</text>
				</view>
				<view class="delete-btn" @click="showDeleteAccountModal">
					<text class="delete-text">注销账号</text>
				</view>
			</view>
		</view>

		<view v-if="showDeleteModal" class="confirm-mask" @click="closeDeleteModal" catchtouchmove="preventTouchMove">
			<view class="delete-modal-container" @click.stop catchtouchmove="preventTouchMove">
				<view class="delete-modal-title">
					<AppIcon name="alert-triangle" color="orange" :size="30" />
					<text>注销账号</text>
				</view>
				<text class="delete-modal-warning">此操作将永久删除您的账号和所有数据，且无法恢复！</text>
				<view class="delete-modal-tip">
					<text class="tip-text">请输入 <text class="highlight">确认注销</text> 以确认操作</text>
				</view>
				<input 
					v-model="deleteConfirmText" 
					class="delete-input" 
					placeholder="请输入确认文字"
					:disabled="isDeleting"
					adjust-position="false"
					hold-keyboard="true"
				/>
				<view class="delete-modal-btn-row">
					<view class="delete-modal-btn cancel" @click="closeDeleteModal" :class="{ disabled: isDeleting }">
						<text class="delete-modal-btn-text">取消</text>
					</view>
					<view 
						class="delete-modal-btn confirm" 
						@click="handleDeleteAccount" 
						:class="{ disabled: isDeleting || deleteConfirmText !== '确认注销' }"
					>
						<text class="delete-modal-btn-text">{{ isDeleting ? '处理中...' : '确认注销' }}</text>
					</view>
				</view>
			</view>
		</view>
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { userApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Settings',
		components: {
			ConfirmModal,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				pageIcons: {},
				showConfirmModal: false,
				confirmModalTitle: '',
				confirmModalContent: '',
				confirmModalConfirmText: '确定',
				confirmModalCancelText: '取消',
				confirmModalCallback: null,
				showDeleteModal: false,
				deleteConfirmText: '',
				isDeleting: false
			}
		},
		onLoad() {
			this.loadPageIcons()
		},
		methods: {
			goBack() {
				uni.navigateBack()
			},
			editProfile() {
				uni.navigateTo({
					url: '/pages/user-settings/edit-profile/edit-profile'
				})
			},
			goToDevices() {
				uni.navigateTo({
					url: '/pages/user-settings/devices/devices'
				})
			},
			exportData() {
				uni.showToast({
					title: '导出功能开发中',
					icon: 'none'
				})
			},
			showAbout() {
				uni.showToast({
					title: '关于我们',
					icon: 'none'
				})
			},
			logout() {
				this.confirmModalTitle = '确认退出'
				this.confirmModalContent = '确定要退出登录吗？'
				this.confirmModalConfirmText = '确定退出'
				this.confirmModalCancelText = '取消'
				this.confirmModalCallback = () => {
					uni.removeStorageSync('token')
					uni.removeStorageSync('userInfo')
					uni.removeStorageSync('userId')
					uni.reLaunch({
						url: '/pages/profile/profile'
					})
				}
				this.showConfirmModal = true
			},
			showDeleteAccountModal() {
				this.showDeleteModal = true
				this.deleteConfirmText = ''
				this.isDeleting = false
			},
			closeDeleteModal() {
				this.showDeleteModal = false
				this.deleteConfirmText = ''
				this.isDeleting = false
			},
			preventTouchMove() {
				return false
			},
			async handleDeleteAccount() {
				if (this.deleteConfirmText !== '确认注销' || this.isDeleting) {
					return
				}
				
				this.isDeleting = true
				const userId = uni.getStorageSync('userId')
				
				try {
					/* 使用 API 服务层注销用户账号 */
					const res = await userApi.delete(userId, this.deleteConfirmText)

					if (res && res.code === 0) {
						uni.removeStorageSync('token')
						uni.removeStorageSync('userInfo')
						uni.removeStorageSync('userId')
						uni.showToast({
							title: '账号已注销',
							icon: 'success'
						})
						setTimeout(() => {
							uni.reLaunch({
								url: '/pages/profile/profile'
							})
						}, 1500)
					} else {
						uni.showToast({
							title: res?.message || '注销失败',
							icon: 'none'
						})
					}
				} catch (err) {
					console.error('注销失败:', err)
					uni.showToast({
						title: '注销失败，请重试',
						icon: 'none'
					})
				} finally {
					this.isDeleting = false
				}
			},
			loadPageIcons() {
				this.pageIcons = {
					clock: '/static/images/other-icons/clock.png',
					cooperation: '/static/images/other-icons/cooperation.png',
					left: '/static/images/other-icons/left.png',
					right: '/static/images/other-icons/right.png',
					set: '/static/images/other-icons/set.png',
					success: '/static/images/other-icons/success.png'
				}
			},
			closeConfirmModal() {
				this.showConfirmModal = false
				this.confirmModalCallback = null
			},
			confirmConfirm() {
				if (this.confirmModalCallback) {
					this.confirmModalCallback()
				}
				this.closeConfirmModal()
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		padding: 32rpx 32rpx 60rpx;
		display: flex;
		flex-direction: column;
		gap: 32rpx;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.section-label {
		font-size: 24rpx;
		font-weight: 600;
		color: #887364;
		padding-left: 16rpx;
	}

	.menu-list {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		overflow: hidden;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.menu-item {
		display: flex;
		align-items: center;
		padding: 28rpx 32rpx;
		border-bottom: 1px solid rgba(141, 75, 0, 0.08);

		&:last-child {
			border-bottom: none;
		}

		&.danger {
			.menu-text {
				color: #c0533c;
			}
		}
	}

	.menu-icon {
		width: 64rpx;
		height: 64rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;

		&.avatar {
			background: rgba(141, 75, 0, 0.1);
		}

		&.username {
			background: rgba(59, 130, 246, 0.1);
		}

		&.phone {
			background: rgba(34, 197, 94, 0.1);
		}

		&.gender {
			background: rgba(168, 85, 247, 0.1);
		}

		&.birthday {
			background: rgba(245, 158, 11, 0.1);
		}

		&.export {
			background: rgba(141, 75, 0, 0.1);
		}

		&.device {
			background: rgba(16, 185, 129, 0.1);
		}

		&.about {
			background: rgba(141, 75, 0, 0.1);
		}

		&.version {
			background: rgba(141, 75, 0, 0.1);
		}
	}

	.icon-text {
		font-size: 28rpx;
	}

	.menu-text {
		flex: 1;
		font-size: 30rpx;
		font-weight: 500;
		color: #2a1f15;
	}

	.menu-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.menu-desc {
		font-size: 24rpx;
		color: #887364;
	}

	.menu-value {
		font-size: 28rpx;
		color: #887364;
		margin-right: 16rpx;
	}

	.menu-arrow {
		width: 28rpx;
		height: 28rpx;
		opacity: 0.5;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-top: 32rpx;
	}

	.logout-btn {
		height: 96rpx;
		border-radius: 48rpx;
		background: rgba(192, 83, 60, 0.08);
		border: 2rpx solid rgba(192, 83, 60, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.logout-btn:active {
		background: rgba(192, 83, 60, 0.15);
		transform: scale(0.97);
	}

	.logout-text {
		font-size: 30rpx;
		font-weight: 600;
		color: #c0533c;
	}

	.delete-btn {
		height: 88rpx;
		border-radius: 48rpx;
		background: transparent;
		border: 2rpx solid rgba(192, 83, 60, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.delete-btn:active {
		background: rgba(192, 83, 60, 0.05);
		transform: scale(0.97);
	}

	.delete-text {
		font-size: 28rpx;
		font-weight: 500;
		color: rgba(192, 83, 60, 0.7);
	}

	.confirm-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(45, 30, 20, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.delete-modal-container {
		width: 560rpx;
		max-height: 900rpx;
		background: rgba(255, 249, 240, 0.96);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 48rpx 40rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 24rpx 80rpx rgba(146, 64, 14, 0.18), 0 8rpx 24rpx rgba(141, 75, 0, 0.08);
	}

	.delete-modal-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #2a1f15;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
		text-align: center;
		margin-bottom: 24rpx;
	}

	.delete-modal-warning {
		font-size: 28rpx;
		color: #c0533c;
		display: block;
		text-align: center;
		margin-bottom: 32rpx;
		line-height: 1.6;
	}

	.delete-modal-tip {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 24rpx;
	}

	.tip-text {
		font-size: 26rpx;
		color: #887364;
	}

	.tip-text .highlight {
		color: #c0533c;
		font-weight: 600;
	}

	.delete-input {
		width: 100%;
		height: 88rpx;
		background: rgba(255, 248, 235, 0.8);
		border-radius: 48rpx;
		padding: 0 32rpx;
		font-size: 28rpx;
		color: #2a1f15;
		border: 2rpx solid rgba(141, 75, 0, 0.08);
		margin-bottom: 32rpx;
		text-align: center;
		box-sizing: border-box;
	}

	.delete-input::placeholder {
		color: rgba(136, 115, 100, 0.4);
	}

	.delete-input:disabled {
		background: rgba(254, 244, 233, 0.85);
	}

	.delete-modal-btn-row {
		display: flex;
		gap: 24rpx;
	}

	.delete-modal-btn {
		flex: 1;
		height: 88rpx;
		border-radius: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;

		&.cancel {
			background: rgba(141, 75, 0, 0.08);
		}

		&.confirm {
			background: #c0533c;
		}

		&.disabled {
			opacity: 0.5;
			pointer-events: none;
		}
	}

	.delete-modal-btn-text {
		font-size: 30rpx;
		font-weight: 600;

		.cancel & {
			color: #887364;
		}

		.confirm & {
			color: #ffffff;
		}
	}
</style>
