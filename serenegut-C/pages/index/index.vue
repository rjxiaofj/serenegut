<template>
	<view class="page-container">
		<!-- 透明导航栏占位（状态栏+导航栏高度，无标题，防止胶囊挡住内容） -->
		<custom-nav title="" />
		<ConfirmModal
			:visible="showLoginModal"
			title="提示"
			content="登录后才能使用此功能，是否前往登录？"
			confirmText="去登录"
			cancelText="取消"
			@confirm="goToLogin"
			@cancel="closeLoginModal"
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

		<!-- 封禁公告弹窗 -->
		<AnnouncementModal
			:visible="showBanModal"
			type="ban"
			:title="banInfo.title || '账号封禁通知'"
			:richContent="banInfo.rich_content || ''"
			:banImage="banInfo.ban_image || ''"
			:banExpiresAt="banInfo.expires_at || 0"
			:banIsPermanent="banInfo.is_permanent || false"
			@confirm="showBanModal = false"
		/>

		<!-- 普通公告弹窗 -->
		<AnnouncementModal
			:visible="showNormalAnnouncement"
			type="normal"
			:title="currentAnnouncement.title || '公告'"
			:richContent="currentAnnouncement.rich_content || currentAnnouncement.content || ''"
			@confirm="closeNormalAnnouncement"
		/>

		<view class="header">
			<view class="header-content">
				<text class="title">欢迎来到肠健康</text>
				<text class="subtitle">您的私人消化周期管家</text>
			</view>
		</view>

		<view class="record-section">
			<view class="ripple-container">
				<view class="ripple ripple-1"></view>
				<view class="ripple ripple-2"></view>
				<view class="ripple ripple-3"></view>
				<view class="record-btn" @click="goToRecord">
					<image :src="pageIcons.success" class="record-icon" mode="aspectFit" />
					<text class="record-text">立即记录</text>
				</view>
			</view>
		</view>

		<view class="content-section">
			<view class="card" @click="goToStatistics">
				<view class="card-header">
					<view class="card-icon">
						<image :src="pageIcons.clock" class="icon-image" mode="aspectFit" />
					</view>
					<image :src="pageIcons.right" class="card-arrow" mode="aspectFit" />
				</view>
				<view class="card-body">
					<text class="card-title">排便详情</text>
					<text class="card-desc">在这里管理和回顾您的所有历史记录，追踪肠道健康变化。</text>
				</view>
			</view>

			<view class="ai-card" @click="openAnalysis">
				<view class="card-header">
					<AppIcon class="sparkle-icon" name="sparkles" :size="32" />
					<text class="card-title">AI 肠道洞察</text>
				</view>
				
				<view class="ad-button">
					<view class="ad-icon">
						<AppIcon name="sparkles" :size="24" />
					</view>
					<view class="ad-text">
						<text class="ad-title">查看完整分析</text>
						<text class="ad-desc">直接解锁 AI 深度肠道分析报告</text>
					</view>
					<image :src="pageIcons.right" class="ad-arrow" mode="aspectFit" />
				</view>
			</view>

			<view class="assistant-card" @click="openChat">
				<view class="assistant-avatar">
					<AppIcon name="robot" color="white" :size="36" />
				</view>
				<view class="assistant-body">
					<text class="assistant-title">AI 健康助手</text>
					<text class="assistant-desc">说句话，帮你记录、定提醒、解读每日分析</text>
				</view>
				<image :src="pageIcons.right" class="assistant-arrow" mode="aspectFit" />
			</view>
		</view>

	</view>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import AnnouncementModal from '@/components/AnnouncementModal/AnnouncementModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { announcementApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Index',
		components: {
			ConfirmModal,
			AnnouncementModal,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				pageIcons: {},
				showLoginModal: false,
				announcements: [],
				showNormalAnnouncement: false,
				currentAnnouncement: {},
				/* 新用户强制完善资料引导弹窗 */
				showProfileSetupModal: false,
				/* 封禁公告弹窗 */
				showBanModal: false,
				banInfo: {},
				/* 封禁状态定时轮询定时器（仅在封禁弹窗显示期间运行） */
				banCheckTimer: null
			}
		},
		onLoad() {
			// 监听全局封禁弹窗事件
			uni.$on('showBanModal', this.handleBanModalEvent)
		},
		onShow() {
			uni.$emit('tabChange', 0)
			this.loadPageIcons()
			this.checkNewAnnouncements()

			// 检查是否需要完善资料（仅登录用户）
			const isLoggedIn = uni.getStorageSync('isLoggedIn')
			const userId = uni.getStorageSync('userId')
			if ((isLoggedIn === true || isLoggedIn === 'true') && userId && uni.getStorageSync('needProfileSetup')) {
				if (!this.checkProfileComplete()) {
					this.showProfileSetupModal = true
				} else {
					uni.removeStorageSync('needProfileSetup')
				}
			}

			// 检查封禁信息：先读 storage 快速展示，再主动调 API 确认
			const banInfo = uni.getStorageSync('banInfo')
			if (banInfo) {
				console.log('[index] onShow: 从 storage 读取到 banInfo:', banInfo.title)
				this.banInfo = banInfo
				this.showBanModal = true
				// 启动定时轮询，检测封禁是否到期
				this.startBanCheckTimer()
			}
			// 已登录用户主动确认封禁状态
			if ((isLoggedIn === true || isLoggedIn === 'true') && userId) {
				console.log('[index] onShow: 已登录，主动检查封禁状态')
				this.checkBanStatus(userId)
			}

			uni.$on('showAnnouncements', this.handleShowAnnouncements)
		},
		onHide() {
			uni.$off('showAnnouncements', this.handleShowAnnouncements)
			// 页面隐藏时停止轮询，避免后台请求
			this.stopBanCheckTimer()
		},
		onUnload() {
			// 移除封禁弹窗事件监听
			uni.$off('showBanModal', this.handleBanModalEvent)
			// 页面卸载时清理定时器
			this.stopBanCheckTimer()
		},
		methods: {
			checkLogin() {
				const isLoggedIn = uni.getStorageSync('isLoggedIn')
				const userId = uni.getStorageSync('userId')
				
				if (!(isLoggedIn === true || isLoggedIn === 'true') || !userId) {
					this.showLoginModal = true
					return false
				}
				return true
			},
			closeLoginModal() {
				this.showLoginModal = false
			},
			goToLogin() {
				this.showLoginModal = false
				uni.switchTab({
					url: '/pages/profile/profile'
				})
			},
			goToRecord() {
			if (!this.checkLogin()) return
			uni.navigateTo({
				url: '/pages/health/record/record'
			})
		},
			goToStatistics() {
				if (!this.checkLogin()) return
				uni.navigateTo({
					url: '/pages/health/statistics/statistics'
				})
			},
			openAnalysis() {
			if (!this.checkLogin()) return
			// 免广告，直接进入 AI 分析报告页
			uni.navigateTo({
				url: '/pages/others/ai-analysis/ai-analysis'
			})
		},
			openChat() {
			if (!this.checkLogin()) return
			uni.switchTab({
				url: '/pages/chat/chat'
			})
		},
			getTodayStr() {
				const now = new Date()
				const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
				return beijingTime.toISOString().split('T')[0]
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
			/* 检查 storage 中是否有新公告 */
			checkNewAnnouncements() {
				const stored = uni.getStorageSync('newAnnouncements')
				if (stored && stored.length > 0) {
					this.announcements = stored
					this.currentAnnouncement = stored[0]
					this.showNormalAnnouncement = true
				}
			},
			/* 处理全局公告事件 */
			handleShowAnnouncements(list) {
				this.announcements = list
				if (list && list.length > 0) {
					this.currentAnnouncement = list[0]
					this.showNormalAnnouncement = true
				}
			},
			/* 关闭普通公告弹窗：记录已查看，从列表移除，若还有更多则显示下一条 */
			closeNormalAnnouncement() {
				// 记录已查看
				if (this.currentAnnouncement && this.currentAnnouncement.id) {
					this.recordViewedAnnouncement(this.currentAnnouncement)
				}
				// 从列表移除当前公告
				const currentId = this.currentAnnouncement.id
				this.announcements = this.announcements.filter(item => item.id !== currentId)
				uni.setStorageSync('newAnnouncements', this.announcements)
				// 如果还有更多公告，显示下一条
				if (this.announcements.length > 0) {
					this.currentAnnouncement = this.announcements[0]
					this.showNormalAnnouncement = true
				} else {
					this.showNormalAnnouncement = false
					this.currentAnnouncement = {}
				}
			},
			/* 根据公告触发频率记录已查看状态（once/daily/weekly 分别存储） */
			recordViewedAnnouncement(ann) {
				const freq = ann.trigger_frequency || 'once'
				const today = new Date().toISOString().slice(0, 10)
				if (freq === 'once') {
					// 终生只看一次
					const viewed = uni.getStorageSync('viewedAnnouncements') || []
					if (!viewed.includes(ann.id)) {
						viewed.push(ann.id)
						uni.setStorageSync('viewedAnnouncements', viewed)
					}
				} else if (freq === 'daily') {
					// 每日一次：记录今天日期
					const viewedDaily = uni.getStorageSync('viewedDailyAnnouncements') || {}
					viewedDaily[ann.id] = today
					uni.setStorageSync('viewedDailyAnnouncements', viewedDaily)
				} else if (freq === 'weekly') {
					// 每周一次：记录本周标识
					const viewedWeekly = uni.getStorageSync('viewedWeeklyAnnouncements') || {}
					viewedWeekly[ann.id] = this.getWeekKey()
					uni.setStorageSync('viewedWeeklyAnnouncements', viewedWeekly)
				}
				// every_time 不记录，每次都弹出
			},
			/* 获取周标识（年份-第几周） */
			getWeekKey() {
				const now = new Date()
				const year = now.getFullYear()
				const start = new Date(year, 0, 1)
				const diff = (now - start) / (1000 * 60 * 60 * 24)
				const weekNum = Math.ceil((diff + start.getDay() + 1) / 7)
				return `${year}-W${weekNum}`
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
			},
			/* 处理全局封禁弹窗事件 */
			handleBanModalEvent(banData) {
				console.log('[index] 收到 showBanModal 事件:', banData ? banData.title : 'null')
				this.banInfo = banData
				this.showBanModal = true
				// 启动定时轮询，检测封禁是否到期
				this.startBanCheckTimer()
			},
			/* 主动调用 API 检查封禁状态 */
			async checkBanStatus(userId) {
				if (!userId) {
					console.log('[index] checkBanStatus: userId 为空，跳过')
					return
				}
				try {
					console.log('[index] checkBanStatus 开始, userId:', userId)
					const res = await announcementApi.checkBan(userId)
					console.log('[index] checkBanStatus 返回:', JSON.stringify(res).substring(0, 200))
					if (res && res.code === 0 && res.data) {
						if (res.data.is_banned) {
							const banData = res.data.announcement
							if (banData) {
								console.log('[index] 检测到封禁，展示弹窗:', banData.title)
								uni.setStorageSync('banInfo', banData)
								this.banInfo = banData
								this.showBanModal = true
								// 启动定时轮询，检查封禁是否到期
								this.startBanCheckTimer()
							}
						} else {
							// 未被封禁：清除弹窗与 storage，并停止轮询
							console.log('[index] 未被封禁，清除弹窗')
							uni.removeStorageSync('banInfo')
							this.banInfo = {}
							this.showBanModal = false
							this.stopBanCheckTimer()
						}
					}
				} catch (e) {
					console.error('[index] 检查封禁状态失败:', e)
				}
			},
			/* 启动封禁状态定时轮询（每30秒检查一次，仅在封禁弹窗显示期间运行） */
			startBanCheckTimer() {
				// 先清理已有定时器，避免重复启动
				this.stopBanCheckTimer()
				// 每 30 秒轮询一次后端，检测封禁是否到期
				this.banCheckTimer = setInterval(() => {
					const userId = uni.getStorageSync('userId')
					const isLoggedIn = uni.getStorageSync('isLoggedIn')
					if (userId && (isLoggedIn === true || isLoggedIn === 'true')) {
						console.log('[index] 定时检查封禁状态...')
						this.checkBanStatus(userId)
					}
				}, 30000) // 30 秒
			},
			/* 停止封禁状态定时轮询 */
			stopBanCheckTimer() {
				if (this.banCheckTimer) {
					clearInterval(this.banCheckTimer)
					this.banCheckTimer = null
				}
			}
	}
}
</script>

<style lang="scss" scoped>
	.page-container {
		padding: 0 32rpx;
	}

	.header {
		padding-top: 32rpx;
		text-align: center;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.title {
		font-size: 56rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.subtitle {
		font-size: 28rpx;
		color: #554336;
	}

	.record-section {
		display: flex;
		justify-content: center;
		padding: 80rpx 0;
	}

	.ripple-container {
		position: relative;
		width: 500rpx;
		height: 500rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ripple {
		position: absolute;
		width: 350rpx;
		height: 350rpx;
		border-radius: 50%;
		background: rgba(141, 75, 0, 0.12);
		animation: ripple 3s ease-out infinite;
	}

	.ripple-1 {
		animation-delay: 0s;
	}

	.ripple-2 {
		animation-delay: 1s;
	}

	.ripple-3 {
		animation-delay: 2s;
	}

	@keyframes ripple {
		0% {
			transform: scale(1);
			opacity: 0.2;
		}
		100% {
			transform: scale(3);
			opacity: 0;
		}
	}

	.record-btn {
		position: relative;
		z-index: 10;
		width: 350rpx;
		height: 350rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #b15f00 0%, #8d4b00 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-shadow: 0 16rpx 48rpx rgba(141, 75, 0, 0.18), 0 4rpx 12rpx rgba(141, 75, 0, 0.10);
		animation: btn-breathe 3s ease-in-out infinite;
	}

	@keyframes btn-breathe {
	    0% {
	        transform: scale(1);
	        box-shadow: 0 16rpx 48rpx rgba(141, 75, 0, 0.16);
	    }
	    25% {
	        transform: scale(1.03);
	        box-shadow: 0 20rpx 56rpx rgba(141, 75, 0, 0.20);
	    }
	    50% {
	        transform: scale(1.03);
	        box-shadow: 0 20rpx 56rpx rgba(141, 75, 0, 0.20);
	    }
	    75% {
	        transform: scale(0.985);
	        box-shadow: 0 14rpx 42rpx rgba(141, 75, 0, 0.12);
	    }
	    100% {
	        transform: scale(1);
	        box-shadow: 0 16rpx 48rpx rgba(141, 75, 0, 0.16);
	    }
	}
	
	.record-icon {
		width: 80rpx;
		height: 80rpx;
		margin-bottom: 12rpx;
	}

	.record-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.content-section {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.card-icon {
		width: 72rpx;
		height: 72rpx;
		border-radius: 24rpx;
		background: rgba(154, 70, 20, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-image {
		width: 36rpx;
		height: 36rpx;
	}

	.card-arrow {
		width: 32rpx;
		height: 32rpx;
	}

	.card-body {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.card-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.card-desc {
		font-size: 26rpx;
		color: #554336;
		line-height: 1.6;
	}

	.ai-card {
		gap: 24rpx;
	}

	.sparkle-icon {
		font-size: 32rpx;
		margin-right: 12rpx;
	}

	

	.ad-button {
		display: flex;
		align-items: center;
		background: rgba(254, 244, 233, 0.6);
		border-radius: 32rpx;
		padding: 40rpx;
		border: 1px solid rgba(136, 115, 100, 0.1);
	}

	.ad-icon {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: rgba(141, 75, 0, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;
	}

	.sparkle-icon-small {
		font-size: 24rpx;
		animation: sparkle-breathe-small 2s ease-in-out infinite;
	}

	@keyframes sparkle-breathe-small {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.5);
		}
	}

	.ad-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.ad-title {
		font-size: 26rpx;
		font-weight: 600;
		color: #554336;
	}

	.ad-desc {
		font-size: 20rpx;
		color: #887364;
	}

	.ad-arrow {
		width: 28rpx;
		height: 28rpx;
		opacity: 0.4;
	}

	.assistant-card {
		display: flex;
		align-items: center;
		gap: 20rpx;
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.09) 0%, rgba(177, 95, 0, 0.05) 100%);
		border-radius: 40rpx;
		padding: 28rpx 32rpx;
		border: 1rpx solid rgba(141, 75, 0, 0.12);
		box-shadow: 0 8rpx 32rpx rgba(141, 75, 0, 0.08);
		transition: transform 0.25s ease;

		&:active {
			transform: scale(0.98);
		}
	}

	.assistant-avatar {
		width: 76rpx;
		height: 76rpx;
		border-radius: 26rpx;
		background: linear-gradient(135deg, #b15f00 0%, #8d4b00 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: 0 6rpx 20rpx rgba(141, 75, 0, 0.2);
	}

	.assistant-avatar-icon {
		font-size: 36rpx;
	}

	.assistant-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6rpx;
	}

	.assistant-title {
		font-size: 32rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.assistant-desc {
		font-size: 23rpx;
		color: #554336;
	}

	.assistant-arrow {
		width: 28rpx;
		height: 28rpx;
		opacity: 0.45;
	}

</style>
