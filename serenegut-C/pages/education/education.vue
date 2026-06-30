<template>
	<view class="page-container">
		<custom-nav title="科普" align="left" :bold="true" />

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

		<view class="header">
		</view>

		<view class="section">
			<view class="section-header">
				<text class="section-title">布里斯托分类</text>
				<view class="view-all" @click="goToBristol">
					<text class="view-all-text">查看全部</text>
				</view>
			</view>
			<view class="bristol-card" @click="goToBristol">
				<view class="bristol-top">
					<view class="bristol-image">
						<image :src="bristolType4Url" class="bristol-img" mode="aspectFit" />
					</view>
					<view class="bristol-info">
						<view class="ideal-tag">
							<view class="ideal-dot"></view>
							<text class="ideal-text">理想状态</text>
						</view>
						<text class="bristol-title">第四型：香肠型</text>
						<text class="bristol-desc">表面光滑柔软，像香肠或蛇。这是最理想的健康排便状态...</text>
					</view>
				</view>
				<view class="bristol-grid">
					<view class="bristol-item">
						<text class="item-label">类型 1-2</text>
						<text class="item-value error">便秘倾向</text>
					</view>
					<view class="bristol-item ideal">
						<text class="item-label">类型 3-4</text>
						<text class="item-value">健康理想</text>
					</view>
					<view class="bristol-item">
						<text class="item-label">类型 5-7</text>
						<text class="item-value warning">腹泻倾向</text>
					</view>
				</view>
			</view>
		</view>

		<view class="section">
			<view class="section-header">
				<text class="section-title">精选内容</text>
				<view class="view-all" @click="viewAllArticles">
					<text class="view-all-text">查看全部</text>
				</view>
			</view>
			<view v-if="!isLoggedIn" class="login-hint-state">
				<text class="login-hint-text">登录后加载文章</text>
			</view>
			<view v-else-if="articles.length > 0">
				<article-list :articles="articles" @go-to-article="goToArticle"></article-list>
			</view>
			<view v-else class="empty-state">
				<text class="empty-text">暂无文章</text>
			</view>
		</view>

		<view class="contact-card" @click="goToContact">
			<view class="contact-content">
				<text class="contact-title">{{ cooperationTitle }}</text>
				<text class="contact-desc">{{ cooperationDesc }}</text>
			</view>
			<view class="contact-icon">
				<image :src="pageIcons.cooperation" class="icon-img" mode="aspectFit" />
			</view>
		</view>

		<!-- 右下角浮窗记录按钮 -->
		<FloatingRecordButton />
	</view>
</template>

<script>
	import articleList from '@/components/article-list/article-list.vue'
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import FloatingRecordButton from '@/components/FloatingRecordButton/FloatingRecordButton.vue'
	import { articleApi, configApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Education',
		components: {
			articleList,
			ConfirmModal,
			CustomNav,
			FloatingRecordButton
		},
		onShow() {
			uni.$emit('tabChange', 1)
			this.isLoggedIn = uni.getStorageSync('isLoggedIn') === true || uni.getStorageSync('isLoggedIn') === 'true'
			this.loadArticles()
			this.loadCooperationConfig()

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
	},
	data() {
			return {
				articles: [],
				isLoggedIn: false,
				bristolType4Url: '/pages/health/static/bristolstool-image/bristolstool-type4.png',
				pageIcons: {},
				/* 新用户强制完善资料引导弹窗 */
				showProfileSetupModal: false,
				/* 合作信息卡片标题与描述（后端配置缺失时使用默认文案） */
				cooperationTitle: '点击和我们合作',
				cooperationDesc: '如果您有商业合作意向，请联系我们，共创肠道健康新生态。'
			}
		},
		onLoad() {
			this.loadPageIcons()
			this.loadArticles()
		},
		methods: {
			async loadArticles() {
			try {
				/* 使用 API 服务层获取精选推流文章列表 */
				const result = await articleApi.list({ page: 1, size: 3, is_top: true })

				if (result && result.code === 0) {
					this.articles = result.data.list
				}
				} catch (error) {
					console.error('加载文章失败:', error)
				}
			},
			/* 加载合作信息配置：从后端 config 读取 cooperationTitle / cooperationDesc，失败时保留默认文案 */
			async loadCooperationConfig() {
				try {
					const result = await configApi.get()
					if (result && result.code === 0 && result.data) {
						if (result.data.cooperationTitle) this.cooperationTitle = result.data.cooperationTitle
						if (result.data.cooperationDesc) this.cooperationDesc = result.data.cooperationDesc
					}
				} catch (e) {
					console.error('[education] 加载合作信息配置失败:', e)
				}
			},
			goToArticle(article) {
			uni.navigateTo({
				url: `/pages/content/article/article?id=${article._id}`
			})
		},
			goToBristol() {
				uni.navigateTo({
					url: '/pages/health/bristol/bristol'
				})
			},
			viewAllArticles() {
			uni.navigateTo({
				url: '/pages/content/article-list/article-list'
			})
		},
			goToContact() {
				uni.navigateTo({
					url: '/pages/content/contact/contact'
				})
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
	.page-container {
		padding: 0 32rpx;
	}

	.header {
		padding-top: 32rpx;
		margin-bottom: 32rpx;
	}

	.title {
		font-size: 48rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-bottom: 40rpx;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.view-all-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.empty-state {
		padding: 60rpx 0;
		text-align: center;
	}

	.empty-text {
		font-size: 28rpx;
		color: #887364;
	}

	.login-hint-state {
		padding: 40rpx 0;
		text-align: center;
	}

	.login-hint-text {
		font-size: 28rpx;
		color: #999;
	}

	.bristol-card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.bristol-top {
		display: flex;
		gap: 24rpx;
		margin-bottom: 28rpx;
	}

	.bristol-image {
		width: 160rpx;
		height: 160rpx;
		border-radius: 48rpx;
		background: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(146, 64, 14, 0.1);
	}

	.bristol-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.ideal-tag {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.ideal-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: #8d4b00;
	}

	.ideal-text {
		font-size: 20rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.bristol-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.bristol-desc {
		font-size: 26rpx;
		color: #887364;
	}

	.bristol-grid {
		display: flex;
		gap: 16rpx;
		padding-top: 24rpx;
		border-top: 1px solid rgba(136, 115, 100, 0.1);
	}

	.bristol-item {
		flex: 1;
		background: rgba(255, 248, 235, 0.5);
		border-radius: 24rpx;
		padding: 20rpx;
		text-align: center;
		border: 1rpx solid rgba(255, 248, 235, 0.5);

		&.ideal {
			border: 1px solid rgba(141, 75, 0, 0.3);
		}
	}

	.item-label {
		font-size: 20rpx;
		font-weight: 600;
		color: #887364;
		display: block;
		margin-bottom: 4rpx;
	}

	.item-value {
		font-size: 24rpx;
		font-weight: 600;
		color: #8d4b00;

		&.error {
			color: #c0533c;
		}

		&.warning {
			color: #d99441;
		}
	}

	.contact-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: linear-gradient(135deg, #ffdbcb 0%, #ffdcc3 100%);
		border-radius: 48rpx;
		padding: 40rpx;
		margin-bottom: 32rpx;
		border: 1rpx solid rgba(255, 248, 235, 0.6);
	}

	.contact-content {
		flex: 1;
	}

	.contact-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #8d4b00;
		display: block;
		margin-bottom: 8rpx;
	}

	.contact-desc {
		font-size: 24rpx;
		color: #887364;
	}

	.contact-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 32rpx;
		background: rgba(255, 255, 255, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 24rpx;
	}

	.icon-img {
		width: 50rpx;
		height: 50rpx;
	}
</style>
