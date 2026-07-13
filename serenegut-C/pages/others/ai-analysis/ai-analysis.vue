﻿<template>
	<view class="page-container-no-tab">
		<custom-nav title="AI分析报告" showBack />
		<canvas
			canvas-id="reportCanvas"
			class="report-canvas"
			:style="'width:' + canvasW + 'px; height:' + canvasH + 'px; opacity: 0; position: fixed; left: -10000px; top: 0;'"
		></canvas>
		<view class="content">
			<!-- 跑马灯：报告生成规则说明 -->
		<view class="marquee-bar">
			<view class="marquee-content">
				<text class="marquee-text">{{ marqueeText }}</text>
				<text class="marquee-text">{{ marqueeText }}</text>
			</view>
		</view>

			<!-- 报告头部 -->
			<view class="report-header" :style="headerStyle">
				<view class="header-badge">
					<text class="badge-text">AI 智能分析</text>
				</view>
				<text class="report-title">肠道健康综合分析报告</text>
				<view class="report-meta">
					<view class="meta-item">
						<AppIcon class="meta-icon" name="calendar" :size="24" />
						<text class="report-date">{{ reportDate }}</text>
					</view>
					<view class="meta-divider"></view>
					<view class="meta-item">
						<AppIcon class="meta-icon" name="shield-check" :size="24" />
						<text class="report-status">数据已加密</text>
					</view>
				</view>
			</view>

			<!-- 健康评分  -->
			<view class="score-card">
				<view class="score-main">
					<view class="score-ring-container">
						<!-- 分数文字 - 在涟漪上面 -->
						<text class="score-value">{{ animatedScore }}</text>
						<!-- 3D倾斜透视容器 -->
						<view class="ripple-container">
							<!-- 中间发光小圆点 -->
							<view class="center-dot"></view>
							<!-- 涟漪效果 -->
							<view class="ripple"></view>
							<view class="ripple"></view>
							<view class="ripple"></view>
						</view>
					</view>
					<view class="score-info">
						<view class="score-badge">
							<text class="badge-grade">{{ getGrade(score) }}</text>
							<text class="badge-label">{{ getGradeLabel(score) }}</text>
						</view>
						<text class="score-title">{{ getScoreTitle(score) }}</text>
						<text class="score-text">{{ getScoreText(score) }}</text>
					</view>
				</view>
				<view class="score-trend">
					<view class="trend-item up">
						<AppIcon name="trending-up" :size="24" />
						<text class="trend-text">{{ scoreTrend }}</text>
					</view>
					<view class="trend-item">
						<AppIcon name="users" :size="24" />
						<text class="trend-text">{{ userRanking }}</text>
					</view>
				</view>
			</view>

			<!-- 趋势分析 -->
		<view class="section-card chart-section">
			<view class="section-header">
				<view class="header-left">
					<view class="header-icon chart-icon">
						<AppIcon name="chart-bar" :size="28" />
					</view>
					<text class="section-title">趋势分析</text>
				</view>
			</view>
			<!-- 趋势分析：周期切换 -->
			<view class="trend-header">
				<view class="period-switcher">
					<view class="period-btn" :class="{ active: trendPeriod === 'week' }" @click="switchTrendPeriod('week')">周</view>
					<view class="period-btn" :class="{ active: trendPeriod === 'month' }" @click="switchTrendPeriod('month')">月</view>
					<view class="period-btn" :class="{ active: trendPeriod === 'year' }" @click="switchTrendPeriod('year')">年</view>
				</view>
			</view>
			<view class="chart-area">
				<!-- 周视图：柱状图 -->
				<template v-if="trendPeriod === 'week'">
					<view class="chart-y-axis">
						<text class="y-label">100</text>
						<text class="y-label">75</text>
						<text class="y-label">50</text>
						<text class="y-label">25</text>
						<text class="y-label">0</text>
					</view>
					<view class="chart-main">
						<view class="chart-grid">
							<view v-for="n in 5" :key="n" class="grid-line"></view>
						</view>
						<view class="chart-bars bars-week">
							<view
								v-for="(item, index) in weeklyData"
								:key="index"
								class="bar-column"
								@click="selectBar(index)"
							>
								<view class="bar-tooltip" v-if="selectedBar === index">
									<text class="tooltip-value">{{ item.value }}分</text>
									<view class="tooltip-arrow"></view>
								</view>
								<view class="bar-track">
									<view
										v-if="item.value > 0"
										class="bar-fill"
										:style="{ height: item.value + '%', animationDelay: index * 0.1 + 's' }"
										:class="{ 'bar-active': selectedBar === index }"
									>
										<view class="bar-shine"></view>
									</view>
									<view v-else class="bar-fill empty-bar"></view>
								</view>
								<text class="bar-label" :class="{ 'label-active': selectedBar === index }">{{ item.day }}</text>
							</view>
						</view>
					</view>
				</template>

				<!-- 月视图：热力图格子 -->
				<template v-else-if="trendPeriod === 'month'">
					<view class="heatmap-container">
						<view class="heatmap-grid">
							<view
							v-for="(item, index) in weeklyData"
							:key="index"
							:class="['heatmap-cell', getHeatmapLevelClass(item.value), { 'cell-selected': selectedBar === index }]"
							@click="selectBar(index)"
						>
							<text v-if="item.value > 0" class="cell-score">{{ item.value }}</text>
							<text class="cell-day">{{ item.day }}</text>
						</view>
						</view>
						<view class="heatmap-legend">
							<text class="legend-label">少</text>
							<view class="legend-cell" style="background: rgba(141, 75, 0, 0.1)"></view>
							<view class="legend-cell" style="background: rgba(141, 75, 0, 0.3)"></view>
							<view class="legend-cell" style="background: rgba(141, 75, 0, 0.5)"></view>
							<view class="legend-cell" style="background: rgba(141, 75, 0, 0.7)"></view>
							<view class="legend-cell" style="background: rgba(141, 75, 0, 0.9)"></view>
							<text class="legend-label">多</text>
						</view>
					</view>
				</template>

				<!-- 年视图：月份柱状图 -->
				<template v-else>
					<view class="chart-y-axis">
						<text class="y-label">100</text>
						<text class="y-label">75</text>
						<text class="y-label">50</text>
						<text class="y-label">25</text>
						<text class="y-label">0</text>
					</view>
					<view class="chart-main">
						<view class="chart-grid">
							<view v-for="n in 5" :key="n" class="grid-line"></view>
						</view>
						<view class="chart-bars bars-year">
							<view
								v-for="(item, index) in weeklyData"
								:key="index"
								class="bar-column"
								@click="selectBar(index)"
							>
								<view class="bar-tooltip" v-if="selectedBar === index">
									<text class="tooltip-value">{{ item.value }}分</text>
									<view class="tooltip-arrow"></view>
								</view>
								<view class="bar-track">
									<view
										v-if="item.value > 0"
										class="bar-fill"
										:style="{ height: item.value + '%', width: '24rpx', animationDelay: index * 0.1 + 's' }"
										:class="{ 'bar-active': selectedBar === index }"
									>
										<view class="bar-shine"></view>
									</view>
									<view v-else class="bar-fill empty-bar" style="width: 8rpx"></view>
								</view>
								<text class="bar-label" :class="{ 'label-active': selectedBar === index }">{{ item.day }}</text>
							</view>
						</view>
					</view>
				</template>
			</view>
			<view class="chart-stats">
				<view class="stat-card">
					<view class="stat-icon-wrapper">
						<AppIcon name="clock" :size="28" />
					</view>
					<view class="stat-info">
						<text class="stat-label">平均频率</text>
						<text class="stat-value">{{ averageFrequency }} <text class="stat-unit">次/天</text></text>
					</view>
				</view>
				<view class="stat-card">
					<view class="stat-icon-wrapper green">
						<AppIcon name="target" color="green" :size="28" />
					</view>
					<view class="stat-info">
						<text class="stat-label">达标天数</text>
						<text class="stat-value">{{ qualifiedDays }} <text class="stat-unit">天</text></text>
					</view>
				</view>
			</view>
		</view>

			<!-- 健康指标 -->
			<view class="section-card">
				<view class="section-header">
					<view class="header-left">
						<view class="header-icon metric-icon">
							<AppIcon name="heart-filled" color="red" :size="28" />
						</view>
						<text class="section-title">健康指标</text>
					</view>
					<text class="section-subtitle">各项数据均处于正常范围</text>
				</view>
				<view class="metrics-grid">
					<view 
						v-for="(metric, index) in metrics" 
						:key="metric.label" 
						class="metric-card"
						:style="{ animationDelay: index * 0.08 + 's' }"
					>
						<view class="metric-progress-ring" :class="{ 'qualified': metric.percent >= 60, 'unqualified': metric.percent < 60 }">
							<view class="progress-fill"></view>
							<view class="metric-icon-inner">
								<AppIcon :name="metric.icon" :color="metric.iconColor || ''" :size="28" />
							</view>
						</view>
						<view class="metric-detail">
							<text class="metric-value">{{ metric.value }}</text>
							<text class="metric-label">{{ metric.label }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- AI 总结（支持周/月/年切换） -->
		<view class="section-card ai-summary-card">
			<view class="section-header">
				<view class="header-left">
					<view class="header-icon ai-icon">
						<AppIcon name="sparkles" :size="28" />
					</view>
					<text class="section-title">AI {{ periodLabel }}总结</text>
				</view>
				<view class="ai-summary-right">
				<text class="ai-badge">AI</text>
			</view>
			</view>
			<view class="ai-summary-body-wrapper">
				<view class="ai-summary-body">
					<text class="ai-summary-text">{{ aiSummary }}</text>
				</view>
				<view class="ai-summary-tags">
					<text v-for="tag in aiSummaryTags" :key="tag" class="ai-tag">{{ tag }}</text>
				</view>
				<!-- 数据不足时磨砂玻璃遮罩 -->
				<view v-if="!hasEnoughData" class="summary-blur-overlay">
					<view class="overlay-content">
						<AppIcon name="lock" :size="48" />
						<text class="overlay-text">{{ insufficientReason }}</text>
					</view>
				</view>
			</view>
		</view>

			<!-- 个性化建议 - 宫格视图 -->
			<view class="section-card">
				<view class="section-header">
					<view class="header-left">
						<view class="header-icon tip-icon">
							<AppIcon name="bulb" :size="28" />
						</view>
						<text class="section-title">个性化建议</text>
					</view>
					<text class="section-subtitle">基于您的数据智能生成</text>
				</view>
				<view class="tips-grid">
					<view 
						v-for="(tip, index) in tips" 
						:key="index" 
						class="tip-grid-card"
						:style="{ animationDelay: index * 0.1 + 's' }"
						@click="handleAction(tip.action)"
					>
						<view class="tip-grid-icon" :style="{ background: tip.color + '15' }">
							<AppIcon :name="tip.emoji" :size="32" />
						</view>
						<text class="tip-grid-title">{{ tip.title }}</text>
						<text class="tip-grid-desc">{{ tip.desc }}</text>
					</view>
				</view>
			</view>

			<!-- 底部操作 -->
			<view class="action-bar">
				<view class="action-btn primary" @click="showExportConfirm">
					<image class="btn-icon" src="/static/images/other-icons/download.png" mode="aspectFit"></image>
					<text class="btn-text">导出报告</text>
				</view>
			</view>
		</view>
		<CustomToast ref="customToast" />
	</view>
	
	<!-- 导出确认弹窗 -->
	<ConfirmModal 
		:visible="showExportModal"
		title="提示"
		content="确认导出并保存报告到相册？"
		confirmText="确认"
		cancelText="取消"
		@confirm="handleExportConfirm"
		@cancel="showExportModal = false"
	/>
	
	<!-- 权限请求弹窗 -->
	<ConfirmModal 
		:visible="showPermissionModal"
		title="提示"
		content="需要获取相册权限，请在设置中开启"
		confirmText="去设置"
		cancelText="取消"
		@confirm="handlePermissionConfirm"
		@cancel="handlePermissionCancel"
	/>

	<!-- 登录检查弹窗 -->
	<ConfirmModal
		:visible="showLoginModal"
		title="提示"
		content="登录后才能使用此功能，是否前往登录?"
		confirmText="去登录"
		cancelText="取消"
		@confirm="handleLoginConfirm"
		@cancel="handleLoginCancel"
	/>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { aiApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'AiAnalysis',
		components: {
			ConfirmModal,
			CustomNav,
			AppIcon
		},
		data() {
				return {
					showExportModal: false,
				showPermissionModal: false,
				showLoginModal: false,
					permissionResolve: null,
					score: 0,
				animatedScore: 0,
				selectedBar: -1,
				weeklyData: [],
				averageFrequency: 0,
				qualifiedDays: 0,
				scoreTrend: '',
				userRanking: '',
				tips: [
					{
						title: '保持规律排便',
						desc: '晨起一杯温水，培养固定排便时间',
						emoji: 'sunrise',
						color: '#8d4b00',
						action: 'setReminder'
					},
					{
						title: '增加膳食纤维',
						desc: '多吃燕麦、苹果等可溶性纤维',
						emoji: 'salad',
						color: '#b15f00',
						action: 'viewRecipes'
					},
					{
						title: '充足水分摄入',
						desc: '每日饮水 1.5-2 升，软化粪便',
						emoji: 'droplet',
						color: '#3B82F6',
						action: 'trackWater'
					},
					{
						title: '适度有氧运动',
						desc: '每周 3-4 次快走或慢跑',
						emoji: 'run',
						color: '#F59E0B',
						action: 'startWorkout'
					}
				],
				metrics: [
					{ icon: 'poop', value: '正常', label: '排便规律', percent: 85, color: '#10B981' },
					{ icon: 'circle-dot', iconColor: 'green', value: '理想', label: '粪便形态', percent: 92, color: '#22C55E' }
				],
				aiSummary: '',
				aiSummaryTags: [],
				// 报告日期（北京时间，动态显示）
				reportDate: '',
				// 跑马灯文本：说明报告生成规则
				marqueeText: '本次报告基于昨日及之前的数据生成，不包含当日数据。周度分析覆盖上周一至周日，月度分析覆盖本月1日至昨日，年度分析覆盖今年1月1日至昨日。',
				ringCircumference: 2 * Math.PI * 85,
				ringOffset: 2 * Math.PI * 85,
				endDotX: 100,
				endDotY: 15,
				ringProgress: 0,
				canvasW: 375,
				canvasH: 1200,
				// ===== 新增：多周期分析 & 图表切换 =====
				analysisPeriod: 'week',   // AI总结的周期：week/month/year
			trendPeriod: 'week',      // 趋势分析的周期：week/month/year
			chartType: 'bar',         // 图表类型：bar（保留兼容，已移除折线图）
			chartWidth: 0,            // 折线图容器宽度（px，通过测量获取）
			chartHeight: 0,           // 折线图容器高度（px，240rpx转换）
			/* 数据是否充足：月需≥7天，年需≥1个月（30天） */
			hasEnoughData: true,
			insufficientReason: '',
			/* 多周期趋势数据缓存：{ week: {weeklyData, validDays}, month: {...}, year: {...} } */
			periodTrendCache: {}
		}
		},
		computed: {
			headerStyle() {
				return {
					background: 'linear-gradient(135deg, rgba(141, 75, 0, 0.08) 0%, rgba(177, 95, 0, 0.05) 100%)'
				}
			},
			/* AI总结标题中的周期标签 */
		periodLabel() {
			return { week: '周度', month: '月度', year: '年度' }[this.analysisPeriod] || '周度'
		},
		/* 柱状图柱子宽度：根据周期动态调整，月视图柱子更细以容纳所有天数 */
		barFillWidth() {
			if (this.trendPeriod === 'month') return '8rpx'
			if (this.trendPeriod === 'year') return '24rpx'
			return '36rpx'
		},
		/* 空柱子宽度 */
		barEmptyWidth() {
			if (this.trendPeriod === 'month') return '4rpx'
			if (this.trendPeriod === 'year') return '8rpx'
			return '12rpx'
		},
			/* 折线图的线段：计算每段连线的位置、长度和旋转角度 */
			lineSegments() {
				if (!this.weeklyData || this.weeklyData.length < 2 || !this.chartWidth) return []
				const segments = []
				const count = this.weeklyData.length
				const w = this.chartWidth
				const h = this.chartHeight
				for (let i = 0; i < count - 1; i++) {
					const x1 = ((i + 0.5) / count) * w
					const y1 = (1 - (this.weeklyData[i].value || 0) / 100) * h
					const x2 = ((i + 1.5) / count) * w
					const y2 = (1 - (this.weeklyData[i + 1].value || 0) / 100) * h
					const dx = x2 - x1
					const dy = y2 - y1
					const length = Math.sqrt(dx * dx + dy * dy)
					const angle = Math.atan2(dy, dx) * 180 / Math.PI
					segments.push({ left: x1, top: y1, length, angle })
				}
				return segments
			},
			/* 折线图的数据点位置 */
			linePoints() {
				if (!this.weeklyData || !this.chartWidth) return []
				const count = this.weeklyData.length
				const w = this.chartWidth
				const h = this.chartHeight
				return this.weeklyData.map((item, i) => ({
					left: ((i + 0.5) / count) * w,
					top: (1 - (item.value || 0) / 100) * h,
					value: item.value
				}))
			}
		},
		onLoad() {
			this.checkLogin()
			this.loadAnalysisData()
			// 延迟测量图表容器尺寸，用于折线图渲染
			this.$nextTick(() => {
				setTimeout(() => { this.measureChart() }, 300)
			})
		},
		methods: {
			checkLogin() {
				const isLoggedIn = uni.getStorageSync('isLoggedIn')
				if (!isLoggedIn) {
					this.showLoginModal = true
				}
			},
			/* 确认登录：跳转到登录页 */
			handleLoginConfirm() {
				this.showLoginModal = false
				uni.reLaunch({ url: '/pages/profile/profile' })
			},
			/* 取消登录：返回上一页 */
			handleLoginCancel() {
				this.showLoginModal = false
				uni.navigateBack()
			},
		async loadAnalysisData() {
			const userId = uni.getStorageSync('userId')
			if (!userId) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}

			const today = this.getTodayStr()
			const periods = ['week', 'month', 'year']

			/* 1. 检查本地缓存：三个周期是否全部已缓存且当日有效 */
			const allCached = periods.every(p => {
				const cache = uni.getStorageSync('aiReportCache_' + p)
				return cache && cache.date === today && cache.data
			})

			if (allCached) {
				console.log('[ai-analysis] 三个周期报告均已缓存，直接应用')
				const cache = uni.getStorageSync('aiReportCache_' + this.analysisPeriod)
				this.applyReportData(cache.data)
				/* 预加载三个周期的趋势数据，使切换时即时显示 */
				await this.preloadAllTrendData(userId)
				/* 当前周期数据不足时，使用周报兜底 */
				if (!this.hasEnoughData) {
					this.loadFallbackMetrics()
				}
				return
			}

			/* 2. 并行生成缺失周期的报告（一次性生成周/月/年） */
			console.log('[ai-analysis] 开始生成所有周期报告')
			uni.showLoading({ title: '正在生成报告...' })

			try {
				const results = await Promise.all(
					periods.map(p => {
						/* 已有当日缓存的周期直接返回，避免重复请求 */
						const cache = uni.getStorageSync('aiReportCache_' + p)
						if (cache && cache.date === today && cache.data) {
							return Promise.resolve({ code: 0, data: cache.data, _period: p })
						}
						return aiApi.get(userId, p).then(r => ({ ...r, _period: p })).catch(() => null)
					})
				)

				/* 缓存成功结果到本地存储 */
				results.forEach(result => {
					if (result && result.code === 0 && result.data) {
						uni.setStorageSync('aiReportCache_' + result._period, { date: today, data: result.data })
					}
				})

				/* 应用当前周期数据 */
				const currentCache = uni.getStorageSync('aiReportCache_' + this.analysisPeriod)
				if (currentCache && currentCache.data) {
					this.applyReportData(currentCache.data)
				}

				/* 预加载三个周期的趋势数据 */
				await this.preloadAllTrendData(userId)
				/* 当前周期数据不足时，使用周报兜底 */
				if (!this.hasEnoughData) {
					this.loadFallbackMetrics()
				}
			} catch (error) {
				console.error('[ai-analysis] 生成报告异常:', error)
				uni.showToast({ title: '加载失败: ' + (error.message || ''), icon: 'none', duration: 3000 })
			} finally {
				uni.hideLoading()
			}
		},
	/* 预加载三个周期的趋势数据，使切换时即时显示 */
		async preloadAllTrendData(userId) {
			const periods = ['week', 'month', 'year']
			const results = await Promise.all(
				periods.map(p => aiApi.getTrend(userId, p).then(r => ({ ...r, _period: p })).catch(() => null))
			)

			results.forEach(result => {
				if (result && result.code === 0 && result.data) {
					const data = result.data.weeklyData || []
					this.periodTrendCache[result._period] = {
						weeklyData: data,
						validDays: data.filter(d => d.value > 0).length
					}
				}
			})

			/* 应用当前周期的趋势数据和遮罩状态 */
			this.applyPeriodTrendData(this.analysisPeriod)
		},

		/* 从缓存应用指定周期的趋势数据，并检查数据充足性 */
		applyPeriodTrendData(period) {
			const cached = this.periodTrendCache[period]
			if (cached) {
				this.weeklyData = cached.weeklyData
				const firstValidIndex = this.weeklyData.findIndex(d => d.value > 0)
				this.selectedBar = firstValidIndex >= 0 ? firstValidIndex : -1
			}
			this.checkDataSufficiency(period)
		},

		/* 热力图颜色等级：根据评分返回对应色阶class（少→多5级） */
		getHeatmapLevelClass(value) {
			if (value <= 0) return 'level-0'
			if (value < 30) return 'level-1'
			if (value < 60) return 'level-2'
			if (value < 80) return 'level-3'
			if (value < 90) return 'level-4'
			return 'level-5'
		},

		getTodayStr() {
			const now = new Date()
			const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
			return beijingTime.toISOString().split('T')[0]
		},
		/* 获取北京时间日期字符串用于报告日期显示（YYYY-MM-DD） */
		getReportDateStr() {
			const now = new Date()
			const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000)
			const y = beijing.getUTCFullYear()
			const m = String(beijing.getUTCMonth() + 1).padStart(2, '0')
			const d = String(beijing.getUTCDate()).padStart(2, '0')
			return `${y}-${m}-${d}`
		},
		/* ===== 周期切换 & 图表切换方法 ===== */

		/* 切换AI总结周期（周/月/年），重新加载完整报告数据 */
		async switchPeriod(period) {
			if (this.analysisPeriod === period) return
			this.analysisPeriod = period
			// 同步趋势分析周期
			this.trendPeriod = period
			await this.loadPeriodData(period)
		},

		/* 切换趋势分析周期（周/月/年），优先从缓存读取实现即时切换，无加载动画 */
		async switchTrendPeriod(period) {
			if (this.trendPeriod === period) return

			this.trendPeriod = period
			this.analysisPeriod = period

			/* 优先从预加载缓存读取，实现即时切换 */
			if (this.periodTrendCache[period]) {
				this.applyPeriodTrendData(period)
			} else {
				/* 缓存未命中时降级为API请求 */
				const userId = uni.getStorageSync('userId')
				if (!userId) return

				try {
					const trendResult = await aiApi.getTrend(userId, period)
					if (trendResult && trendResult.code === 0 && trendResult.data) {
						const data = trendResult.data.weeklyData || []
						this.periodTrendCache[period] = {
							weeklyData: data,
							validDays: data.filter(d => d.value > 0).length
						}
						this.applyPeriodTrendData(period)
					}
				} catch (e) {
					console.error('[ai-analysis] 获取趋势失败:', e)
					this.checkDataSufficiency(period)
				}
			}

			/* 静默加载 AI 总结数据（有本地缓存则即时返回） */
			if (this.hasEnoughData) {
				await this.loadPeriodData(period)
			} else {
				/* 数据不足时，使用周报数据作为健康指标和个性化建议的兜底 */
				await this.loadFallbackMetrics()
			}
		},

		/* 检查当前周期数据是否充足：月需≥7天有效记录，年需≥30天 */
		checkDataSufficiency(period) {
			if (period === 'week') {
				this.hasEnoughData = true
				this.insufficientReason = ''
				return
			}

			/* 动态获取当前月份和年份，用于遮罩文案展示 */
			const now = new Date()
			const monthName = (now.getMonth() + 1) + '月'
			const yearName = now.getFullYear() + '年'

			if (!this.weeklyData || this.weeklyData.length === 0) {
				this.hasEnoughData = false
				this.insufficientReason = period === 'month'
					? `${monthName}数据不足7天，暂无法生成月度总结`
					: `${yearName}数据不足1个月，暂无法生成年度总结`
				return
			}

			/* 统计有效数据天数（value > 0 表示有记录） */
			const validDays = this.weeklyData.filter(d => d.value > 0).length

			if (period === 'month') {
				if (validDays < 7) {
					this.hasEnoughData = false
					this.insufficientReason = `${monthName}仅记录了${validDays}天数据，需至少7天才能生成月度总结`
				} else {
					this.hasEnoughData = true
					this.insufficientReason = ''
				}
			} else if (period === 'year') {
				if (validDays < 30) {
					this.hasEnoughData = false
					this.insufficientReason = `${yearName}仅记录了${validDays}天数据，需至少1个月（30天）才能生成年度总结`
				} else {
					this.hasEnoughData = true
					this.insufficientReason = ''
				}
			}
		},

		/* 数据不足时加载周报兜底数据（仅健康指标和个性化建议） */
		async loadFallbackMetrics() {
			const userId = uni.getStorageSync('userId')
			if (!userId) return

			const today = this.getTodayStr()
			const cacheKey = 'aiReportCache_week'

			/* 优先使用本地缓存 */
			const cache = uni.getStorageSync(cacheKey)
			if (cache && cache.date === today && cache.data) {
				this.applyFallbackMetrics(cache.data)
				return
			}

			try {
				const result = await aiApi.get(userId, 'week')
				if (result && result.code === 0 && result.data) {
					uni.setStorageSync(cacheKey, { date: today, data: result.data })
					this.applyFallbackMetrics(result.data)
				}
			} catch (error) {
				console.error('[ai-analysis] 加载周报兜底数据失败:', error)
			}
		},

		/* 应用兜底数据：仅更新健康指标和个性化建议，不影响AI总结和遮罩状态 */
		applyFallbackMetrics(data) {
			if (data.metrics && data.metrics.length > 0) {
				this.metrics = data.metrics
			}
			if (data.tips && data.tips.length > 0) {
				this.tips = data.tips
			}
		},

		/* 切换图表类型（柱状图/折线图） */
		switchChartType(type) {
			this.chartType = type
			// 切换到折线图时重新测量容器尺寸
			if (type === 'line') {
				this.$nextTick(() => {
					setTimeout(() => { this.measureChart() }, 50)
				})
			}
		},

		/* 加载指定周期的AI报告数据（切换AI总结周期时调用，无加载动画） */
		async loadPeriodData(period) {
			const userId = uni.getStorageSync('userId')
			if (!userId) return

			const today = this.getTodayStr()
			const cacheKey = 'aiReportCache_' + period

			// 优先使用本地缓存
			const cache = uni.getStorageSync(cacheKey)
			if (cache && cache.date === today && cache.data) {
				this.applyReportData(cache.data)
				return
			}

			try {
				const result = await aiApi.get(userId, period)
				if (result && result.code === 0 && result.data) {
					uni.setStorageSync(cacheKey, { date: today, data: result.data })
					this.applyReportData(result.data)
				}
			} catch (error) {
				console.error('[ai-analysis] 切换周期失败:', error)
			}
		},

		/* 加载指定周期的趋势数据（切换趋势分析周期时调用，无加载动画） */
		async loadTrendData(period) {
			const userId = uni.getStorageSync('userId')
			if (!userId) return

			try {
				const result = await aiApi.getTrend(userId, period)
				if (result && result.code === 0 && result.data) {
					this.weeklyData = result.data.weeklyData || []
					const firstValidIndex = this.weeklyData.findIndex(d => d.value > 0)
					this.selectedBar = firstValidIndex >= 0 ? firstValidIndex : -1
				}
			} catch (error) {
				console.error('[ai-analysis] 获取趋势失败:', error)
			}
		},

		/* 测量图表容器尺寸，用于折线图的线段计算 */
		measureChart() {
			const sysInfo = uni.getSystemInfoSync()
			// 160rpx 转换为 px（rpx = screenWidth / 750 * rpx值）
			this.chartHeight = 160 * sysInfo.windowWidth / 750

			uni.createSelectorQuery().in(this).select('.chart-main').boundingClientRect(rect => {
				if (rect && rect.width > 0) {
					this.chartWidth = rect.width
				} else {
					// 降级：根据屏幕宽度估算
					this.chartWidth = sysInfo.windowWidth * 0.82
				}
			}).exec()
		},

		applyReportData(data) {
				this.score = data.score || 0
				this.weeklyData = data.weeklyData || []
				this.averageFrequency = data.averageFrequency || 0
				this.qualifiedDays = data.qualifiedDays || 0
				this.scoreTrend = data.scoreTrend || '首次分析'
				this.userRanking = data.userRanking || '暂无排名数据'
				this.aiSummary = data.aiSummary || ''
				this.aiSummaryTags = data.aiSummaryTags || []
				this.metrics = data.metrics && data.metrics.length > 0
					? data.metrics
					: [
						{ icon: 'poop', value: '待记录', label: '排便规律', percent: 0, color: '#887364' },
						{ icon: 'circle-dot', iconColor: 'green', value: '待记录', label: '粪便形态', percent: 0, color: '#887364' }
					]
				this.tips = data.tips && data.tips.length > 0
					? data.tips
					: [
						{ title: '开始记录', desc: '每天记录排便情况，获取AI健康分析', emoji: 'notebook', color: '#8d4b00', action: 'setReminder' }
					]

				// 动态设置报告日期（北京时间）
				this.reportDate = this.getReportDateStr()
				this.animateScore()
				// 选中第一个有数据的柱子
				const firstValidIndex = this.weeklyData.findIndex(d => d.value > 0)
				this.selectedBar = firstValidIndex >= 0 ? firstValidIndex : -1
				setTimeout(() => {
					this.animateRing()
				}, 500)
			},
			getGrade(score) {
				if (score >= 90) return 'A+'
				if (score >= 80) return 'A'
				if (score >= 70) return 'B+'
				if (score >= 60) return 'B'
				if (score >= 50) return 'C'
				return 'D'
			},
			getGradeLabel(score) {
				if (score >= 90) return '优秀'
				if (score >= 80) return '良好'
				if (score >= 70) return '中等偏上'
				if (score >= 60) return '中等'
				if (score >= 50) return '及格'
				return '需改善'
			},
			getScoreTitle(score) {
				if (score >= 90) return '您的肠道状态非常健康！'
				if (score >= 80) return '您的肠道状态比较健康'
				if (score >= 70) return '您的肠道状态基本正常'
				if (score >= 60) return '您的肠道状态需要关注'
				return '您的肠道状态需要改善'
			},
			getScoreText(score) {
				if (score >= 90) return '综合评分处于优秀水平，继续保持良好的生活习惯，定期监测肠道健康'
				if (score >= 80) return '综合评分处于良好水平，建议继续保持良好的饮食和作息习惯'
				if (score >= 70) return '综合评分处于中等偏上水平，建议适当调整饮食结构'
				if (score >= 60) return '综合评分处于中等水平，建议增加运动和膳食纤维摄入'
				return '综合评分需要提升，建议咨询医生并改善生活习惯'
			},
			goBack() {
				uni.navigateBack({ delta: 2 })
			},
			shareReport() {
				uni.showShareMenu({
					withShareTicket: true,
					menus: ['shareAppMessage', 'shareTimeline']
				})
			},
			animateScore() {
				let current = 0
				const target = this.score
				const step = target / 30
				const timer = setInterval(() => {
					current += step
					if (current >= target) {
						current = target
						clearInterval(timer)
					}
					this.animatedScore = Math.floor(current)
				}, 30)
			},
			animateRing() {
				const duration = 1500
				const startTime = Date.now()
				const targetProgress = this.score / 100
				const totalLength = this.ringCircumference
				
				const animate = () => {
					const elapsed = Date.now() - startTime
					const progress = Math.min(elapsed / duration, 1)
					// 使用 ease-out 缓动
					const eased = 1 - Math.pow(1 - progress, 3)
					
					this.ringProgress = eased * targetProgress
					
					// 逆时针方向：从顶部(12点钟方向)开始，向左(逆时针)绘制
					// SVG坐标系中，-90度是12点钟方向
					// 逆时针意味着角度减小，所以是 -90 - (progress * 360)
					this.ringOffset = totalLength * (1 - this.ringProgress)
					
					// 计算端点位置 - 逆时针方向
					// 从-90度开始，逆时针旋转（角度减小）
					const angle = -90 - (this.ringProgress * 360)
					const rad = (angle * Math.PI) / 180
					this.endDotX = 100 + 85 * Math.cos(rad)
					this.endDotY = 100 + 85 * Math.sin(rad)
					
					if (progress < 1) {
						setTimeout(animate, 16)
					}
				}
				animate()
			},
			getProgressStyle(percent, color) {
				const deg = (percent / 100) * 360
				return {
					background: `conic-gradient(from -90deg, ${color} 0deg, ${color} ${deg}deg, transparent ${deg}deg)`
				}
			},
			selectBar(index) {
				this.selectedBar = this.selectedBar === index ? -1 : index
			},
			showExportConfirm() {
				this.showExportModal = true
			},
			async handleExportConfirm() {
				this.showExportModal = false
				await this.saveReportImage()
			},
			async saveReportImage() {
				uni.showLoading({ title: '生成报告图片...' })

				try {
					const hasPermission = await this.checkAlbumPermission()
					if (!hasPermission) {
						uni.hideLoading()
						return
					}

					await this.generateReportImage()
					uni.hideLoading()
					uni.showToast({ title: '已保存至相册', icon: 'success' })
				} catch (error) {
					uni.hideLoading()
					console.error('[ai-analysis] 导出失败:', error)
					uni.showToast({ title: error.message || '保存失败', icon: 'none' })
				}
			},

			async checkAlbumPermission() {
				return new Promise((resolve) => {
					uni.getSetting({
						success: (res) => {
							if (res.authSetting['scope.album']) {
								resolve(true)
							} else {
								uni.authorize({
									scope: 'scope.album',
									success: () => resolve(true),
									fail: () => {
										this.showPermissionModal = true
										this.permissionResolve = resolve
									}
								})
							}
						},
						fail: () => resolve(false)
					})
				})
			},
			handlePermissionConfirm() {
				this.showPermissionModal = false
				uni.openSetting({
					success: (settingRes) => {
						if (this.permissionResolve) {
							this.permissionResolve(settingRes.authSetting['scope.album'] || false)
							this.permissionResolve = null
						}
					},
					fail: () => {
						if (this.permissionResolve) {
							this.permissionResolve(false)
							this.permissionResolve = null
						}
					}
				})
			},
			handlePermissionCancel() {
				this.showPermissionModal = false
				if (this.permissionResolve) {
					this.permissionResolve(false)
					this.permissionResolve = null
				}
			},

			generateReportImage() {
				return new Promise((resolve, reject) => {
					const sysInfo = uni.getSystemInfoSync()
					const screenW = sysInfo.windowWidth
					const dpr = sysInfo.pixelRatio || 2

					// 动态计算画布高度
					let totalH = 520 // 头部+评分
					totalH += 320 // 趋势图表
					totalH += 260 // 健康指标
					totalH += 240 // AI总结
					totalH += 80 + this.tips.length * 110 // 个性化建议
					totalH += 80 // 底部留白

					this.canvasW = screenW
					this.canvasH = totalH

					// 等待 canvas 尺寸更新
					this.$nextTick(() => {
						setTimeout(() => {
							try {
								this.drawReport(screenW, totalH, dpr, resolve, reject)
							} catch (e) {
								reject(e)
							}
						}, 200)
					})
				})
			},

			drawReport(w, h, dpr, resolve, reject) {
				const ctx = uni.createCanvasContext('reportCanvas')
				const s = 1 // 用 CSS 像素绘制，canvasToTempFilePath 时用 destWidth/destWidth 放大
				let y = 0

				// ===== 主题色 =====
				const C_BG = '#fef8f3'
				const C_PRIMARY = '#8d4b00'
				const C_PRIMARY_LT = '#b15f00'
				const C_CARD = '#ffffff'
				const C_TEXT = '#2a1f15'
				const C_TEXT2 = '#554336'
				const C_TEXT3 = '#887364'
				const C_SUCCESS = '#10B981'

				// ===== 背景 =====
				ctx.setFillStyle(C_BG)
				ctx.fillRect(0, 0, w, h)

				// ===== 报告头部 =====
				ctx.setFillStyle(C_PRIMARY)
				ctx.setFontSize(16)
				ctx.fillText('AI 智能分析', 20, y + 30)
				ctx.setFillStyle(C_TEXT)
				ctx.setFontSize(22)
				ctx.font = 'bold 22px sans-serif'
				ctx.fillText('肠道健康综合分析报告', 20, y + 62)

				// 日期
				const now = new Date()
				const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
				ctx.setFontSize(12)
				ctx.setFillStyle(C_TEXT3)
				ctx.fillText(dateStr + '  数据已加密', 20, y + 88)
				y += 120

				// ===== 健康评分卡片 =====
				ctx.setFillStyle(C_CARD)
				this.roundRect(ctx, 20, y, w - 40, 120, 16)
				ctx.fill()

				// 分数
				ctx.setFillStyle(C_PRIMARY)
				ctx.setFontSize(48)
				ctx.font = 'bold 48px sans-serif'
				ctx.fillText(String(this.score), 40, y + 65)

				// 评级
				ctx.setFontSize(14)
				ctx.setFillStyle(C_PRIMARY_LT)
				ctx.fillText(this.getGrade(this.score) + ' ' + this.getGradeLabel(this.score), 130, y + 40)
				ctx.setFontSize(12)
				ctx.setFillStyle(C_TEXT2)
				ctx.fillText(this.getScoreTitle(this.score), 130, y + 65)
				ctx.setFillStyle(C_TEXT3)
				ctx.setFontSize(11)
				// 评分文字截断
				const scoreText = this.getScoreText(this.score)
				ctx.fillText(scoreText.length > 20 ? scoreText.substring(0, 20) + '...' : scoreText, 130, y + 88)

				// 趋势
				ctx.setFontSize(11)
				ctx.setFillStyle(C_SUCCESS)
				ctx.fillText(this.scoreTrend + '  ' + this.userRanking, 40, y + 108)
				y += 140

				// ===== 趋势分析 =====
				ctx.setFillStyle(C_CARD)
				this.roundRect(ctx, 20, y, w - 40, 280, 16)
				ctx.fill()

				ctx.setFillStyle(C_TEXT)
				ctx.setFontSize(15)
				ctx.font = 'bold 15px sans-serif'
				ctx.fillText('趋势分析', 40, y + 32)

				// 柱状图
				const chartX = 40
				const chartW = w - 80
				const barW = chartW / 7 * 0.55
				const barMaxH = 140
				const chartBaseY = y + 200

				// 网格线
				ctx.setStrokeStyle('rgba(0,0,0,0.04)')
				ctx.setLineWidth(1)
				for (let i = 0; i <= 4; i++) {
					const gy = chartBaseY - (barMaxH / 4) * i
					ctx.beginPath()
					ctx.moveTo(chartX, gy)
					ctx.lineTo(chartX + chartW, gy)
					ctx.stroke()
				}

				// 柱子
				this.weeklyData.forEach((item, index) => {
					const bx = chartX + (chartW / 7) * index + (chartW / 7 - barW) / 2
					const bh = (item.value / 100) * barMaxH
					const grad = ctx.createLinearGradient(bx, chartBaseY - bh, bx, chartBaseY)
					grad.addColorStop(0, C_PRIMARY_LT)
					grad.addColorStop(1, C_PRIMARY)
					ctx.setFillStyle(grad)
					this.roundRect(ctx, bx, chartBaseY - bh, barW, bh, 4)
					ctx.fill()

					// 标签
					ctx.setFontSize(10)
					ctx.setFillStyle(C_TEXT3)
					ctx.setTextAlign('center')
					ctx.fillText(item.day, bx + barW / 2, chartBaseY + 18)
					ctx.setTextAlign('left')
				})

				// 统计
				ctx.setFontSize(12)
				ctx.setFillStyle(C_TEXT3)
				ctx.fillText('平均频率', 40, y + 250)
				ctx.setFillStyle(C_PRIMARY)
				ctx.font = 'bold 14px sans-serif'
				ctx.fillText(this.averageFrequency + ' 次/天', 120, y + 250)
				ctx.setFillStyle(C_TEXT3)
				ctx.setFontSize(12)
				ctx.fillText('达标天数', 220, y + 250)
				ctx.setFillStyle(C_SUCCESS)
				ctx.font = 'bold 14px sans-serif'
				ctx.fillText(this.qualifiedDays + ' 天', 300, y + 250)
				y += 300

				// ===== 健康指标 =====
				ctx.setFillStyle(C_CARD)
				this.roundRect(ctx, 20, y, w - 40, 60 + this.metrics.length * 70, 16)
				ctx.fill()

				ctx.setFillStyle(C_TEXT)
				ctx.setFontSize(15)
				ctx.font = 'bold 15px sans-serif'
				ctx.fillText('健康指标', 40, y + 32)
				y += 50

				this.metrics.forEach((metric) => {
					// 图标圆
					ctx.setFillStyle(metric.color || C_PRIMARY)
					ctx.beginPath()
					ctx.arc(55, y + 25, 16, 0, Math.PI * 2)
					ctx.fill()
					ctx.setFillStyle('#ffffff')
					ctx.beginPath()
					ctx.arc(55, y + 25, 12, 0, Math.PI * 2)
					ctx.fill()
					ctx.setFontSize(14)
					ctx.setTextAlign('center')
					ctx.setFillStyle(C_TEXT)
					ctx.setTextAlign('left')

					// 值+标签
					ctx.setFontSize(14)
					ctx.setFillStyle(C_TEXT)
					ctx.fillText(metric.value, 85, y + 22)
					ctx.setFontSize(11)
					ctx.setFillStyle(C_TEXT3)
					ctx.fillText(metric.label, 85, y + 42)
					y += 70
				})
				y += 10

				// ===== AI 总结 =====
			const summaryLines = this.wrapText(ctx, this.aiSummary, w - 80, 14)
			const summaryH = 50 + summaryLines.length * 22 + 40
			ctx.setFillStyle(C_CARD)
			this.roundRect(ctx, 20, y, w - 40, summaryH, 16)
			ctx.fill()

			ctx.setFillStyle(C_TEXT)
			ctx.setFontSize(15)
			ctx.font = 'bold 15px sans-serif'
			ctx.fillText('AI ' + this.periodLabel + '总结', 40, y + 32)
			y += 50

				ctx.setFontSize(13)
				ctx.setFillStyle(C_TEXT2)
				summaryLines.forEach((line) => {
					ctx.fillText(line, 40, y)
					y += 22
				})
				y += 16

				// 标签
				if (this.aiSummaryTags && this.aiSummaryTags.length > 0) {
					let tagX = 40
					this.aiSummaryTags.forEach((tag) => {
						ctx.setFontSize(10)
						const tagW = ctx.measureText(tag).width + 20
						ctx.setFillStyle('rgba(141, 75, 0, 0.06)')
						this.roundRect(ctx, tagX, y - 14, tagW, 22, 6)
						ctx.fill()
						ctx.setFillStyle(C_PRIMARY)
						ctx.fillText(tag, tagX + 10, y + 1)
						tagX += tagW + 8
					})
					y += 30
				}
				y += 10

				// ===== 个性化建议 =====
				ctx.setFillStyle(C_TEXT)
				ctx.setFontSize(15)
				ctx.font = 'bold 15px sans-serif'
				ctx.fillText('个性化建议', 40, y + 32)
				y += 50

				this.tips.forEach((tip) => {
					ctx.setFillStyle(C_CARD)
					this.roundRect(ctx, 20, y, w - 40, 80, 12)
					ctx.fill()

					// emoji 圆
					ctx.setFillStyle((tip.color || C_PRIMARY) + '15')
					ctx.beginPath()
					ctx.arc(55, y + 40, 20, 0, Math.PI * 2)
					ctx.fill()
					ctx.setFontSize(18)
					ctx.setTextAlign('center')
					ctx.setTextAlign('left')

					ctx.setFontSize(13)
					ctx.setFillStyle(C_TEXT)
					ctx.font = 'bold 13px sans-serif'
					ctx.fillText(tip.title, 90, y + 30)
					ctx.setFontSize(11)
					ctx.setFillStyle(C_TEXT3)
					const tipDescLines = this.wrapText(ctx, tip.desc, w - 130, 11)
					tipDescLines.slice(0, 2).forEach((line, i) => {
						ctx.fillText(line, 90, y + 50 + i * 16)
					})
					y += 95
				})

				y += 20

				// ===== 绘制并导出 =====
				ctx.draw(false, () => {
					setTimeout(() => {
						uni.canvasToTempFilePath({
							canvasId: 'reportCanvas',
							fileType: 'png',
							quality: 1,
							destWidth: w * dpr,
							destHeight: h * dpr,
							success: (res) => {
								uni.saveImageToPhotosAlbum({
									filePath: res.tempFilePath,
									success: () => resolve(res.tempFilePath),
									fail: (err) => reject(new Error('保存相册失败: ' + (err.errMsg || '')))
								})
							},
							fail: (err) => reject(new Error('生成图片失败: ' + (err.errMsg || '')))
						})
					}, 300)
				})
			},

			// 圆角矩形
			roundRect(ctx, x, y, w, h, r) {
				ctx.beginPath()
				ctx.moveTo(x + r, y)
				ctx.lineTo(x + w - r, y)
				ctx.arcTo(x + w, y, x + w, y + r, r)
				ctx.lineTo(x + w, y + h - r)
				ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
				ctx.lineTo(x + r, y + h)
				ctx.arcTo(x, y + h, x, y + h - r, r)
				ctx.lineTo(x, y + r)
				ctx.arcTo(x, y, x + r, y, r)
				ctx.closePath()
			},

			// 文字换行
			wrapText(ctx, text, maxWidth, fontSize) {
				if (!text) return ['暂无分析']
				ctx.setFontSize(fontSize)
				const chars = text.split('')
				const lines = []
				let current = ''
				for (const ch of chars) {
					const test = current + ch
					if (ctx.measureText(test).width > maxWidth && current) {
						lines.push(current)
						current = ch
					} else {
						current = test
					}
				}
				if (current) lines.push(current)
				return lines
			},
			handleAction(action) {
				const actions = {
					setReminder: () => uni.navigateTo({ url: '/pages/reminder/reminder' }),
					viewRecipes: () => uni.navigateTo({ url: '/pages/recipes/recipes' }),
					trackWater: () => uni.navigateTo({ url: '/pages/water/water' }),
					startWorkout: () => uni.navigateTo({ url: '/pages/workout/workout' })
				}
				if (actions[action]) actions[action]()
			}
		}
	}
</script>

<style lang="scss" scoped>
	// ===== 设计令牌 =====
	$primary: #8d4b00;
	$primary-light: #b15f00;
	$primary-lighter: #ffcc00;
	$primary-bg: #fef8f3;
	
	$secondary: #887364;
	$success: #10B981;
	$warning: #F59E0B;
	$danger: #EF4444;
	
	$text-primary: #2a1f15;
	$text-secondary: #554336;
	$text-tertiary: #887364;
	
	$bg-page: #fef8f3;
	$bg-card: #FFFFFF;
	$bg-glass: rgba(255, 255, 255, 0.85);
	
	$shadow-sm: 0 4rpx 16rpx rgba(146, 64, 14, 0.06);
	$shadow-md: 0 8rpx 32rpx rgba(146, 64, 14, 0.08);
	$shadow-lg: 0 16rpx 56rpx rgba(141, 75, 0, 0.14), 0 4rpx 12rpx rgba(146, 64, 14, 0.06);
	$shadow-glow: 0 0 24rpx rgba(141, 75, 0, 0.10), 0 4rpx 16rpx rgba(177, 95, 0, 0.06);

	// ===== 动画 =====
	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(30rpx); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	@keyframes scaleIn {
		from { opacity: 0; transform: scale(0.9); }
		to { opacity: 1; transform: scale(1); }
	}
	
	@keyframes barGrow {
		from { height: 0; }
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 0.7; }
		50% { opacity: 0.92; }
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8rpx); }
	}
	
	@keyframes shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	// ===== 内容区 =====
	.content {
		padding: 24rpx 24rpx 60rpx;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	// ===== 跑马灯：报告生成规则说明 =====
	.marquee-bar {
		width: 100%;
		overflow: hidden;
		background: rgba(141, 75, 0, 0.06);
		border-radius: 12rpx;
		padding: 12rpx 0;
	}
	.marquee-content {
		display: inline-flex;
		white-space: nowrap;
		animation: marquee-scroll 20s linear infinite;
	}
	.marquee-text {
		font-size: 24rpx;
		color: rgba(141, 75, 0, 0.7);
		padding-right: 80rpx;
	}
	@keyframes marquee-scroll {
		0% { transform: translateX(0); }
		100% { transform: translateX(-50%); }
	}

	// ===== 报告头部 =====
	.report-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 40rpx 32rpx;
		border-radius: 32rpx;
		border: 1rpx solid rgba(141, 75, 0, 0.08);
		animation: fadeInUp 0.5s ease-out;
		position: relative;
		overflow: hidden;
		
		&::before {
			content: '';
			position: absolute;
			top: -50%;
			left: -50%;
			width: 200%;
			height: 200%;
			background: radial-gradient(circle at 30% 30%, rgba(141, 75, 0, 0.04) 0%, transparent 50%);
		}
	}

	.header-badge {
		background: linear-gradient(135deg, $primary, $primary-light);
		padding: 8rpx 24rpx;
		border-radius: 100rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.2);
		
		.badge-text {
			font-size: 22rpx;
			font-weight: 600;
			color: #FFFFFF;
		}
	}

	.report-title {
		font-size: 40rpx;
		font-weight: 800;
		color: $text-primary;
		margin-bottom: 20rpx;
		letter-spacing: -1rpx;
	}

	.report-meta {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.meta-icon {
		font-size: 24rpx;
		opacity: 0.5;
	}

	.meta-divider {
		width: 4rpx;
		height: 4rpx;
		border-radius: 50%;
		background: $text-tertiary;
	}

	.report-date, .report-status {
		font-size: 24rpx;
		color: $text-secondary;
	}

	// ===== 评分卡片 - 逆时针旋转加载动画 =====
	.score-card {
		background: $bg-card;
		border-radius: 32rpx;
		padding: 40rpx;
		box-shadow: $shadow-md;
		animation: fadeInUp 0.5s ease-out 0.1s both;
		position: relative;
		overflow: hidden;
		
		&::after {
			content: '';
			position: absolute;
			top: 0;
			right: 0;
			width: 200rpx;
			height: 200rpx;
			background: radial-gradient(circle, rgba(141, 75, 0, 0.04) 0%, transparent 70%);
		}
	}

	.score-main {
		display: flex;
		align-items: center;
		gap: 40rpx;
		margin-bottom: 32rpx;
	}

	.score-ring-container {
		position: relative;
		width: 260rpx;
		height: 100rpx;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 8rpx;
	}

	// 3D倾斜透视容器
	.ripple-container {
		position: relative;
		width: 200rpx;
		height: 200rpx;
		border-radius: 50%;
		transform: rotateX(60deg);
		transform-style: preserve-3d;
		z-index: 1;
	}

	// 中间发光小圆点
	.center-dot {
		position: absolute;
		width: 30rpx;
		height: 30rpx;
		border-radius: 50%;
		background: $primary;
		box-shadow: 0 0 24rpx rgba(141, 75, 0, 0.4);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 3;
	}

	// 涟漪效果
	.ripple {
		position: absolute;
		width: 20rpx;
		height: 20rpx;
		border-radius: 50%;
		border: 2rpx solid $primary;
		opacity: 0.6;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation: ripple-wave 4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
	}

	.ripple:nth-child(2) { animation-delay: 0s; }
	.ripple:nth-child(3) { animation-delay: 1.3s; }
	.ripple:nth-child(4) { animation-delay: 2.6s; }

	// 涟漪扩散动画 - 更大的涟漪范围
	@keyframes ripple-wave {
		0% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0.6;
		}
		100% {
			transform: translate(-50%, -50%) scale(10);
			opacity: 0;
		}
	}

	.score-value {
		font-size: 96rpx;
		font-weight: 800;
		color: $primary;
		line-height: 1;
		z-index: 2;
	}

	.score-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.score-badge {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.1), rgba(177, 95, 0, 0.1));
		padding: 8rpx 20rpx;
		border-radius: 12rpx;
		align-self: flex-start;
		border: 1rpx solid rgba(141, 75, 0, 0.15);
		
		.badge-grade {
			font-size: 28rpx;
			font-weight: 800;
			color: $primary;
		}
		
		.badge-label {
			font-size: 22rpx;
			color: $primary-light;
			font-weight: 600;
		}
	}

	.score-title {
		font-size: 32rpx;
		font-weight: 700;
		color: $text-primary;
		line-height: 1.3;
	}

	.score-text {
		font-size: 24rpx;
		color: $text-secondary;
		line-height: 1.6;
	}

	.score-trend {
		display: flex;
		gap: 16rpx;
		padding-top: 24rpx;
		border-top: 1rpx solid rgba(0, 0, 0, 0.04);
	}

	.trend-item {
		display: flex;
		align-items: center;
		gap: 8rpx;
		background: rgba(16, 185, 129, 0.06);
		padding: 12rpx 20rpx;
		border-radius: 16rpx;
		
		&.up {
			background: rgba(16, 185, 129, 0.08);
		}
		
		.trend-icon {
			font-size: 24rpx;
		}
		
		.trend-text {
			font-size: 22rpx;
			color: $success;
			font-weight: 600;
		}
	}

	// ===== 通用区块卡片 =====
	.section-card {
		background: $bg-card;
		border-radius: 32rpx;
		padding: 32rpx;
		box-shadow: $shadow-sm;
		animation: fadeInUp 0.5s ease-out both;
		
		&:nth-child(3) { animation-delay: 0.2s; }
		&:nth-child(4) { animation-delay: 0.3s; }
		&:nth-child(5) { animation-delay: 0.4s; }
	}

	// 图表区块特殊样式 - 加高
	.chart-section {
		padding-top: 20rpx;
		padding-bottom: 40rpx;
	}

	// ===== 趋势分析：周期切换 & 图表类型切换 =====
	.trend-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24rpx;
	}

	// 周期切换按钮组（周/月/年 或 周/月/日）
	.period-switcher {
		display: flex;
		gap: 8rpx;
		background: rgba(0, 0, 0, 0.04);
		border-radius: 12rpx;
		padding: 4rpx;
	}

	.period-btn {
		padding: 8rpx 24rpx;
		font-size: 24rpx;
		color: #999;
		border-radius: 8rpx;
		transition: all 0.2s;

		&.active {
			background: #fff;
			color: #8d4b00;
			font-weight: 600;
			box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
		}
	}

	// ===== 月视图热力图 =====
.heatmap-container {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.heatmap-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	gap: 4rpx;
}

.heatmap-cell {
	aspect-ratio: 1;
	border-radius: 6rpx;
	background: rgba(141, 75, 0, 0.04);
	border: 1rpx solid rgba(141, 75, 0, 0.06);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;

	/* 少→多5级色阶，与图例颜色一致 */
	&.level-1 { background: rgba(141, 75, 0, 0.12); border-color: rgba(141, 75, 0, 0.2); }
	&.level-2 { background: rgba(141, 75, 0, 0.3); border-color: rgba(141, 75, 0, 0.3); }
	&.level-3 { background: rgba(141, 75, 0, 0.5); border-color: rgba(141, 75, 0, 0.4); }
	&.level-4 { background: rgba(141, 75, 0, 0.7); border-color: rgba(141, 75, 0, 0.5); }
	&.level-5 { background: rgba(141, 75, 0, 0.9); border-color: rgba(141, 75, 0, 0.6); }

	/* 选中状态：不覆盖背景色，仅加边框/阴影/缩放 */
	&.cell-selected {
		border-color: $primary;
		box-shadow: 0 2rpx 12rpx rgba(141, 75, 0, 0.3);
		transform: scale(1.05);
	}
}

.cell-score {
	font-size: 16rpx;
	font-weight: 700;
	color: $primary;
	line-height: 1;

	/* 深色背景上使用白色文字保证可读性 */
	.level-4 & { color: rgba(255, 255, 255, 0.9); }
	.level-5 & { color: rgba(255, 255, 255, 0.95); }
}

.cell-day {
	font-size: 12rpx;
	color: $text-tertiary;
	margin-top: 2rpx;
	line-height: 1;

	/* 深色背景上使用浅色文字 */
	.level-4 & { color: rgba(255, 255, 255, 0.7); }
	.level-5 & { color: rgba(255, 255, 255, 0.7); }
}

.heatmap-legend {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 6rpx;
}

.legend-label {
	font-size: 18rpx;
	color: $text-tertiary;
}

.legend-cell {
	width: 24rpx;
	height: 24rpx;
	border-radius: 6rpx;
}

// ===== AI总结磨砂玻璃遮罩 =====
.ai-summary-body-wrapper {
	position: relative;
}

.summary-blur-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(255, 249, 240, 0.45);
	backdrop-filter: blur(18px) saturate(1.4);
	-webkit-backdrop-filter: blur(18px) saturate(1.4);
	border-radius: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10;
}

.overlay-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
	padding: 40rpx;
}

.overlay-icon {
	font-size: 48rpx;
}

.overlay-text {
	font-size: 26rpx;
	color: $text-secondary;
	text-align: center;
	line-height: 1.6;
	font-weight: 500;
}

// AI总结右侧区域（AI标签）
.ai-summary-right {
	display: flex;
	align-items: center;
	gap: 12rpx;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 40rpx;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.header-icon {
		width: 48rpx;
		height: 48rpx;
		border-radius: 14rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		
		&.chart-icon { background: linear-gradient(135deg, #8d4b00, #b15f00); }
		&.metric-icon { background: linear-gradient(135deg, #8d4b00, #b15f00); }
		&.tip-icon { background: linear-gradient(135deg, #b15f00, #ffcc00); }
		
		.icon-img {
			font-size: 28rpx;
		}
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 700;
		color: $text-primary;
	}

	.section-subtitle {
		font-size: 22rpx;
		color: $text-tertiary;
		font-weight: 500;
	}

	// ===== 图表区域 - 重新优化布局 =====
	.chart-area {
		display: flex;
		gap: 16rpx;
		margin-bottom: 16rpx;
		padding-top: 30rpx;
	}

	.chart-y-axis {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: flex-end;
		height: 160rpx;
		padding-right: 12rpx;
		margin-top: 0;

		.y-label {
			font-size: 18rpx;
			color: $text-tertiary;
			font-weight: 500;
			line-height: 1;
		}
	}

	.chart-main {
		flex: 1;
		position: relative;
		height: 200rpx;
	}

	.chart-grid {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 40rpx;
		display: flex;
		flex-direction: column;
		justify-content: space-between;

		.grid-line {
			height: 1rpx;
			background: rgba(0, 0, 0, 0.04);
		}
	}

	.chart-bars {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		height: 160rpx;
		padding: 0 8rpx;
		position: absolute;
		bottom: 40rpx;
		left: 0;
		right: 0;
		z-index: 2;
	}

	.bar-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		position: relative;
		cursor: pointer;
		height: 160rpx;
	}

	.bar-tooltip {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-bottom: 8rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #8d4b00, #b15f00);
		padding: 8rpx 16rpx;
		border-radius: 12rpx;
		animation: scaleIn 0.2s ease-out;
		white-space: nowrap;
		box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.18);
		z-index: 10;
		
		.tooltip-value {
			font-size: 20rpx;
			color: #FFFFFF;
			font-weight: 600;
		}
	}

	.tooltip-arrow {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 10rpx solid transparent;
		border-right: 10rpx solid transparent;
		border-top: 10rpx solid #8d4b00;
	}

	.bar-track {
		width: 100%;
		height: 160rpx;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.bar-fill {
		width: 36rpx;
		border-radius: 18rpx 18rpx 0 0;
		background: linear-gradient(180deg, $primary-light 0%, $primary 100%);
		position: relative;
		overflow: hidden;
		animation: barGrow 0.8s ease-out backwards;
		transition: all 0.3s;
		min-height: 0;
		
		&.empty-bar {
			background: rgba(136, 115, 100, 0.08);
			min-height: 8rpx;
			border-radius: 8rpx;
			width: 12rpx;
			margin: 0 12rpx;
		}
		
		&.bar-active {
			background: linear-gradient(180deg, $primary 0%, #6d3800 100%);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.18);
			transform: scaleX(1.15);
		}

		.bar-shine {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: 40%;
			background: linear-gradient(180deg, rgba(255, 248, 235, 0.15) 0%, transparent 100%);
			border-radius: 18rpx 18rpx 0 0;
		}
	}

	.bar-label {
		font-size: 20rpx;
		color: $text-tertiary;
		font-weight: 500;
		transition: all 0.2s;
		margin-top: 12rpx;
		position: absolute;
		bottom: -40rpx;

		&.label-active {
			color: $primary;
			font-weight: 700;
		}
	}

	/* 月视图：柱子更细，标签更小以容纳所有天数 */
	.chart-bars.bars-month .bar-label {
		font-size: 14rpx;
	}
	.chart-bars.bars-year .bar-label {
		font-size: 16rpx;
	}

	// ===== 图表统计 =====
	.chart-stats {
		display: flex;
		align-items: center;
		padding-top: 16rpx;
		border-top: 1rpx solid rgba(0, 0, 0, 0.04);
		// 为底部标签留出空间
		margin-top: 40rpx;
	}

	.stat-card {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 0 8rpx;
	}

	.stat-icon-wrapper {
		width: 48rpx;
		height: 48rpx;
		border-radius: 14rpx;
		background: rgba(141, 75, 0, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		
		&.orange { background: rgba(245, 158, 11, 0.08); }
		&.green { background: rgba(16, 185, 129, 0.08); }
		
		.stat-icon {
			font-size: 24rpx;
			opacity: 0.7;
		}
	}

	.stat-info {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.stat-label {
		font-size: 20rpx;
		color: $text-tertiary;
		font-weight: 500;
	}

	.stat-value {
		font-size: 28rpx;
		font-weight: 700;
		color: $text-primary;
		
		.stat-unit {
			font-size: 20rpx;
			color: $text-secondary;
			font-weight: 500;
		}
	}

	// ===== 健康指标网格 =====
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16rpx;
	}

	.metric-card {
		background: $bg-page;
		border-radius: 24rpx;
		padding: 20rpx;
		display: flex;
		align-items: center;
		gap: 16rpx;
		animation: fadeInUp 0.4s ease-out backwards;
		transition: all 0.2s;
		border: 1rpx solid transparent;
		
		&:active {
			transform: scale(0.98);
			background: #f9f0e9;
		}
	}

	.metric-progress-ring {
		position: relative;
		width: 80rpx;
		height: 80rpx;
		flex-shrink: 0;
		border-radius: 50%;
		
		.progress-fill {
			position: absolute;
			width: 100%;
			height: 100%;
			border-radius: 50%;
			opacity: 0.15;
		}
		
		.metric-icon-inner {
			position: absolute;
			inset: 10rpx;
			border-radius: 50%;
			background: #FFFFFF;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
			
			.metric-emoji {
			font-size: 24rpx;
		}
		}
		
		&.qualified {
			.progress-fill {
				background: #10B981;
			}
		}
		
		&.unqualified {
			.progress-fill {
				background: #EF4444;
			}
		}
	}

	.metric-detail {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}

	.metric-value {
		font-size: 26rpx;
		font-weight: 700;
		color: $text-primary;
	}

	.metric-label {
		font-size: 20rpx;
		color: $text-secondary;
		font-weight: 500;
	}

	.metric-bar {
		width: 100%;
		height: 10rpx;
		background: rgba(0, 0, 0, 0.04);
		border-radius: 5rpx;
		overflow: hidden;
		margin-top: 8rpx;
		
		.metric-bar-fill {
			height: 100%;
			border-radius: 5rpx;
			transition: width 0.8s ease-out;
		}
	}

	// ===== AI 总结卡片 =====
	.ai-summary-card {
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.04) 0%, rgba(177, 95, 0, 0.02) 100%);
		border: 1rpx solid rgba(141, 75, 0, 0.1);
	}

	.ai-icon {
		background: linear-gradient(135deg, #8d4b00, #b15f00) !important;

		.ai-spark {
			font-size: 28rpx;
		}
	}

	.ai-badge {
		font-size: 20rpx;
		font-weight: 700;
		color: #8d4b00;
		background: rgba(141, 75, 0, 0.08);
		padding: 6rpx 16rpx;
		border-radius: 10rpx;
		letter-spacing: 2rpx;
	}

	.ai-summary-body {
		margin-bottom: 20rpx;
	}

	.ai-summary-text {
		font-size: 26rpx;
		color: #554336;
		line-height: 1.8;
		text-align: justify;
	}

	.ai-summary-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.ai-tag {
		font-size: 20rpx;
		font-weight: 600;
		color: #8d4b00;
		background: rgba(141, 75, 0, 0.06);
		padding: 8rpx 18rpx;
		border-radius: 10rpx;
		border: 1rpx solid rgba(141, 75, 0, 0.1);
	}

	// ===== 建议宫格视图 =====
	.tips-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16rpx;
	}

	.tip-grid-card {
		background: #fef8f3;
		border-radius: 24rpx;
		padding: 28rpx 24rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 16rpx;
		border: 1rpx solid rgba(141, 75, 0, 0.06);
		animation: fadeInUp 0.4s ease-out backwards;
		transition: all 0.2s;

		&:active {
			transform: scale(0.97);
			background: #f9f0e9;
		}
	}

	.tip-grid-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tip-grid-emoji {
		font-size: 40rpx;
	}

	.tip-grid-title {
		font-size: 26rpx;
		font-weight: 700;
		color: $text-primary;
		line-height: 1.3;
	}

	.tip-grid-desc {
		font-size: 22rpx;
		color: $text-secondary;
		line-height: 1.5;
	}
	// ===== 底部操作栏 =====
	.action-bar {
		display: flex;
		gap: 20rpx;
		margin-top: 8rpx;
		animation: fadeInUp 0.5s ease-out 0.5s both;
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		padding: 28rpx;
		border-radius: 24rpx;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
		}

		&.primary {
			background: linear-gradient(135deg, $primary, $primary-light);
			box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.18);
			
			.btn-icon {
				width: 40rpx;
				height: 40rpx;
			}
			
			.btn-text {
				color: #FFFFFF;
			}
		}
		
		.btn-icon {
			font-size: 32rpx;
		}
		
		.btn-text {
			font-size: 28rpx;
			font-weight: 600;
		}
	}
</style>'''
