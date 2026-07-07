<template>
	<view class="page-container-no-tab">
		<custom-nav title="绑定设备" showBack />

		<view class="content">
			<view class="intro-card">
				<view class="intro-icon">
					<AppIcon name="device-watch" :size="52" />
				</view>
				<view class="intro-body">
					<text class="intro-title">连接你的运动健康数据</text>
					<text class="intro-desc">授权后会自动同步手环的心率、血氧、步数等数据，AI 报告会结合这些指标进行分析。</text>
				</view>
			</view>

			<!-- 接入流程 -->
			<view class="flow-card">
				<view class="flow-step">
					<view class="flow-index">1</view>
					<text class="flow-text">在「华为运动健康」App 中绑定手环或手表，并开启数据同步</text>
				</view>
				<view class="flow-step">
					<view class="flow-index">2</view>
					<text class="flow-text">手环数据自动同步到华为运动健康云</text>
				</view>
				<view class="flow-step">
					<view class="flow-index">3</view>
					<text class="flow-text">点击下方按钮，在「华为智能穿戴」小程序完成授权</text>
				</view>
			</view>

			<!-- 华为 -->
			<view class="device-card">
				<view class="device-head">
					<view class="device-icon-wrap huawei">
						<AppIcon name="device-watch" :size="44" />
					</view>
					<view class="device-head-info">
						<text class="device-name">华为运动健康</text>
						<text class="device-meta">华为手环 / 手表 · Health Service Kit</text>
					</view>
					<view class="device-badge" :class="{ connected: device }">
						{{ device ? '已连接' : '未连接' }}
					</view>
				</view>

				<view v-if="device" class="metrics-grid">
					<view v-for="item in metricList" :key="item.label" class="metric-item">
						<text class="metric-value">{{ item.value }}<text class="metric-unit">{{ item.unit }}</text></text>
						<text class="metric-label">{{ item.label }}</text>
					</view>
					<view v-if="metricList.length === 0" class="empty-metrics">
						<text class="empty-metrics-text">暂未同步到数据，请确认华为运动健康 App 已开启数据同步后点击「立即同步」</text>
					</view>
				</view>

				<text v-if="device" class="sync-time">最近同步：{{ formatTime(device.last_sync_at) }}</text>

				<view class="device-actions">
					<view v-if="!device" class="primary-btn" @click="authorizeHuawei">
						<text class="primary-text">{{ authorizing ? '正在拉起授权…' : '去华为运动健康授权' }}</text>
					</view>
					<template v-else>
						<view class="secondary-btn" @click="syncNow">
							<text class="secondary-text">{{ syncing ? '同步中…' : '立即同步' }}</text>
						</view>
						<view class="danger-btn" @click="showUnbindModal = true">
							<text class="danger-text">解绑</text>
						</view>
					</template>
				</view>
			</view>

			<!-- 小米占位 -->
			<view class="device-card disabled">
				<view class="device-head">
					<view class="device-icon-wrap xiaomi">
						<AppIcon name="device-watch" :size="44" />
					</view>
					<view class="device-head-info">
						<text class="device-name">小米运动健康</text>
						<text class="device-meta">小米手环 / 手表</text>
					</view>
					<view class="device-badge soon">敬请期待</view>
				</view>
			</view>

			<text class="footnote">华为授权由华为智能穿戴小程序提供，数据仅用于生成你的健康分析。</text>
		</view>

		<ConfirmModal
			:visible="showUnbindModal"
			title="解绑华为运动健康"
			content="解绑后将停止同步新的健康数据，已同步的历史数据会保留。确定解绑吗？"
			confirmText="确定解绑"
			cancelText="取消"
			@confirm="unbindHuawei"
			@cancel="showUnbindModal = false"
		/>
	</view>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { deviceApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Devices',
		components: {
			ConfirmModal,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				device: null,
				metrics: null,
				authorizing: false,
				syncing: false,
				showUnbindModal: false
			}
		},
		computed: {
			metricList() {
				const m = this.metrics
				if (!m) return []
				const items = [
					{ label: '静息心率', value: m.resting_heart_rate || m.heart_rate || 0, unit: ' bpm' },
					{ label: '血氧', value: m.spo2 || 0, unit: '%' },
					{ label: '日均步数', value: m.steps || 0, unit: ' 步' },
					{ label: '压力', value: m.stress || 0, unit: '' },
					{ label: '体温', value: m.body_temperature || 0, unit: '℃' },
					{ label: '睡眠', value: m.sleep_hours || 0, unit: ' h' }
				]
				return items.filter(i => i.value > 0)
			}
		},
		onShow() {
			this.loadStatus()
			this.checkAuthCallback()
		},
		methods: {
			async loadStatus() {
				const userId = uni.getStorageSync('userId')
				if (!userId) return
				const res = await deviceApi.status(userId)
				if (res && res.code === 0 && res.data) {
					this.device = res.data.huawei
					this.metrics = res.data.metrics
				}
			},
			/* 从华为智能穿戴小程序返回时读取授权码 */
			async checkAuthCallback() {
				// #ifdef MP-WEIXIN
				const enter = wx.getEnterOptionsSync()
				const extra = enter && enter.referrerInfo && enter.referrerInfo.extraData
				if (!extra) return

				if (extra.error) {
					uni.showToast({ title: '华为授权未完成', icon: 'none' })
					return
				}
				if (!extra.code) return

				const lastCode = uni.getStorageSync('lastHuaweiCode')
				if (extra.code === lastCode) return
				uni.setStorageSync('lastHuaweiCode', extra.code)

				const userId = uni.getStorageSync('userId')
				if (!userId) return

				uni.showLoading({ title: '正在绑定华为…' })
				const res = await deviceApi.bindHuawei(userId, extra.code, extra.state)
				uni.hideLoading()

				if (res && res.code === 0) {
					this.metrics = res.data.metrics
					await this.loadStatus()
					this.clearReportCache()
					uni.showToast({ title: '绑定成功', icon: 'success' })
				} else {
					uni.showToast({ title: (res && res.message) || '绑定失败', icon: 'none' })
				}
				// #endif
			},
			async authorizeHuawei() {
				if (this.authorizing) return
				const configRes = await deviceApi.config()
				const config = configRes && configRes.data
				if (!config || !config.configured) {
					uni.showModal({
						title: '华为服务未配置',
						content: '需要先在后台配置华为 Health Kit 的 client_id 和 client_secret，才能拉起授权。',
						showCancel: false
					})
					return
				}

				this.authorizing = true
				const state = 'sg_' + Date.now()
				uni.setStorageSync('huaweiAuthState', state)

				uni.navigateToMiniProgram({
					appId: config.appid,
					path: config.path,
					extraData: {
						lang: 'zh-CN',
						client_id: config.client_id,
						scope: config.scopes,
						state
					},
					success: () => {
						this.authorizing = false
					},
					fail: (err) => {
						this.authorizing = false
						uni.showToast({ title: '无法打开华为智能穿戴小程序', icon: 'none' })
						console.error('[devices] 跳转华为小程序失败:', err)
					}
				})
			},
			async syncNow() {
				if (this.syncing) return
				const userId = uni.getStorageSync('userId')
				this.syncing = true
				uni.showLoading({ title: '正在同步…' })
				const res = await deviceApi.syncHuawei(userId)
				uni.hideLoading()
				this.syncing = false
				if (res && res.code === 0) {
					this.metrics = res.data.metrics
					await this.loadStatus()
					this.clearReportCache()
					uni.showToast({ title: '同步成功', icon: 'success' })
				} else {
					uni.showToast({ title: (res && res.message) || '同步失败', icon: 'none' })
				}
			},
			async unbindHuawei() {
				this.showUnbindModal = false
				const userId = uni.getStorageSync('userId')
				const res = await deviceApi.unbind(userId)
				if (res && res.code === 0) {
					this.device = null
					this.metrics = null
					this.clearReportCache()
					uni.showToast({ title: '已解绑', icon: 'success' })
				} else {
					uni.showToast({ title: (res && res.message) || '解绑失败', icon: 'none' })
				}
			},
			clearReportCache() {
				uni.removeStorageSync('aiReportCache_week')
				uni.removeStorageSync('aiReportCache_month')
				uni.removeStorageSync('aiReportCache_year')
			},
			formatTime(timestamp) {
				if (!timestamp) return '暂无'
				const d = new Date(timestamp)
				const pad = n => String(n).padStart(2, '0')
				return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
			}
		}
	}
</script>

<style lang="scss" scoped>
	$primary: #8d4b00;
	$primary-light: #b15f00;
	$text-primary: #2a1f15;
	$text-secondary: #554336;
	$text-muted: #887364;

	.content {
		padding: 24rpx 0 60rpx;
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.intro-card {
		display: flex;
		gap: 20rpx;
		padding: 32rpx;
		border-radius: 40rpx;
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.1) 0%, rgba(177, 95, 0, 0.04) 100%);
		border: 1rpx solid rgba(141, 75, 0, 0.12);
	}

	.intro-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 28rpx;
		background: rgba(255, 255, 255, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.intro-body {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}

	.intro-title {
		font-size: 32rpx;
		font-weight: 700;
		color: $text-primary;
	}

	.intro-desc {
		font-size: 24rpx;
		line-height: 1.7;
		color: $text-secondary;
	}

	.flow-card {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
		padding: 28rpx 32rpx;
		border-radius: 32rpx;
		background: rgba(255, 249, 240, 0.86);
		border: 1rpx solid rgba(255, 220, 195, 0.5);
	}

	.flow-step {
		display: flex;
		align-items: flex-start;
		gap: 16rpx;
	}

	.flow-index {
		width: 36rpx;
		height: 36rpx;
		border-radius: 50%;
		background: rgba(141, 75, 0, 0.1);
		color: $primary;
		font-size: 22rpx;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 2rpx;
	}

	.flow-text {
		flex: 1;
		font-size: 24rpx;
		line-height: 1.6;
		color: $text-secondary;
	}

	.device-card {
		padding: 32rpx;
		border-radius: 40rpx;
		background: rgba(255, 249, 240, 0.92);
		border: 1rpx solid rgba(255, 220, 195, 0.55);
		box-shadow: 0 8rpx 32rpx rgba(141, 75, 0, 0.08);

		&.disabled {
			opacity: 0.62;
		}
	}

	.device-head {
		display: flex;
		align-items: center;
		gap: 18rpx;
	}

	.device-icon-wrap {
		width: 88rpx;
		height: 88rpx;
		border-radius: 28rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		&.huawei {
			background: rgba(192, 44, 56, 0.08);
		}

		&.xiaomi {
			background: rgba(255, 103, 0, 0.08);
		}
	}

	.device-head-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.device-name {
		font-size: 32rpx;
		font-weight: 700;
		color: $text-primary;
	}

	.device-meta {
		font-size: 22rpx;
		color: $text-muted;
	}

	.device-badge {
		font-size: 20rpx;
		font-weight: 600;
		padding: 6rpx 16rpx;
		border-radius: 100rpx;
		color: $text-muted;
		background: rgba(136, 115, 100, 0.1);

		&.connected {
			color: #10b981;
			background: rgba(16, 185, 129, 0.1);
		}

		&.soon {
			color: #b45309;
			background: rgba(245, 158, 11, 0.12);
		}
	}

	.metrics-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-top: 24rpx;
	}

	.metric-item {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
		padding: 14rpx 20rpx;
		border-radius: 18rpx;
		background: rgba(141, 75, 0, 0.05);
		min-width: 130rpx;
	}

	.metric-value {
		font-size: 28rpx;
		font-weight: 700;
		color: $primary;
	}

	.metric-unit {
		font-size: 20rpx;
		font-weight: 500;
		color: $text-muted;
	}

	.metric-label {
		font-size: 20rpx;
		color: $text-muted;
	}

	.empty-metrics {
		width: 100%;
		padding: 16rpx;
		border-radius: 16rpx;
		background: rgba(141, 75, 0, 0.04);
	}

	.empty-metrics-text {
		font-size: 22rpx;
		line-height: 1.6;
		color: $text-muted;
	}

	.sync-time {
		display: block;
		margin-top: 16rpx;
		font-size: 21rpx;
		color: $text-muted;
	}

	.device-actions {
		display: flex;
		gap: 16rpx;
		margin-top: 28rpx;
	}

	.primary-btn {
		flex: 1;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, $primary-light 0%, $primary 100%);
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.2);
	}

	.primary-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.secondary-btn {
		flex: 1;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		background: rgba(141, 75, 0, 0.08);
	}

	.secondary-text {
		font-size: 28rpx;
		font-weight: 600;
		color: $primary;
	}

	.danger-btn {
		width: 160rpx;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(192, 83, 60, 0.08);
	}

	.danger-text {
		font-size: 26rpx;
		font-weight: 600;
		color: #c0533c;
	}

	.footnote {
		font-size: 21rpx;
		line-height: 1.6;
		color: $text-muted;
		text-align: center;
		padding: 0 20rpx;
	}
</style>