<template>
	<view v-if="visible" class="confirm-mask" @click="handleMaskClick">
		<view class="confirm-container" @click.stop>
			<view class="floating-hearts">
				<AppIcon class="floating-heart" name="hearts" color="red" :size="24" />
				<AppIcon class="floating-heart" name="hearts" color="red" :size="18" />
				<AppIcon class="floating-heart" name="hearts" color="red" :size="16" />
				<AppIcon class="floating-heart" name="hearts" color="red" :size="20" />
				<AppIcon class="floating-heart" name="hearts" color="red" :size="14" />
			</view>

			<view class="close-btn" @click="handleClose">×</view>

			<view class="heart-wrapper">
				<view class="ripple"></view>
				<view class="ripple"></view>
				<view class="ripple"></view>
				<view class="heart-circle">
					<image src="/static/images/other-icons/love.png" class="heart-image" mode="aspectFit" />
				</view>
			</view>

			<view class="divider"></view>

			<view class="title">
				生理期要好好爱自己
			</view>

			<view class="subtitle">
				<text>大姨妈来了请不要乱生气~</text>
				<text>请给自己多一点温柔和关怀~</text>
			</view>

			<view class="confirm-btn" @click="handleConfirm">
				<text class="confirm-btn-text">我知道了</text>
			</view>
		</view>
	</view>
</template>

<script>
	import AppIcon from '@/components/AppIcon/AppIcon.vue'

	export default {
		name: 'MenstruationModal',
		components: { AppIcon },
		props: {
			visible: {
				type: Boolean,
				default: false
			}
		},
		methods: {
			handleMaskClick() {
				this.$emit('close')
			},
			handleClose() {
				this.$emit('close')
			},
			handleConfirm() {
				this.$emit('close')
			}
		}
	}
</script>

<style lang="scss" scoped>
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

	.confirm-container {
		width: 560rpx;
		background: rgba(255, 249, 240, 0.96);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 48rpx 40rpx;
		position: relative;
		overflow: hidden;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 32rpx rgba(233, 30, 99, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.floating-hearts {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		z-index: 1;
	}

	.floating-heart {
		position: absolute;
		color: #e91e63;
		opacity: 0.15;
		font-size: 24rpx;
		animation: float 3s ease-in-out infinite;

		&:nth-child(1) {
			top: 20rpx;
			left: 20rpx;
			animation-delay: 0s;
		}

		&:nth-child(2) {
			top: 60rpx;
			right: 25rpx;
			animation-delay: 0.8s;
			font-size: 18rpx;
		}

		&:nth-child(3) {
			top: 140rpx;
			left: 15rpx;
			animation-delay: 1.6s;
			font-size: 16rpx;
		}

		&:nth-child(4) {
			top: 200rpx;
			right: 20rpx;
			animation-delay: 1.2s;
			font-size: 20rpx;
		}

		&:nth-child(5) {
			top: 100rpx;
			right: 50rpx;
			animation-delay: 0.4s;
			font-size: 14rpx;
		}
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0);
			opacity: 0.1;
		}
		50% {
			transform: translateY(-12rpx);
			opacity: 0.2;
		}
	}

	.close-btn {
		position: absolute;
		top: 16rpx;
		right: 16rpx;
		width: 32rpx;
		height: 32rpx;
		border-radius: 50%;
		background: #fce4ec;
		color: #e91e63;
		font-size: 18rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		z-index: 10;
	}

	.heart-wrapper {
		position: relative;
		width: 110rpx;
		height: 110rpx;
		margin: 0 auto 28rpx;
		z-index: 2;
	}

	.heart-circle {
		width: 110rpx;
		height: 110rpx;
		background: linear-gradient(135deg, #f48fb1 0%, #e91e63 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(233, 30, 99, 0.16);
		position: relative;
		z-index: 2;
	}

	.heart-image {
		width: 48rpx;
		height: 48rpx;
	}

	.ripple {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 110rpx;
		height: 110rpx;
		border-radius: 50%;
		border: 2rpx solid rgba(233, 30, 99, 0.3);
		z-index: 1;
		animation: ripple 2s ease-out infinite;

		&:nth-child(2) {
			animation-delay: 0.6s;
		}

		&:nth-child(3) {
			animation-delay: 1.2s;
		}
	}

	@keyframes ripple {
		0% {
			width: 110rpx;
			height: 110rpx;
			opacity: 0.6;
		}
		100% {
			width: 170rpx;
			height: 170rpx;
			opacity: 0;
		}
	}

	.divider {
		width: 48rpx;
		height: 4rpx;
		background: #f8bbd0;
		border-radius: 2rpx;
		margin: 0 auto 22rpx;
		position: relative;
		z-index: 2;
	}

	.title {
		font-size: 28rpx;
		font-weight: 700;
		color: #c2185b;
		margin-bottom: 10rpx;
		letter-spacing: 1rpx;
		text-align: center;
		position: relative;
		z-index: 2;
	}

	.subtitle {
		font-size: 24rpx;
		color: #e91e63;
		line-height: 1.8;
		font-weight: 400;
		margin-bottom: 32rpx;
		text-align: center;
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}

	.confirm-btn {
		width: 100%;
		padding: 20rpx 0;
		background: linear-gradient(135deg, #f48fb1 0%, #e91e63 100%);
		color: #fff;
		border-radius: 48rpx;
		font-size: 28rpx;
		font-weight: 600;
		letter-spacing: 2rpx;
		text-align: center;
		box-shadow: 0 6rpx 20rpx rgba(233, 30, 99, 0.16);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		z-index: 2;

		&:active {
			transform: scale(0.97);
		}
	}

	.confirm-btn-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #ffffff;
	}
</style>