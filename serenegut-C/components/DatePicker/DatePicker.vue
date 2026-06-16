<template>
	<view class="date-picker-wrapper">
		<view class="date-trigger" :class="{ disabled: locked }" @click="openPicker">
			<text :class="['date-value', { placeholder: !displayValue }]">{{ displayValue || placeholder }}</text>
		<text v-if="locked" class="date-lock-tip">（已锁定）</text>
			<text class="date-arrow">›</text>
		</view>

		<view v-if="visible" class="picker-mask" @click="closePicker">
			<view class="picker-container" @click.stop>
				<view class="picker-header">
					<text class="picker-cancel" @click="closePicker">取消</text>
					<text class="picker-title">{{ title }}</text>
					<text class="picker-confirm" @click="confirmPicker">确定</text>
				</view>
				<view class="picker-body">
					<picker-view
						:indicator-style="indicatorStyle"
						:value="pickerValue"
						@change="onPickerChange"
						class="picker-view"
					>
						<picker-view-column>
							<view v-for="year in years" :key="year" class="picker-item">
								<text>{{ year }}年</text>
							</view>
						</picker-view-column>
						<picker-view-column>
							<view v-for="month in months" :key="month" class="picker-item">
								<text>{{ month }}月</text>
							</view>
						</picker-view-column>
						<picker-view-column>
							<view v-for="day in days" :key="day" class="picker-item">
								<text>{{ day }}日</text>
							</view>
						</picker-view-column>
					</picker-view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'DatePicker',
		props: {
			/* Vue 3 v-model 使用 modelValue，兼容 Vue 2 的 value */
			modelValue: {
				type: String,
				default: ''
			},
			value: {
				type: String,
				default: ''
			},
			placeholder: {
				type: String,
				default: '请选择日期'
			},
			title: {
				type: String,
				default: '选择日期'
			},
			startYear: {
				type: Number,
				default: 1940
			},
			endYear: {
				type: Number,
				default: () => new Date().getFullYear()
			},
			startDate: {
				type: String,
				default: ''
			},
			endDate: {
				type: String,
				default: ''
			},
			locked: {
				type: Boolean,
				default: false
			}
		},
		data() {
			const currentYear = new Date().getFullYear()
			const years = []
			for (let y = this.startYear; y <= this.endYear; y++) {
				years.push(y)
			}
			return {
				visible: false,
				years,
				months: Array.from({ length: 12 }, (_, i) => i + 1),
				pickerValue: [60, 0, 0],
				tempYear: 1990,
				tempMonth: 1,
				tempDay: 1,
				indicatorStyle: 'height: 80rpx;'
			}
		},
		computed: {
			/* 兼容 Vue 3 modelValue 和 Vue 2 value */
			currentValue() {
				return this.modelValue || this.value || ''
			},
			displayValue() {
				return this.currentValue
			},
			days() {
				const daysInMonth = new Date(this.tempYear, this.tempMonth, 0).getDate()
				return Array.from({ length: daysInMonth }, (_, i) => i + 1)
			}
		},
		methods: {
			openPicker() {
				if (this.locked) return
				let y, m, d
				if (this.currentValue) {
					const parts = this.currentValue.split('-')
					y = parseInt(parts[0]) || 1990
					m = parseInt(parts[1]) || 1
					d = parseInt(parts[2]) || 1
				} else {
					y = 1990
					m = 1
					d = 1
				}
				this.tempYear = y
				this.tempMonth = m
				this.tempDay = d
				const yearIdx = Math.max(0, this.years.indexOf(y))
				const monthIdx = m - 1
				const dayIdx = d - 1
				this.pickerValue = [yearIdx, monthIdx, dayIdx]
				this.visible = true
			},
			closePicker() {
				this.visible = false
			},
			onPickerChange(e) {
				const val = e.detail.value
				this.tempYear = this.years[val[0]] || this.years[0]
				this.tempMonth = val[1] + 1
				this.tempDay = val[2] + 1

				// 修正天数超出范围
				const maxDay = new Date(this.tempYear, this.tempMonth, 0).getDate()
				if (this.tempDay > maxDay) {
					this.tempDay = maxDay
				}
			},
			confirmPicker() {
				const result = `${this.tempYear}-${String(this.tempMonth).padStart(2, '0')}-${String(this.tempDay).padStart(2, '0')}`

				// 范围验证
				if (this.startDate && result < this.startDate) {
					uni.showToast({ title: `不能早于 ${this.startDate}`, icon: 'none' })
					return
				}
				if (this.endDate && result > this.endDate) {
					uni.showToast({ title: `不能晚于 ${this.endDate}`, icon: 'none' })
					return
				}

				/* Vue 3 使用 update:modelValue，Vue 2 使用 input */
				this.$emit('update:modelValue', result)
				this.$emit('input', result)
				this.$emit('change', result)
				this.visible = false
			}
		}
	}
</script>

<style lang="scss" scoped>
	.date-picker-wrapper {
		width: 100%;
	}

	.date-trigger {
		width: 100%;
		height: 96rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 32rpx;
		box-sizing: border-box;
		background: rgba(141, 75, 0, 0.04);
		border-radius: 32rpx;
		border: 2rpx solid rgba(141, 75, 0, 0.08);

		&:active {
			background: rgba(141, 75, 0, 0.08);
		}

		&.disabled {
			opacity: 0.6;
		}
	}

	.date-lock-tip {
		font-size: 20rpx;
		color: #887364;
		font-weight: 400;
	}

	.date-value {
		font-size: 30rpx;
		font-weight: 600;
		color: #2a1f15;

		&.placeholder {
			color: #c4b5a5;
			font-weight: 400;
		}
	}

	.date-arrow {
		font-size: 40rpx;
		color: #887364;
		line-height: 1;
	}

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
		background: #ffffff;
		border-radius: 32rpx 32rpx 0 0;
		overflow: hidden;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 32rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.picker-cancel {
		font-size: 30rpx;
		color: #887364;
	}

	.picker-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.picker-confirm {
		font-size: 30rpx;
		font-weight: 700;
		color: #8d4b00;
	}

	.picker-body {
		padding: 16rpx 0;
	}

	.picker-view {
		height: 400rpx;
	}

	.picker-item {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		color: #2a1f15;
	}
</style>
