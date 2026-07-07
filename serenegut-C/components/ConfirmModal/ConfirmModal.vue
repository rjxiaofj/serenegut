<template>
	<view v-if="visible" class="confirm-mask" @click="handleMaskClick">
		<view class="confirm-container" @click.stop>
			<text class="confirm-title">{{ title }}</text>
			<text class="confirm-content">{{ content }}</text>
			<view class="confirm-btn-row">
				<!-- 取消按钮：showCancel 为 false 时不渲染，确认按钮自动占满宽度 -->
				<view v-if="showCancel" class="confirm-btn cancel" @click="handleCancel">
					<text class="confirm-btn-text">{{ cancelText }}</text>
				</view>
				<!-- 确认按钮：danger 为 true 时附加 danger 样式类 -->
				<view class="confirm-btn confirm" :class="{ danger: danger }" @click="handleConfirm">
					<text class="confirm-btn-text">{{ confirmText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'ConfirmModal',
		props: {
			visible: {
				type: Boolean,
				default: false
			},
			title: {
				type: String,
				default: '提示'
			},
			content: {
				type: String,
				default: ''
			},
			confirmText: {
				type: String,
				default: '确定'
			},
			cancelText: {
				type: String,
				default: '取消'
			},
			closeOnMask: {
				type: Boolean,
				default: true
			},
			// 是否显示取消按钮，false 时仅展示确认按钮（用于提示类弹窗）
			showCancel: {
				type: Boolean,
				default: true
			},
			// 是否为危险操作，true 时确认按钮变为红色渐变
			danger: {
				type: Boolean,
				default: false
			}
		},
		methods: {
			handleMaskClick() {
				if (this.closeOnMask) {
					this.$emit('cancel')
				}
			},
			handleCancel() {
				this.$emit('cancel')
			},
			handleConfirm() {
				this.$emit('confirm')
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
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 24rpx 80rpx rgba(146, 64, 14, 0.18), 0 8rpx 24rpx rgba(141, 75, 0, 0.08);
	}

	.confirm-title {
		font-size: 34rpx;
		font-weight: 700;
		color: #2a1f15;
		display: block;
		text-align: center;
		margin-bottom: 24rpx;
	}

	.confirm-content {
		font-size: 28rpx;
		color: #887364;
		display: block;
		text-align: center;
		margin-bottom: 40rpx;
		line-height: 1.6;
	}

	.confirm-btn-row {
		display: flex;
		gap: 24rpx;
	}

	.confirm-btn {
		flex: 1;
		height: 88rpx;
		border-radius: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&.cancel {
			background: rgba(136, 115, 100, 0.1);
		}

		&.confirm {
			background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
			box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		}

		/* 危险操作模式：确认按钮使用红色渐变和红色阴影 */
		&.confirm.danger {
			background: linear-gradient(135deg, #c53535 0%, #e0584c 100%);
			box-shadow: 0 8rpx 24rpx rgba(197, 53, 53, 0.20), 0 2rpx 6rpx rgba(197, 53, 53, 0.12);
		}

		&:active {
			transform: scale(0.97);
		}
	}

	.confirm-btn-text {
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