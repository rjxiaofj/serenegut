<template>
	<view class="page-container-no-tab">
		<custom-nav title="统计" showBack />
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
			<view class="tab-bar">
				<view 
					:class="['tab-item', { active: activeTab === 'week' }]"
					@click="activeTab = 'week'"
				>
					<text class="tab-text">周</text>
				</view>
				<view 
					:class="['tab-item', { active: activeTab === 'month' }]"
					@click="activeTab = 'month'"
				>
					<text class="tab-text">月</text>
				</view>
			</view>

			<view v-if="activeTab === 'month'" class="calendar-section">
				<CustomCalendar 
					:trackedDays="recordedDays"
					:initialYear="currentYear"
					:initialMonth="currentMonth"
					:pageIcons="pageIcons"
					@dayClick="onDayClick"
					@monthChange="onMonthChange"
				/>
				<view class="calendar-legend">
				<view class="legend-item">
					<view class="legend-dot primary"></view>
					<text class="legend-text">已排便</text>
				</view>
			</view>
			</view>

			<view v-else class="week-section">
				<view class="week-card">
					<view class="week-header">
						<view class="week-header-left">
							<text class="week-title">本周趋势</text>
							<text class="week-date">{{ weekDateRange }}</text>
						</view>
					</view>
					<view class="chart-container">
						<view 
							v-for="(item, index) in weeklyData" 
							:key="item.day" 
							:class="['chart-item', { selected: selectedWeekIndex === index }]"
							@click="onWeekDayClick(index)"
						>
							<view class="chart-bar-wrapper">
								<text class="chart-count" v-if="item.count > 0">{{ item.count }}</text>
								<view class="chart-bar" :style="{ height: item.value + 'rpx' }"></view>
							</view>
							<text class="chart-label">{{ item.day }}</text>
						</view>
					</view>
					<view class="week-summary">
						<view class="summary-row">
							<text class="summary-label">平均频率</text>
							<text class="summary-value">{{ averageFrequency }}</text>
						</view>
						<view class="summary-row">
							<text class="summary-label">最活跃时间段</text>
							<text class="summary-value">{{ mostActiveTimeRange }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="timeline-section">
				<view class="timeline-header">
					<text class="section-title">{{ timelineTitle }}</text>
					<!-- 新增记录按钮：跳转到记录页，可新增其他时间的记录 -->
					<view class="add-record-btn" @click="goToAddRecord">
						<text class="add-record-text">+ 新增</text>
					</view>
				</view>
				<view class="timeline" v-if="selectedDate && selectedDateRecords.length > 0">
					<view class="timeline-item" v-for="(record, index) in selectedDateRecords" :key="index">
						<view class="timeline-dot"></view>
						<view class="timeline-content">
							<text class="timeline-time">{{ formatDuration(record.duration) }}</text>
							<text class="timeline-type">{{ record.type }}</text>
							<view class="timeline-meta">
								<view class="meta-item">
									<AppIcon name="palette" :size="22" />
									<text>{{ record.color }}</text>
								</view>
								<text class="meta-item">{{ record.status }}</text>
							</view>
							<view class="timeline-note" v-if="record.note">
								{{ record.note }}
							</view>
						</view>
					</view>
				</view>
				<view class="timeline-empty" v-else-if="selectedDate">
					<text class="empty-text">暂无记录</text>
				</view>
				<view class="timeline-empty" v-else>
					<text class="empty-text">请选择日期查看记录</text>
				</view>
			</view>
		</view>

		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import CustomCalendar from '@/components/CustomCalendar.vue'
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { recordApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Statistics',
		components: {
			CustomCalendar,
			ConfirmModal,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				activeTab: 'week',
				recordedDays: [],
				records: {},
				selectedDate: null,
				selectedDateRecords: [],
				selectedWeekIndex: null,
				currentYear: new Date().getFullYear(),
				currentMonth: new Date().getMonth() + 1,
				weeklyData: [],
				showConfirmModal: false,
				confirmModalTitle: '',
				confirmModalContent: '',
				confirmModalConfirmText: '确定',
				confirmModalCancelText: '取消',
				confirmModalCallback: null,
				pageIcons: {},
				averageFrequency: '0 次/天',
				mostActiveTimeRange: '暂无数据'
			}
		},
		computed: {
			/* 时间线标题：根据当前视图和选择状态动态生成 */
			timelineTitle() {
				if (this.selectedDate) {
					return `${this.currentMonth}月${this.selectedDate}日 详细记录`
				}
				if (this.activeTab === 'week') {
					return '点击趋势图查看当日记录'
				}
				return '请选择日期查看记录'
			},
			days() {
				return Array.from({ length: new Date(this.currentYear, this.currentMonth, 0).getDate() }, (_, i) => i + 1)
			},
			years() {
				const currentYear = new Date().getFullYear()
				const years = []
				for (let i = currentYear - 10; i <= currentYear + 10; i++) {
					years.push(i)
				}
				return years
			},
			months() {
				return Array.from({ length: 12 }, (_, i) => i + 1)
			},
			weekDateRange() {
				const today = new Date()
				const dayOfWeek = today.getDay() || 7
				const monday = new Date(today)
				monday.setDate(today.getDate() - dayOfWeek + 1)
				const sunday = new Date(monday)
				sunday.setDate(monday.getDate() + 6)
				return `${String(monday.getMonth() + 1).padStart(2, '0')}.${String(monday.getDate()).padStart(2, '0')} - ${String(sunday.getMonth() + 1).padStart(2, '0')}.${String(sunday.getDate()).padStart(2, '0')}`
			}
		},
		onLoad() {
			this.loadPageIcons()
			this.loadRecords()
			uni.$on('recordSaved', () => {
				this.loadRecords()
			})
		},
		onShow() {
			this.loadRecords()
		},
		onUnload() {
			uni.$off('recordSaved')
		},
		methods: {
			goBack() {
				uni.navigateBack()
			},
			async loadRecords() {
				const userId = uni.getStorageSync('userId')
				if (!userId) return

				/* 使用 API 服务层获取月度记录 */
				try {
					const res = await recordApi.get({ userId, year: this.currentYear, month: this.currentMonth })
					if (res.code === 0) {
						const records = res.data
						this.processRecords(records)
						this.selectToday()
					}
				} catch (err) {
					console.error('获取记录失败:', err)
				}

				this.loadWeekRecords()
			},
			async loadWeekRecords() {
				const userId = uni.getStorageSync('userId')
				if (!userId) return

				const today = new Date()
				const dayOfWeek = today.getDay() || 7
				const monday = new Date(today)
				monday.setDate(today.getDate() - dayOfWeek + 1)
				const sunday = new Date(monday)
				sunday.setDate(monday.getDate() + 6)

				/* 使用 API 服务层获取本周记录 */
				try {
					const res = await recordApi.get({
						userId,
						startDate: monday.toISOString(),
						endDate: sunday.toISOString()
					})
					if (res.code === 0) {
						const records = res.data
						this.generateWeeklyData(records)
					}
				} catch (err) {
					console.error('获取周记录失败', err)
				}
			},
			selectToday() {
				const today = new Date()
				const todayYear = today.getFullYear()
				const todayMonth = today.getMonth() + 1
				const todayDay = today.getDate()
				
				if (todayYear === this.currentYear && todayMonth === this.currentMonth) {
					this.onDayClick({
						day: todayDay,
						year: todayYear,
						month: todayMonth,
						isTracked: this.recordedDays.includes(todayDay)
					})
				}
			},
			processRecords(records) {
				const recordedDays = []
				const recordMap = {}
				const weeklyData = []
				
				const feelingMap = {
					'smooth': '顺畅无痛',
					'effortful': '轻微费力',
					'diarrhea': '腹泻状态'
				}
				
				const colorMap = {
					'#8D4B00': '棕色',
					'#D4A373': '浅棕色',
					'#6B8E23': '绿色',
					'#2C2C2C': '黑色',
					'#A52A2A': '红色',
					'#E5E4E2': '白色'
				}
				
				const typeMap = {
					1: 'Type 1 坚果状',
					2: 'Type 2 香肠状',
					3: 'Type 3 香肠状',
					4: 'Type 4 香蕉状',
					5: 'Type 5 蛇状',
					6: 'Type 6 糊状',
					7: 'Type 7 水样'
				}
				
				records.forEach(record => {
					const date = new Date(record.created_at)
					const recordYear = date.getFullYear()
					const recordMonth = date.getMonth() + 1
					const day = date.getDate()
					const time = date.toTimeString().slice(0, 5)
					
					if (recordYear !== this.currentYear || recordMonth !== this.currentMonth) {
						return
					}
					
					if (!recordMap[day]) {
						recordMap[day] = []
						recordedDays.push(day)
					}
					
					recordMap[day].push({
						time: time,
						type: typeMap[record.type] || '未知类型',
						color: colorMap[record.color] || record.color || '棕色',
						status: feelingMap[record.feeling] || '未知',
						duration: record.duration || 0,
						note: record.note || ''
					})
				})
				
				this.recordedDays = recordedDays.sort((a, b) => a - b)
				this.records = recordMap
			},
			generateWeeklyData(records) {
				const today = new Date()
				const weekData = []
				const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
				
				/* 记录字段映射表，用于格式化原始记录为展示格式 */
				const feelingMap = {
					'smooth': '顺畅无痛',
					'effortful': '轻微费力',
					'diarrhea': '腹泻状态'
				}
				const colorMap = {
					'#8D4B00': '棕色',
					'#D4A373': '浅棕色',
					'#6B8E23': '绿色',
					'#2C2C2C': '黑色',
					'#A52A2A': '红色',
					'#E5E4E2': '白色'
				}
				const typeMap = {
					1: 'Type 1 坚果状',
					2: 'Type 2 香肠状',
					3: 'Type 3 香肠状',
					4: 'Type 4 香蕉状',
					5: 'Type 5 蛇状',
					6: 'Type 6 糊状',
					7: 'Type 7 水样'
				}
				
				for (let i = 6; i >= 0; i--) {
					const date = new Date(today)
					date.setDate(date.getDate() - i)
					const dayOfWeek = date.getDay()
					const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1
					
					const dayRecords = records.filter(r => {
						const recordDate = new Date(r.created_at)
						return recordDate.toDateString() === date.toDateString()
					})
					
					const recordCount = dayRecords.length
					const heightPerRecord = 20
					const maxHeight = 200
					const height = recordCount > 0 ? Math.min(recordCount * heightPerRecord, maxHeight) : 0
					
					/* 将原始记录格式化为时间线展示格式 */
					const formattedRecords = dayRecords.map(r => {
						const recordDate = new Date(r.created_at)
						return {
							time: recordDate.toTimeString().slice(0, 5),
							type: typeMap[r.type] || '未知类型',
							color: colorMap[r.color] || r.color || '棕色',
							status: feelingMap[r.feeling] || '未知',
							duration: r.duration || 0,
							note: r.note || ''
						}
					})
					
					weekData.push({
						day: dayNames[dayIndex],
						date: new Date(date),
						dayOfMonth: date.getDate(),
						month: date.getMonth() + 1,
						value: height,
						count: recordCount,
						records: formattedRecords
					})
				}
				
				this.weeklyData = weekData
				this.calculateWeeklyStats(records)
				/* 默认选中今天的趋势数据 */
				this.selectTodayInWeek()
			},
			calculateWeeklyStats(records) {
				if (records.length === 0) {
					this.averageFrequency = '0 次/天'
					this.mostActiveTimeRange = '暂无数据'
					return
				}
				
				const today = new Date()
				const dayOfWeek = today.getDay() || 7
				const monday = new Date(today)
				monday.setDate(today.getDate() - dayOfWeek + 1)
				
				const weekRecords = records.filter(r => {
					const recordDate = new Date(r.created_at)
					return recordDate >= monday
				})
				
				const avgFrequency = (weekRecords.length / 7).toFixed(1)
				this.averageFrequency = `${avgFrequency} 次/天`
				
				const hourCounts = {}
				weekRecords.forEach(r => {
					const date = new Date(r.created_at)
					const hour = date.getHours()
					hourCounts[hour] = (hourCounts[hour] || 0) + 1
				})
				
				let maxHour = -1
				let maxCount = 0
				Object.keys(hourCounts).forEach(hour => {
					if (hourCounts[hour] > maxCount) {
						maxCount = hourCounts[hour]
						maxHour = parseInt(hour)
					}
				})
				
				if (maxHour >= 0) {
					this.mostActiveTimeRange = `${String(maxHour).padStart(2, '0')}:00 - ${String(maxHour + 1).padStart(2, '0')}:00`
				} else {
					this.mostActiveTimeRange = '暂无数据'
				}
			},
			onDayClick(event) {
				const { day, year, month, isTracked } = event
				this.currentYear = year
				this.currentMonth = month
				this.selectedDate = day
				this.selectedWeekIndex = null
				if (isTracked) {
					this.selectedDateRecords = this.records[day] || []
				} else {
					this.selectedDateRecords = []
					this.confirmModalTitle = '提示'
					this.confirmModalContent = `${month}月${day}日暂无记录，是否前往添加？`
					this.confirmModalConfirmText = '去添加'
					this.confirmModalCancelText = '取消'
					this.confirmModalCallback = () => {
						uni.navigateTo({
							url: `/pages/health/record/record?year=${year}&month=${month}&day=${day}`
						})
					}
					this.showConfirmModal = true
				}
			},
			/* 点击周趋势柱状图某一天，联动显示当日记录 */
			onWeekDayClick(index) {
				const item = this.weeklyData[index]
				if (!item) return
				this.selectedWeekIndex = index
				this.selectedDate = item.dayOfMonth
				this.currentMonth = item.month
				this.selectedDateRecords = item.records || []
			},
			/* 自动选中今天在周趋势中的索引 */
			selectTodayInWeek() {
				const today = new Date()
				const todayStr = today.toDateString()
				const index = this.weeklyData.findIndex(d => d.date.toDateString() === todayStr)
				if (index >= 0) {
					this.onWeekDayClick(index)
				}
			},
			/* 跳转到记录页新增其他时间的记录，携带当前选中的日期 */
			goToAddRecord() {
				const year = this.currentYear
				const month = this.currentMonth
				const day = this.selectedDate || new Date().getDate()
				uni.navigateTo({
					url: `/pages/health/record/record?year=${year}&month=${month}&day=${day}`
				})
			},
			onMonthChange(event) {
				const { year, month } = event
				this.currentYear = year
				this.currentMonth = month
				this.loadRecords()
			},
			closeConfirmModal() {
				this.showConfirmModal = false
				this.confirmModalCallback = null
			},
			confirmConfirmModal() {
				if (this.confirmModalCallback) {
					this.confirmModalCallback()
				}
				this.closeConfirmModal()
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
			formatDuration(seconds) {
				if (!seconds || seconds === 0) {
					return 'null'
				}
				if (seconds > 60) {
					const mins = Math.floor(seconds / 60)
					const secs = seconds % 60
					return `${mins}分${secs}秒`
				}
				return `${seconds}秒`
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

	.tab-bar {
		display: flex;
		background: rgba(254, 244, 233, 0.6);
		border-radius: 32rpx;
		padding: 8rpx;
	}

	.tab-item {
		flex: 1;
		padding: 20rpx;
		border-radius: 24rpx;
		text-align: center;
		transition: all 0.3s;

		&.active {
			background: #fffaf3;
		}
	}

	.tab-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #887364;

		.tab-item.active & {
			color: #8d4b00;
		}
	}

	.calendar-card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.calendar-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #8d4b00;
	}

	.calendar-nav {
		display: flex;
		gap: 16rpx;
	}

	.nav-icon {
		width: 28rpx;
		height: 28rpx;
	}

	.calendar-weekdays {
		display: flex;
		gap: 8rpx;
		margin-bottom: 16rpx;
	}

	.weekday {
		flex: 1;
		text-align: center;
		font-size: 24rpx;
		font-weight: 600;
		color: #887364;
	}

	.calendar-days {
		display: flex;
		flex-wrap: wrap;
		gap: 8rpx;
	}

	.calendar-day {
		width: calc(100% / 7);
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		color: #2a1f15;

		&.recorded,
		&.highlight {
			.day-number {
				width: 64rpx;
				height: 64rpx;
				border-radius: 50%;
				background: #8d4b00;
				color: #ffffff;
				font-weight: 600;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		&.highlight {
			.day-number {
				background: #9a4614;
			}
		}
	}

	.calendar-legend {
		display: flex;
		justify-content: center;
		gap: 48rpx;
		margin-top: 24rpx;
		padding-top: 20rpx;
		border-top: 1px solid rgba(136, 115, 100, 0.1);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.legend-dot {
		width: 20rpx;
		height: 20rpx;
		border-radius: 50%;

		&.primary {
			background: #8d4b00;
		}

		&.secondary {
			background: #9a4614;
			opacity: 0.4;
		}
	}

	.legend-text {
		font-size: 22rpx;
		font-weight: 600;
		color: #887364;
	}

	.week-card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.week-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32rpx;
	}

	.week-header-left {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.week-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #8d4b00;
	}

	.week-date {
		font-size: 22rpx;
		font-weight: 600;
		color: #887364;
	}

	/* 新增记录按钮 */
	.add-record-btn {
		padding: 12rpx 28rpx;
		background: linear-gradient(135deg, #b15f00 0%, #8d4b00 100%);
		border-radius: 32rpx;
		box-shadow: 0 4rpx 12rpx rgba(141, 75, 0, 0.20);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.add-record-btn:active {
		transform: scale(0.95);
	}

	.add-record-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.chart-container {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		height: 280rpx;
		margin-bottom: 32rpx;
	}

	.chart-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&.selected {
			.chart-bar {
				background: linear-gradient(180deg, #9a4614 0%, #b15f00 100%);
				box-shadow: 0 4rpx 12rpx rgba(141, 75, 0, 0.25);
			}

			.chart-label {
				color: #8d4b00;
				font-weight: 700;
			}
		}
	}

	.chart-bar-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 200rpx;
		justify-content: flex-end;
		gap: 3rpx;
	}

	.chart-bar {
		width: 24rpx;
		border-radius: 12rpx;
		background: linear-gradient(180deg, #8d4b00 0%, #b15f00 100%);
		min-height: 8rpx;
	}

	.chart-count {
		font-size: 24rpx;
		font-weight: 600;
		color: #8d4b00;
		line-height: 1;
	}

	.chart-label {
		font-size: 20rpx;
		font-weight: 600;
		color: #887364;
	}

	.week-summary {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		padding-top: 24rpx;
		border-top: 1px solid rgba(136, 115, 100, 0.1);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.summary-label {
		font-size: 28rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.summary-value {
		font-size: 28rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.timeline-section {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.timeline-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-left: 16rpx;
		padding-right: 16rpx;
	}

	.section-title {
		font-size: 28rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.timeline-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 60rpx 0;
	}

	.empty-text {
		font-size: 28rpx;
		color: #887364;
	}

	.timeline {
		position: relative;
		padding-left: 32rpx;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 12rpx;
		top: 0;
		bottom: 0;
		width: 2rpx;
		background: rgba(136, 115, 100, 0.2);
	}

	.timeline-item {
		position: relative;
		margin-bottom: 24rpx;
	}

	.timeline-dot {
		position: absolute;
		left: -32rpx;
		top: 8rpx;
		width: 24rpx;
		height: 24rpx;
		border-radius: 50%;
		background: #8d4b00;
		border: 4rpx solid #fef8f3;
	}

	.timeline-content {
		background: rgba(255, 248, 235, 0.5);
		border-radius: 32rpx;
		padding: 24rpx;
	}

	.timeline-time {
		font-size: 24rpx;
		font-weight: 600;
		color: #8d4b00;
		display: block;
		margin-bottom: 8rpx;
	}

	.timeline-type {
		font-size: 32rpx;
		font-weight: 700;
		color: #2a1f15;
		display: block;
		margin-bottom: 16rpx;
	}

	.timeline-meta {
		display: flex;
		gap: 32rpx;
		margin-bottom: 16rpx;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 6rpx;
		font-size: 24rpx;
		color: #887364;
	}

	.timeline-note {
		background: rgba(255, 248, 235, 0.6);
		border-radius: 20rpx;
		padding: 20rpx;
		font-size: 26rpx;
		color: #554336;
		line-height: 1.5;
	}

	.calendar-title-wrap {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.calendar-arrow {
		font-size: 20rpx;
		color: #887364;
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
	}

	.picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 32rpx;
		border-bottom: 1px solid #f0f0f0;
	}

	.picker-cancel {
		font-size: 28rpx;
		color: #887364;
	}

	.picker-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.picker-confirm {
		font-size: 28rpx;
		font-weight: 600;
		color: #8d4b00;
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