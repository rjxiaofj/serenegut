<template>
	<view v-if="visible" class="input-modal-mask" @click="handleMaskClick">
		<view class="input-modal-container" @click.stop>
			<text class="input-modal-title">{{ title }}</text>
			<text v-if="desc" class="input-modal-desc">{{ desc }}</text>
			<view class="input-wrapper">
				<input
					class="input-field"
					type="number"
					:value="inputValue"
					:placeholder="placeholder"
					placeholder-class="input-placeholder"
					:focus="visible"
					@input="onInput"
				/>
				<text class="input-unit">{{ unit }}</text>
			</view>
			<view class="input-modal-btn-row">
				<view class="input-modal-btn cancel" @click="handleCancel">
					<text class="input-modal-btn-text">{{ cancelText }}</text>
				</view>
				<view class="input-modal-btn confirm" @click="handleConfirm">
					<text class="input-modal-btn-text">{{ confirmText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	/**
	 * InputModal 输入弹窗组件
	 * @description 与 ConfirmModal 相同主题风格的数字输入弹窗
	 */
	export default {
		name: 'InputModal',
		props: {
			visible: { type: Boolean, default: false },
			title: { type: String, default: '请输入' },
			desc: { type: String, default: '' },
			value: { type: [String, Number], default: '' },
			placeholder: { type: String, default: '请输入数值' },
			unit: { type: String, default: '' },
			confirmText: { type: String, default: '确定' },
			cancelText: { type: String, default: '取消' },
			min: { type: Number, default: 0 },
			max: { type: Number, default: 99999 },
			closeOnMask: { type: Boolean, default: true }
		},
		data() {
			return {
				inputValue: ''
			}
		},
		watch: {
			visible(val) {
				if (val) {
					this.inputValue = this.value !== 0 && this.value !== '' ? String(this.value) : ''
				}
			}
		},
		methods: {
			onInput(e) {
				this.inputValue = e.detail.value
			},
			handleMaskClick() {
				if (this.closeOnMask) {
					this.$emit('cancel')
				}
			},
			handleCancel() {
				this.$emit('cancel')
			},
			handleConfirm() {
				const val = parseInt(this.inputValue)
				if (isNaN(val)) {
					uni.showToast({ title: '请输入数字', icon: 'none' })
					return
				}
				if (val < this.min || val > this.max) {
					uni.showToast({ title: `请输入${this.min}-${this.max}的数值`, icon: 'none' })
					return
				}
				this.$emit('confirm', val)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.input-modal-mask {
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

	.input-modal-container {
		width: 560rpx;
		background: rgba(255, 249, 240, 0.96);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 48rpx 40rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 24rpx 80rpx rgba(146, 64, 14, 0.18), 0 8rpx 24rpx rgba(141, 75, 0, 0.08);
	}

	.input-modal-title {
		font-size: 34rpx;
		font-weight: 700;
		color: #2a1f15;
		display: block;
		text-align: center;
		margin-bottom: 16rpx;
	}

	.input-modal-desc {
		font-size: 24rpx;
		color: #887364;
		display: block;
		text-align: center;
		margin-bottom: 32rpx;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		background: rgba(255, 248, 235, 0.6);
		border: 2rpx solid rgba(141, 75, 0, 0.12);
		border-radius: 32rpx;
		padding: 0 32rpx;
		height: 96rpx;
		margin-bottom: 40rpx;
		transition: border-color 0.3s;

		&:focus-within {
			border-color: rgba(141, 75, 0, 0.4);
		}
	}

	.input-field {
		flex: 1;
		font-size: 36rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.input-placeholder {
		color: #c4b5a5;
		font-weight: 400;
	}

	.input-unit {
		font-size: 28rpx;
		color: #887364;
		font-weight: 600;
		margin-left: 16rpx;
	}

	.input-modal-btn-row {
		display: flex;
		gap: 24rpx;
	}

	.input-modal-btn {
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

		&:active {
			transform: scale(0.97);
		}
	}

	.input-modal-btn-text {
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
