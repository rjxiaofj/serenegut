<template>
	<view v-if="visible" class="picker-mask" @click="handleMaskClick">
		<view class="picker-container" @click.stop>
			<view class="picker-header">
				<text class="picker-cancel" @click="handleCancel">取消</text>
				<text class="picker-title">{{ title }}</text>
				<text class="picker-confirm" @click="handleConfirm">确定</text>
			</view>
			<view class="time-picker-content">
				<view class="time-display">
					<text class="time-value">{{ displayTime }}</text>
				</view>
				<view class="picker-wrapper">
					<!-- 选中区域高亮指示器 -->
					<view class="picker-selection-bar"></view>
					<picker-view class="time-picker-view" :value="pickerValue" @change="onPickerChange">
						<picker-view-column v-if="showHours">
							<view v-for="hour in hours" :key="hour" class="time-picker-item">{{ hour }}时</view>
						</picker-view-column>
						<picker-view-column>
							<view v-for="minute in minutes" :key="minute" class="time-picker-item">{{ minute }}分</view>
						</picker-view-column>
						<picker-view-column v-if="showSeconds">
							<view v-for="second in seconds" :key="second" class="time-picker-item">{{ second }}秒</view>
						</picker-view-column>
					</picker-view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'TimePicker',
		props: {
			visible: {
				type: Boolean,
				default: false
			},
			title: {
				type: String,
				default: '选择时间'
			},
			value: {
				type: Number,
				default: 0
			},
			maxHours: {
				type: Number,
				default: 23
			},
			showSeconds: {
				type: Boolean,
				default: false
			},
			showHours: {
				type: Boolean,
				default: true
			}
		},
		emits: ['update:visible', 'confirm', 'cancel'],
		data() {
			return {
				tempHours: 0,
				tempMinutes: 0,
				tempSeconds: 0,
				pickerValue: [0, 0, 0]
			}
		},
		computed: {
			hours() {
				return Array.from({ length: this.maxHours + 1 }, (_, i) => i)
			},
			minutes() {
				return Array.from({ length: 60 }, (_, i) => i)
			},
			seconds() {
				return Array.from({ length: 60 }, (_, i) => i)
			},
			displayTime() {
				if (this.showSeconds) {
					if (this.showHours) {
						return `${this.tempHours}时${this.tempMinutes}分${this.tempSeconds}秒`
					}
					return `${this.tempMinutes}分${this.tempSeconds}秒`
				}
				return `${String(this.tempHours).padStart(2, '0')}:${String(this.tempMinutes).padStart(2, '0')}`
			}
		},
		watch: {
			visible(newVal) {
				if (newVal) {
					this.initValue()
				}
			},
			value() {
				if (this.visible) {
					this.initValue()
				}
			}
		},
		methods: {
			initValue() {
				const totalSeconds = this.value
				this.tempHours = Math.floor(totalSeconds / 3600)
				this.tempMinutes = Math.floor((totalSeconds % 3600) / 60)
				this.tempSeconds = totalSeconds % 60
				if (this.showHours) {
					if (this.showSeconds) {
						this.pickerValue = [this.tempHours, this.tempMinutes, this.tempSeconds]
					} else {
						this.pickerValue = [this.tempHours, this.tempMinutes]
					}
				} else {
					if (this.showSeconds) {
						this.pickerValue = [this.tempMinutes, this.tempSeconds]
					} else {
						this.pickerValue = [this.tempMinutes]
					}
				}
			},
			onPickerChange(e) {
				const val = e.detail.value
				let index = 0
				if (this.showHours) {
					this.tempHours = this.hours[val[index++]]
				}
				this.tempMinutes = this.minutes[val[index++]]
				if (this.showSeconds && val[index] !== undefined) {
					this.tempSeconds = this.seconds[val[index]]
				}
			},
			handleMaskClick() {
				this.$emit('update:visible', false)
				this.$emit('cancel')
			},
			handleCancel() {
				this.$emit('update:visible', false)
				this.$emit('cancel')
			},
			handleConfirm() {
				const totalSeconds = this.tempHours * 3600 + this.tempMinutes * 60 + (this.showSeconds ? this.tempSeconds : 0)
				this.$emit('update:visible', false)
				this.$emit('confirm', totalSeconds)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.picker-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(45, 30, 20, 0.45);
		display: flex;
		align-items: flex-end;
		z-index: 1000;
	}

	.picker-container {
		width: 100%;
		background: rgba(255, 249, 240, 0.96);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx 48rpx 0 0;
		overflow: hidden;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 24rpx 80rpx rgba(146, 64, 14, 0.18), 0 8rpx 24rpx rgba(141, 75, 0, 0.08);
	}

	.picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 32rpx;
		border-bottom: 1px solid rgba(141, 75, 0, 0.08);
	}

	.picker-cancel {
		font-size: 28rpx;
		color: #887364;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.picker-cancel:active {
		transform: scale(0.97);
	}

	.picker-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.picker-confirm {
		font-size: 28rpx;
		font-weight: 600;
		color: #8d4b00;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.picker-confirm:active {
		transform: scale(0.97);
	}

	.time-picker-view {
		height: 400rpx;
		position: relative;
		z-index: 1;
	}

	.time-picker-item {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		color: #2a1f15;
	}

	.time-picker-content {
		padding: 32rpx;
	}

	.time-display {
		text-align: center;
		margin-bottom: 32rpx;
		padding: 24rpx;
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.06) 0%, rgba(177, 95, 0, 0.04) 100%);
		border-radius: 32rpx;
		border: 1rpx solid rgba(141, 75, 0, 0.1);
	}

	.time-value {
		font-size: 56rpx;
		font-weight: 700;
		color: #8d4b00;
		letter-spacing: 4rpx;
	}

	/* 滚动选择器外层容器 */
	.picker-wrapper {
		position: relative;
		border-radius: 24rpx;
		overflow: hidden;
	}

	/* 选中区域高亮指示条 */
	.picker-selection-bar {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 80rpx;
		transform: translateY(-50%);
		background: rgba(141, 75, 0, 0.08);
		border-top: 2rpx solid rgba(141, 75, 0, 0.15);
		border-bottom: 2rpx solid rgba(141, 75, 0, 0.15);
		pointer-events: none;
		z-index: 0;
	}
</style>