<template>
	<view class="page-container">
		<custom-nav title="排行" align="left" :bold="true" />
		<!-- 固定顶部 header（磨砂栏：跑马灯公告） -->
		<view class="sticky-header">
			<view class="notice-bar">
				<AppIcon name="speakerphone" :size="28" />
				<view class="marquee-wrap">
					<view class="marquee-content">
						<text class="marquee-text">{{ marqueeText }}</text>
						<text class="marquee-text">{{ marqueeText }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 加载中 -->
		<view v-if="isLoading" class="loading-state">
			<text class="loading-text">加载中...</text>
		</view>

		<!-- 未登录提示 -->
		<view v-else-if="needLogin" class="empty-state">
			<AppIcon name="trophy" :size="88" />
			<text class="empty-text">登录后查看排行榜</text>
			<text class="empty-sub">登录即可参与蹲坑排名</text>
		</view>

		<template v-else>
			<!-- 暂无数据 -->
			<view v-if="leaderboardData.length === 0" class="empty-state">
				<AppIcon name="trophy" :size="88" />
				<text class="empty-text">今日暂无排行数据</text>
				<text class="empty-sub">快去记录，争做蹲坑王！</text>
			</view>

			<template v-else>
				<!-- 领奖台（2-1-3 布局） -->
				<view v-if="leaderboardData.length >= 1" class="podium">
					<view
						class="podium-item"
						:class="['rank-' + item.rank]"
						v-for="item in podiumData"
						:key="item.rank"
					>
						<AppIcon v-if="item.rank === 1" class="crown" name="crown" :size="40" />
						<view class="avatar-wrap">
							<view v-if="item.rank === 1" class="ripple-ring"></view>
							<image class="avatar" :src="item.avatar" mode="aspectFill" />
							<view class="rank-badge" :class="'badge-' + item.rank"><text class="badge-text">{{ item.rank }}</text></view>
						</view>
						<view class="podium-card">
							<text class="podium-name">{{ item.name }}</text>
							<view class="podium-time">
								<AppIcon class="time-icon" name="clock" :size="24" />
								<text class="time-text">{{ item.time }}</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 第 4+ 名列表 -->
				<view v-if="restList.length > 0" class="rank-list">
					<view
						class="rank-item"
						v-for="item in restList"
						:key="item.rank"
					>
						<view class="rank-num">{{ item.rank }}</view>
						<image class="rank-avatar" :src="item.avatar" mode="aspectFill" />
						<view class="rank-info">
							<text class="rank-name">{{ item.name }}</text>
							<view class="rank-time">
								<AppIcon class="time-icon" name="clock" :size="24" />
								<text class="time-text">{{ item.time }}</text>
							</view>
						</view>
						<text class="rank-arrow">›</text>
					</view>
				</view>

				<!-- 底部固定"我的排名"卡 -->
				<view v-if="myData" class="my-rank-card">
					<view class="my-left">
						<view class="my-badge"><text class="my-badge-text">{{ myData.rank || '-' }}</text></view>
						<image class="my-avatar" :src="myData.avatar" mode="aspectFill" />
						<view class="my-info">
							<text class="my-name">{{ myData.name }}</text>
							<view class="my-time">
								<AppIcon class="time-icon" name="clock" :size="24" />
								<text class="time-text">{{ myData.time }}</text>
							</view>
						</view>
					</view>
					<text class="my-label">我的排名</text>
				</view>
			</template>
		</template>

		<!-- 登录检查弹窗 -->
		<ConfirmModal
			:visible="showLoginModal"
			title="提示"
			content="登录后才能查看排行榜，是否前往登录?"
			confirmText="去登录"
			cancelText="取消"
			@confirm="handleLoginConfirm"
			@cancel="showLoginModal = false"
		/>

		<!-- 新用户强制完善资料引导弹窗 -->
		<ConfirmModal
			:visible="showProfileSetupModal"
			title="完善资料"
			content="请先完善您的个人资料，才能继续使用"
			:showCancel="false"
			:closeOnMask="false"
			confirmText="去完善"
			@confirm="goToEditProfile"
			@cancel="showProfileSetupModal = false"
		/>
		<!-- 右下角浮窗记录按钮 -->
		<FloatingRecordButton />
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import FloatingRecordButton from '@/components/FloatingRecordButton/FloatingRecordButton.vue'
	import { rankingApi, configApi } from '@/js_sdk/sg-client/api.js'

	const DEFAULT_AVATAR = 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'

	export default {
		name: 'Ranking',
		components: {
			CustomNav,
			ConfirmModal,
			FloatingRecordButton,
			AppIcon
		},
		data() {
			return {
				isLoading: false,
				needLogin: false,
				leaderboardData: [],
				myData: null,
				showLoginModal: false,
				/* 新用户强制完善资料引导弹窗 */
				showProfileSetupModal: false,
				/* 跑马灯公告文案（后端配置缺失时使用默认文案） */
				marqueeText: '温馨提示：本榜单依据蹲坑排名时间进行排名，本榜单仅供娱乐，请关注真实身体感受'
			}
		},
		computed: {
			// 2-1-3 布局：左第二名、中第一名、右第三名
			// 不足 3 人时用占位数据补齐，确保冠亚季始终显示
			podiumData() {
				const top3 = this.leaderboardData.slice(0, 3)
				const placeholder = {
					name: '虚位以待',
					avatar: 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg',
					time: '--:--',
					total_duration: 0,
					record_count: 0
				}
				while (top3.length < 3) {
					top3.push({
						...placeholder,
						rank: top3.length + 1,
						user_id: 'placeholder-' + (top3.length + 1)
					})
				}
				return [top3[1], top3[0], top3[2]]
			},
			restList() {
				return this.leaderboardData.slice(3)
			}
		},
		onShow() {
			// 加载跑马灯公告文案（与登录状态无关，始终加载）
			this.loadMarqueeConfig()
			this.checkLoginAndLoad()

			// 检查是否需要完善资料（仅登录用户）
			if (!this.needLogin && uni.getStorageSync('needProfileSetup')) {
				if (!this.checkProfileComplete()) {
					this.showProfileSetupModal = true
				} else {
					uni.removeStorageSync('needProfileSetup')
				}
			}
		},
		methods: {
			/* 登录检查：未登录时显示提示，不加载排行数据 */
			checkLoginAndLoad() {
				const userId = uni.getStorageSync('userId')
				const token = uni.getStorageSync('token')
				if (!userId || !token) {
					this.needLogin = true
					this.showLoginModal = true
					return
				}
				this.needLogin = false
				this.loadRanking()
			},
			/* 确认登录：跳转到登录页（Tab页面用switchTab） */
			handleLoginConfirm() {
				this.showLoginModal = false
				uni.switchTab({ url: '/pages/profile/profile' })
			},
			async loadRanking() {
				this.isLoading = true
				const userId = uni.getStorageSync('userId')
				try {
					/* 使用 API 服务层获取排行榜数据 */
					const result = await rankingApi.get(userId, 10)

					if (result && result.code === 0) {
						const data = result.data
						this.leaderboardData = data.leaderboard || []
						this.myData = data.myRank || null
					} else {
						uni.showToast({
							title: (result && result.message) || '加载失败',
							icon: 'none'
						})
					}
				} catch (error) {
					console.error('排行榜加载异常:', error)
					uni.showToast({ title: '加载失败: ' + (error.message || ''), icon: 'none' })
				}
				this.isLoading = false
			},
			/* 加载跑马灯公告文案：从后端 config 读取 rankingMarqueeText，失败时保留默认文案 */
			async loadMarqueeConfig() {
				try {
					const result = await configApi.get()
					if (result && result.code === 0 && result.data && result.data.rankingMarqueeText) {
						this.marqueeText = result.data.rankingMarqueeText
					}
				} catch (e) {
					console.error('[ranking] 加载跑马灯配置失败:', e)
					// 使用默认文案，无需额外处理
				}
			},
			/* 检查用户资料是否完整：缺少昵称/性别/生日任一则视为未完善 */
			checkProfileComplete() {
				const userInfo = uni.getStorageSync('userInfo')
				if (!userInfo) return true
				const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
				if (!parsed.nickName || parsed.nickName === '微信用户') return false
				if (!parsed.gender) return false
				if (!parsed.birthday) return false
				return true
			},
			/* 引导弹窗确认后跳转到编辑资料页 */
			goToEditProfile() {
				this.showProfileSetupModal = false
				uni.navigateTo({
					url: '/pages/user-settings/edit-profile/edit-profile'
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	/* ---- 鸿蒙温润暖调 token（局部自包含，不依赖 uni.scss） ---- */
	$primary: #8d4b00;
	$primary-light: #b15f00;
	$bg-primary: #fef8f3;
	$text-primary: #2a1f15;
	$text-secondary: #554336;
	$text-muted: #887364;

	$frost-card: rgba(255, 249, 240, 0.82);
	$frost-bar: #fefaf3;
	$frost-border: 1rpx solid rgba(255, 220, 195, 0.45);
	$frost-blur: blur(20px) saturate(1.08);
	$shadow-card: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	$ease-harmony: cubic-bezier(0.4, 0, 0.2, 1);

	.page-container {
		padding: 0 32rpx;
		padding-bottom: 300rpx;
		min-height: 100vh;
		box-sizing: border-box;
		background-color: $bg-primary;
		font-family: "HarmonyOS Sans", "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	}

	/* ============ 固定顶部 header ============ */
	.sticky-header {
		position: sticky;
		top: 0;
		z-index: 100;
		margin: 0 -32rpx;
		background: $frost-bar;
		backdrop-filter: $frost-blur;
		-webkit-backdrop-filter: $frost-blur;
		border-bottom: 1rpx solid rgba(255, 220, 195, 0.4);
	}

	/* ============ 跑马灯公告 ============ */
	.notice-bar {
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 20rpx 32rpx 0;
	}

	.notice-icon {
		font-size: 32rpx;
		flex-shrink: 0;
	}

	.marquee-wrap {
		flex: 1;
		overflow: hidden;
	}

	.marquee-content {
		display: flex;
		white-space: nowrap;
		animation: marquee 6s linear infinite;
		will-change: transform;
	}

	.marquee-text {
		flex-shrink: 0;
		font-size: 24rpx;
		color: $text-muted;
		padding-right: 80rpx;
	}

	@keyframes marquee {
		0% { transform: translateX(0); }
		100% { transform: translateX(-50%); }
	}

	/* ============ 领奖台（2-1-3） ============ */
	.podium {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 16rpx;
		padding: 56rpx 0 32rpx;
	}

	.podium-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		position: relative;
		transition: transform 0.3s $ease-harmony;

		&:active {
			transform: scale(0.97);
		}
	}

	.podium-item.rank-1 {
		z-index: 2;
	}

	.crown {
		font-size: 48rpx;
		line-height: 1;
		margin-bottom: 8rpx;
		animation: crown-bob 2s ease-in-out infinite;
	}

	@keyframes crown-bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6rpx); }
	}

	.avatar-wrap {
		position: relative;
		width: 120rpx;
		height: 120rpx;
		margin-bottom: 16rpx;
		border-radius: 50%;
	}

	.podium-item.rank-1 .avatar-wrap {
		width: 140rpx;
		height: 140rpx;
		animation: breathing-pulse 2.4s ease-in-out infinite;
	}

	.podium-item.rank-3 .avatar-wrap {
		width: 104rpx;
		height: 104rpx;
	}

	.avatar {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		overflow: hidden;
		border: 4rpx solid rgba(255, 255, 255, 0.85);
		background-color: #ffffff;
		box-sizing: border-box;
	}

	.ripple-ring {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: rgba(177, 95, 0, 0.3);
		animation: ripple 2s ease-out infinite;
	}

	@keyframes ripple {
		0% { transform: scale(1); opacity: 0.18; }
		100% { transform: scale(3); opacity: 0; }
	}

	@keyframes breathing-pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(141, 75, 0, 0.18); }
		50% { box-shadow: 0 0 24rpx 8rpx rgba(177, 95, 0, 0.16); }
	}

	.rank-badge {
		position: absolute;
		bottom: 0;
		right: -4rpx;
		min-width: 36rpx;
		height: 36rpx;
		padding: 0 10rpx;
		border-radius: 9999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2rpx solid rgba(255, 255, 255, 0.9);
		box-shadow: 0 2rpx 8rpx rgba(141, 75, 0, 0.2);
		box-sizing: border-box;
		z-index: 10;
	}

	.badge-1 { background: linear-gradient(135deg, #d4a017, $primary-light); }
	.badge-2 { background: linear-gradient(135deg, $primary, $primary-light); }
	.badge-3 { background: linear-gradient(135deg, #a06b3a, #c08a5a); }

	.badge-text {
		font-size: 22rpx;
		font-weight: 700;
		color: #ffffff;
		line-height: 1;
	}

	.podium-card {
		width: 100%;
		box-sizing: border-box;
		background: $frost-card;
		backdrop-filter: $frost-blur;
		-webkit-backdrop-filter: $frost-blur;
		border: $frost-border;
		border-radius: 32rpx;
		box-shadow: $shadow-card;
		padding: 16rpx 20rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
	}

	.podium-name {
		font-size: 26rpx;
		font-weight: 600;
		color: $text-primary;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.podium-time {
		display: flex;
		align-items: center;
		gap: 4rpx;
	}

	.time-icon {
		font-size: 20rpx;
		line-height: 1;
	}

	.time-text {
		font-size: 22rpx;
		color: $text-secondary;
	}

	/* ============ 第 4+ 名列表 ============ */
	.rank-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		padding: 16rpx 0 32rpx;
	}

	.rank-item {
		display: flex;
		align-items: center;
		gap: 24rpx;
		background: $frost-card;
		backdrop-filter: $frost-blur;
		-webkit-backdrop-filter: $frost-blur;
		border: $frost-border;
		border-radius: 32rpx;
		box-shadow: $shadow-card;
		padding: 24rpx 28rpx;
		transition: transform 0.3s $ease-harmony;

		&:active {
			transform: scale(0.97);
		}
	}

	.rank-num {
		width: 56rpx;
		text-align: center;
		font-size: 36rpx;
		font-weight: 700;
		color: $primary;
		flex-shrink: 0;
	}

	.rank-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		border: 2rpx solid rgba(255, 255, 255, 0.85);
		background-color: #ffffff;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.rank-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.rank-name {
		font-size: 28rpx;
		font-weight: 600;
		color: $text-primary;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rank-time {
		display: flex;
		align-items: center;
		gap: 4rpx;
	}

	.rank-arrow {
		font-size: 40rpx;
		line-height: 1;
		color: $text-muted;
		flex-shrink: 0;
	}

	/* ============ 底部固定"我的排名"卡 ============ */
	.my-rank-card {
		position: fixed;
		left: 32rpx;
		right: 32rpx;
		bottom: 24rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 32rpx;
		border-radius: 48rpx;
		background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
		box-shadow: 0 8rpx 32rpx rgba(141, 75, 0, 0.30), 0 2rpx 8rpx rgba(141, 75, 0, 0.15);
		transition: transform 0.3s $ease-harmony;

		&:active {
			transform: scale(0.97);
		}
	}

	.my-left {
		display: flex;
		align-items: center;
		gap: 20rpx;
		min-width: 0;
	}

	.my-badge {
		min-width: 48rpx;
		height: 48rpx;
		padding: 0 12rpx;
		border-radius: 9999rpx;
		background: rgba(255, 255, 255, 0.25);
		border: 2rpx solid rgba(255, 255, 255, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.my-badge-text {
		font-size: 26rpx;
		font-weight: 700;
		color: #ffffff;
		line-height: 1;
	}

	.my-avatar {
		width: 72rpx;
		height: 72rpx;
		border-radius: 50%;
		border: 3rpx solid rgba(255, 255, 255, 0.85);
		background-color: #ffffff;
		flex-shrink: 0;
		box-sizing: border-box;
	}

	.my-info {
		display: flex;
		flex-direction: column;
		gap: 2rpx;
		min-width: 0;
	}

	.my-name {
		font-size: 28rpx;
		font-weight: 600;
		color: #ffffff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.my-time {
		display: flex;
		align-items: center;
		gap: 4rpx;
	}

	.my-rank-card .time-text {
		color: rgba(255, 255, 255, 0.9);
	}

	.my-label {
		font-size: 24rpx;
		color: rgba(255, 255, 255, 0.9);
		flex-shrink: 0;
	}

	/* ============ 空状态 / 加载状态 ============ */
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 200rpx 0;
	}

	.loading-text {
		font-size: 28rpx;
		color: $text-muted;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 200rpx 0;
		gap: 16rpx;
	}

	.empty-icon {
		font-size: 96rpx;
	}

	.empty-text {
		font-size: 32rpx;
		font-weight: 600;
		color: $text-primary;
	}

	.empty-sub {
		font-size: 26rpx;
		color: $text-muted;
	}
</style>
