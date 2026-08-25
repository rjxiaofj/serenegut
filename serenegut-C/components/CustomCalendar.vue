<template>
	<view class="calendar-card">
		<view class="calendar-header">
			<view class="calendar-title-wrap" @click="showDatePicker">
				<text class="calendar-title">{{ currentYear }}年 {{ currentMonth }}月</text>
				<text class="calendar-arrow">▼</text>
			</view>
			<view class="calendar-nav">
				<view class="nav-btn" @click="prevMonth">
					<image :src="pageIcons.left" class="nav-icon" mode="aspectFit" />
				</view>
				<view class="nav-btn" @click="nextMonth">
					<image :src="pageIcons.right" class="nav-icon" mode="aspectFit" />
				</view>
			</view>
		</view>
		<view class="calendar-weekdays">
			<text v-for="day in weekdays" :key="day" class="weekday">{{ day }}</text>
		</view>
		<view class="calendar-days">
			<view
				v-for="(day, index) in calendarDays"
				:key="index"
				:class="['calendar-day', { 
					tracked: day.isTracked,
					empty: !day.day,
					other: day.isOtherMonth
				}]"
				@click="day.day && !day.isOtherMonth && onDayClick(day.day)"
			>
				<text v-if="day.day" class="day-number">{{ day.day }}</text>
				<view v-if="day.isTracked" class="tracked-dot"></view>
			</view>
		</view>
	</view>

	<view v-if="showPicker" class="picker-mask" @click="closeDatePicker">
		<view class="picker-container" @click.stop>
			<view class="picker-header">
				<text class="picker-cancel" @click="closeDatePicker">取消</text>
				<text class="picker-title">选择月份</text>
				<text class="picker-confirm" @click="confirmDatePicker">确定</text>
			</view>
			<picker-view 
				class="picker-view"
				:value="pickerValue"
				@change="onPickerChange"
			>
				<picker-view-column>
					<view v-for="year in years" :key="year" class="picker-item">{{ year }}年</view>
				</picker-view-column>
				<picker-view-column>
					<view v-for="month in months" :key="month" class="picker-item">{{ month }}月</view>
				</picker-view-column>
			</picker-view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'CustomCalendar',
		props: {
			trackedDays: {
				type: Array,
				default: () => []
			},
			initialYear: {
				type: Number,
				default: new Date().getFullYear()
			},
			initialMonth: {
				type: Number,
				default: new Date().getMonth() + 1
			},
			pageIcons: {
				type: Object,
				default: () => ({})
			}
		},
		emits: ['dayClick', 'monthChange'],
		data() {
			return {
				currentYear: this.initialYear,
				currentMonth: this.initialMonth,
				weekdays: ['日', '一', '二', '三', '四', '五', '六'],
				years: [],
				months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
				showPicker: false,
				pickerValue: [0, 0],
				tempYear: this.initialYear,
				tempMonth: this.initialMonth
			}
		},
		created() {
			this.initYears()
		},
		computed: {
			calendarDays() {
				const days = []
				const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1)
				const lastDay = new Date(this.currentYear, this.currentMonth, 0)
				const daysInMonth = lastDay.getDate()
				const startWeekday = firstDay.getDay()

				for (let i = 0; i < startWeekday; i++) {
					days.push({ day: null, isOtherMonth: true })
				}

				for (let i = 1; i <= daysInMonth; i++) {
					days.push({
						day: i,
						isTracked: this.trackedDays.includes(i),
						isOtherMonth: false
					})
				}

				const remaining = 42 - days.length
				for (let i = 0; i < remaining; i++) {
					days.push({ day: null, isOtherMonth: true })
				}

				return days
			}
		},
		methods: {
			initYears() {
				const currentYear = new Date().getFullYear()
				for (let i = currentYear - 10; i <= currentYear + 10; i++) {
					this.years.push(i)
				}
			},
			prevMonth() {
				if (this.currentMonth === 1) {
					this.currentYear--
					this.currentMonth = 12
				} else {
					this.currentMonth--
				}
				this.$emit('monthChange', { year: this.currentYear, month: this.currentMonth })
			},
			nextMonth() {
				if (this.currentMonth === 12) {
					this.currentYear++
					this.currentMonth = 1
				} else {
					this.currentMonth++
				}
				this.$emit('monthChange', { year: this.currentYear, month: this.currentMonth })
			},
			onDayClick(day) {
				const today = new Date()
				const todayYear = today.getFullYear()
				const todayMonth = today.getMonth() + 1
				const todayDay = today.getDate()
				
				if (this.currentYear > todayYear || 
					(this.currentYear === todayYear && this.currentMonth > todayMonth) ||
					(this.currentYear === todayYear && this.currentMonth === todayMonth && day > todayDay)) {
					uni.showToast({
						title: '还没有到时间，不允许记录',
						icon: 'none'
					})
					return
				}
				
				this.$emit('dayClick', { 
					day, 
					year: this.currentYear, 
					month: this.currentMonth,
					isTracked: this.trackedDays.includes(day)
				})
			},
			showDatePicker() {
				const yearIndex = this.years.indexOf(this.currentYear)
				this.pickerValue = [yearIndex, this.currentMonth - 1]
				this.tempYear = this.currentYear
				this.tempMonth = this.currentMonth
				this.showPicker = true
			},
			closeDatePicker() {
				this.showPicker = false
			},
			onPickerChange(e) {
				const val = e.detail.value
				this.tempYear = this.years[val[0]]
				this.tempMonth = this.months[val[1]]
			},
			confirmDatePicker() {
				this.currentYear = this.tempYear
				this.currentMonth = this.tempMonth
				this.showPicker = false
				this.$emit('monthChange', { year: this.currentYear, month: this.currentMonth })
			},
			updateDate(year, month) {
				this.currentYear = year
				this.currentMonth = month
				this.$emit('monthChange', { year, month })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.calendar-card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 32rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32rpx;
	}

	.calendar-title-wrap {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.calendar-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.calendar-arrow {
		font-size: 20rpx;
		color: #887364;
	}

	.calendar-nav {
		display: flex;
		gap: 16rpx;
	}

	.nav-btn {
		width: 56rpx;
		height: 56rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fbf2ea;
		border-radius: 50%;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
		}
	}

	.nav-icon {
		width: 24rpx;
		height: 24rpx;
	}

	.calendar-weekdays {
		display: flex;
		margin-bottom: 20rpx;
	}

	.weekday {
		flex: 1;
		text-align: center;
		font-size: 24rpx;
		color: #887364;
	}

	.calendar-days {
		display: flex;
		flex-wrap: wrap;
	}

	.calendar-day {
		width: calc(100% / 7);
		height: 80rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;

		&.empty {
			pointer-events: none;
		}

		&.other {
			.day-number {
				color: rgba(141, 75, 0, 0.1);
			}
		}

		&.tracked {
			.day-number {
				background: #8d4b00;
				color: #fff;
				border-radius: 50%;
				width: 56rpx;
				height: 56rpx;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}
	}

	.day-number {
		font-size: 28rpx;
		color: #2a1f15;
	}

	.tracked-dot {
		width: 8rpx;
		height: 8rpx;
		background: #8d4b00;
		border-radius: 50%;
		position: absolute;
		bottom: 4rpx;
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
		background: rgba(255, 249, 240, 0.96);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 32rpx 32rpx 0 0;
		padding-bottom: env(safe-area-inset-bottom);
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 24rpx 80rpx rgba(146, 64, 14, 0.18), 0 8rpx 24rpx rgba(141, 75, 0, 0.08);
	}

	.picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24rpx 32rpx;
		border-bottom: 1rpx solid rgba(141, 75, 0, 0.08);
	}

	.picker-cancel, .picker-confirm {
		font-size: 28rpx;
		color: #8d4b00;
	}

	.picker-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.picker-view {
		height: 400rpx;
	}

	.picker-item {
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28rpx;
	}
</style>