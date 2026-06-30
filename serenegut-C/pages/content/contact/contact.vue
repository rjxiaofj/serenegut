<template>
	<view class="page-container-no-tab">
		<custom-nav title="商务合作" showBack />
		<view class="content">
			<view class="contact-section">
				<text class="section-title">联系方式</text>
				<view class="contact-grid">
					<!-- 微信客服：展示后端配置的微信号或描述 -->
					<view class="contact-item" @click="contactWechat">
						<view class="contact-icon">
							<AppIcon name="message-circle" :size="34" />
						</view>
						<text class="contact-label">微信客服</text>
						<text class="contact-value">{{ wechatService }}</text>
					</view>
					<view class="contact-item" @click="contactPhone">
						<view class="contact-icon">
							<AppIcon name="phone" :size="34" />
						</view>
						<text class="contact-label">电话</text>
						<text class="contact-value">{{ contactPhone }}</text>
					</view>
					<view class="contact-item">
						<view class="contact-icon">
							<AppIcon name="mail" :size="34" />
						</view>
						<text class="contact-label">邮箱</text>
						<text class="contact-value">{{ contactEmail }}</text>
					</view>
				</view>
			</view>

			<view class="about-section">
				<view class="section-title-wrap">
					<text class="section-title">公司理念</text>
				</view>
				<text class="about-text">
					{{ companyPhilosophy }}
				</text>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNav from '@/components/custom-nav/custom-nav.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { configApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Contact',
		components: {
			CustomNav,
			AppIcon
		},
		data() {
			return {
				pageIcons: {},
				// 联系信息字段，后端未配置时使用默认值
				contactPhone: '400-888-0000',
				contactEmail: 'partner@serenegut.com',
				wechatService: '联系客服',
				companyPhilosophy: 'Serene Gut 相信，消化健康不应是沉重的临床负担，而是一种自然、舒缓的生命节奏。我们致力于将科技与温和疗法融合，打造最纯粹的肠道健康体验。'
			}
		},
		onLoad() {
			this.loadPageIcons()
			this.loadContactConfig()
		},
		methods: {
			goBack() {
				uni.navigateBack()
			},
			contactWechat() {
				// #ifdef MP-WEIXIN
				wx.openCustomerServiceChat({
					success: () => {},
					fail: () => {
						uni.showToast({
							title: '无法打开客服',
							icon: 'none'
						})
					}
				})
				// #endif
				// #ifndef MP-WEIXIN
				uni.showToast({
					title: '请在小程序中使用',
					icon: 'none'
				})
				// #endif
			},
			contactPhone() {
				uni.makePhoneCall({
					phoneNumber: this.contactPhone,
					fail: () => {
						uni.showToast({
							title: '拨号失败',
							icon: 'none'
						})
					}
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
			// 从后端加载联系信息配置，未配置时保留默认值
			async loadContactConfig() {
				try {
					const res = await configApi.get()
					if (res && res.code === 0 && res.data) {
						if (res.data.contactPhone) this.contactPhone = res.data.contactPhone
						if (res.data.contactEmail) this.contactEmail = res.data.contactEmail
						if (res.data.wechatService) this.wechatService = res.data.wechatService
						if (res.data.companyPhilosophy) this.companyPhilosophy = res.data.companyPhilosophy
					}
				} catch (e) {
					// 加载失败时静默使用默认值
				}
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

	.contact-section {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.section-title {
		font-size: 40rpx;
		font-weight: 700;
		color: #8d4b00;
		text-align: center;
		display: block;
	}

	.section-title-wrap {
		margin-bottom: 32rpx;
	}

	.contact-grid {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.contact-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 24rpx rgba(141, 75, 0, 0.08);
		}
	}

	.contact-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 24rpx;
		background: rgba(141, 75, 0, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 16rpx;
	}

	.icon-text {
		font-size: 40rpx;
	}

	.contact-label {
		font-size: 22rpx;
		font-weight: 600;
		color: #887364;
		text-transform: uppercase;
		letter-spacing: 2rpx;
		margin-bottom: 8rpx;
	}

	.contact-value {
		font-size: 32rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.about-section {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 40rpx;
		text-align: center;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.about-text {
		font-size: 30rpx;
		color: #554336;
		line-height: 1.8;
	}
</style>