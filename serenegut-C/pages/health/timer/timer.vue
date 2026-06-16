<template>
	<view class="page-container">
		<custom-nav title="正在记录" showBack />
		<ConfirmModal
			:visible="showConfirmModal"
			:title="confirmModalTitle"
			:content="confirmModalContent"
			:confirmText="confirmModalConfirmText"
			:cancelText="confirmModalCancelText"
			@confirm="confirmCancel"
			@cancel="closeConfirmModal"
		/>
		<!-- Main Content -->
		<view class="main-content">
			<!-- Background Effects -->
			<view class="bg-blur bg-blur-primary"></view>
			<view class="bg-blur bg-blur-secondary"></view>

			<!-- Timer Section -->
			<view class="timer-section">
				<!-- Outer Rotating Ring -->
				<view class="timer-container">
					<view class="outer-ring">
						<view class="ring-marker marker-top"></view>
						<view class="ring-marker marker-bottom"></view>
						<view class="ring-marker marker-left"></view>
						<view class="ring-marker marker-right"></view>
					</view>

					<!-- Breathing Halo -->
					<view class="breathing-halo"></view>

					<!-- Inner Timer Glass -->
					<view class="timer-glass">
						<text class="timer-value">{{ formatTime(seconds) }}</text>
						<text class="timer-unit">秒</text>
					</view>
				</view>

				<!-- Status Labels -->
				<view class="status-section">
					<text class="status-title">正在记录中...</text>
					<text class="status-desc">静心感受，与身体共鸣。我们正在用心记录这一刻的健康律动。</text>
				</view>
			</view>
		</view>

		<!-- Bottom Action Button -->
		<view class="bottom-action">
			<view class="action-btn" @click="completeRecord">
				<text class="btn-text">完成记录</text>
				<AppIcon name="check" color="white" :size="32" />
			</view>
			<view class="home-indicator"></view>
		</view>

	</view>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'

	export default {
		name: 'Timer',
		components: {
			ConfirmModal,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				seconds: 0,
				timer: null,
				pageIcons: {
					left: '/static/images/other-icons/left.png',
					right: '/static/images/other-icons/right.png'
				},
				showConfirmModal: false,
				confirmModalTitle: '',
				confirmModalContent: '',
				confirmModalConfirmText: '确定',
				confirmModalCancelText: '取消'
			}
		},
		onLoad() {
			this.startTimer()
		},
		onUnload() {
			this.stopTimer()
		},
		methods: {
			startTimer() {
				this.timer = setInterval(() => {
					this.seconds++
				}, 1000)
			},
			stopTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},
			formatTime(totalSeconds) {
				const mins = Math.floor(totalSeconds / 60)
				const secs = totalSeconds % 60
				return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
			},
			goBack() {
				if (this.seconds > 0) {
					this.confirmModalTitle = '提示'
					this.confirmModalContent = '确定要结束计时吗？本次计时将不会被记录。'
					this.confirmModalConfirmText = '确定结束'
					this.confirmModalCancelText = '继续记录'
					this.showConfirmModal = true
				} else {
					this.stopTimer()
					uni.navigateBack()
				}
			},
			closeConfirmModal() {
				this.showConfirmModal = false
			},
			confirmCancel() {
				this.stopTimer()
				uni.navigateBack()
			},
			completeRecord() {
				this.stopTimer()
				const duration = this.seconds
				uni.navigateTo({
					url: `/pages/health/record/record?duration=${duration}`
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page-container {
		min-height: 100vh;
		background: #fef8f3;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.main-content {
		padding-top: 32rpx;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-bottom: 200rpx;
		position: relative;
	}

	.bg-blur {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	.bg-blur-primary {
		width: 640rpx;
		height: 640rpx;
		background: rgba(141, 75, 0, 0.05);
		filter: blur(200rpx);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.bg-blur-secondary {
		width: 512rpx;
		height: 512rpx;
		background: rgba(154, 70, 20, 0.05);
		filter: blur(160rpx);
		bottom: 25%;
		right: 0;
	}

	.timer-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 80rpx;
		position: relative;
		z-index: 10;
	}

	.timer-container {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.outer-ring {
		position: absolute;
		width: 600rpx;
		height: 600rpx;
		border-radius: 50%;
		border: 1px solid rgba(141, 75, 0, 0.05);
		animation: rotate 60s linear infinite;
	}

	@keyframes rotate {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.ring-marker {
		position: absolute;
		background: rgba(141, 75, 0, 0.2);
	}

	.marker-top {
		top: 0;
		left: 50%;
		width: 8rpx;
		height: 24rpx;
		border-radius: 4rpx;
		transform: translateX(-50%);
	}

	.marker-bottom {
		bottom: 0;
		left: 50%;
		width: 8rpx;
		height: 24rpx;
		border-radius: 4rpx;
		transform: translateX(-50%);
	}

	.marker-left {
		left: 0;
		top: 50%;
		width: 24rpx;
		height: 8rpx;
		border-radius: 4rpx;
		transform: translateY(-50%);
	}

	.marker-right {
		right: 0;
		top: 50%;
		width: 24rpx;
		height: 8rpx;
		border-radius: 4rpx;
		transform: translateY(-50%);
	}

	.breathing-halo {
		position: absolute;
		width: 640rpx;
		height: 640rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.1) 0%, transparent 50%, rgba(154, 70, 20, 0.05) 100%);
		animation: breathing 6s ease-in-out infinite;
	}

	@keyframes breathing {
		0%, 100% {
			transform: scale(0.95);
			opacity: 0.3;
			filter: blur(80rpx);
		}
		50% {
			transform: scale(1.15);
			opacity: 0.8;
			filter: blur(120rpx);
		}
	}

	.timer-glass {
		width: 512rpx;
		height: 512rpx;
		border-radius: 50%;
		background: rgba(255, 248, 235, 0.25);
		backdrop-filter: blur(24rpx) saturate(1.08);
		-webkit-backdrop-filter: blur(24rpx) saturate(1.08);
		border: 1rpx solid rgba(255, 248, 235, 0.5);
		box-shadow:
			inset 0 0 40rpx rgba(255, 255, 255, 0.25),
			0 20rpx 60rpx -10rpx rgba(141, 75, 0, 0.10),
			0 40rpx 100rpx -20rpx rgba(141, 75, 0, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		z-index: 1;
		overflow: hidden;
	}

	.timer-glass::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 50%;
		background: linear-gradient(to bottom, rgba(255, 255, 255, 0.18), transparent);
		pointer-events: none;
	}

	.timer-value {
		font-size: 140rpx;
		font-weight: 500;
		color: #8d4b00;
		line-height: 1;
		letter-spacing: -4rpx;
	}

	.timer-unit {
		font-size: 24rpx;
		font-weight: 600;
		color: #554336;
		opacity: 0.8;
		letter-spacing: 12rpx;
		margin-top: 8rpx;
		text-transform: uppercase;
	}

	.status-section {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.status-title {
		font-size: 40rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.status-desc {
		font-size: 26rpx;
		color: #554336;
		max-width: 480rpx;
		line-height: 1.6;
	}

	.bottom-action {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 32rpx;
		background: #fefaf3;
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-top: 1rpx solid rgba(255, 220, 195, 0.4);
		box-shadow: 0 4rpx 20rpx rgba(146, 64, 14, 0.05);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24rpx;
		padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
		z-index: 50;
	}

	.action-btn {
		width: 100%;
		height: 100rpx;
		background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
		border-radius: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16rpx;
		box-shadow: 0 10rpx 30rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
		}
	}

	.btn-text {
		font-size: 34rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.btn-icon {
		font-size: 36rpx;
		font-weight: 700;
		color: #ffffff;
	}

	.home-indicator {
		width: 256rpx;
		height: 12rpx;
		background: rgba(29, 27, 25, 0.1);
		border-radius: 6rpx;
	}
</style>