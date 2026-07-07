<template>
	<view
		v-if="visible"
		class="announce-mask"
		:class="{ ban: type === 'ban' }"
		@click="handleMaskClick"
	>
		<view class="announce-card" :class="{ ban: type === 'ban' }" @click.stop>
			<!-- 标题 -->
			<text class="card-title" :class="{ ban: type === 'ban' }">{{ title }}</text>

			<!-- 封禁配图（独立字段） -->
			<view v-if="type === 'ban' && banImage" class="ban-image-wrap">
				<image :src="banImage" mode="widthFix" class="ban-image" />
			</view>

			<!-- 内容（rich-text，已处理图片样式） -->
			<scroll-view class="card-content" scroll-y>
				<rich-text :nodes="processedContent" class="content-rich"></rich-text>
			</scroll-view>

			<!-- 封禁倒计时（仅限时封禁显示） -->
			<view v-if="type === 'ban' && showCountdown" class="ban-countdown">
				<text class="countdown-label">封禁剩余时间</text>
				<text class="countdown-time">{{ countdownText }}</text>
			</view>

			<!-- 按钮 -->
			<view v-if="type !== 'ban'" class="card-btn" @click="handleConfirm">
				<text class="card-btn-text">确定</text>
			</view>
			<view v-else class="ban-footer">
				<text class="ban-footer-text">如有疑问请联系客服</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'AnnouncementModal',
		props: {
			visible: { type: Boolean, default: false },
			type: { type: String, default: 'normal' },
			title: { type: String, default: '公告' },
			richContent: { type: String, default: '' },
			banImage: { type: String, default: '' },
			banExpiresAt: { type: [Number, String], default: 0 },
			banIsPermanent: { type: Boolean, default: false }
		},
		data() {
			return {
				countdownText: '',
				countdownTimer: null
			}
		},
		computed: {
			/* 处理 rich_content 中的图片：给 img 标签注入内联样式防止溢出 */
			processedContent() {
				if (!this.richContent) return ''
				return this.richContent.replace(
					/<img/g,
					'<img style="max-width:100%;height:auto;display:block;border-radius:12rpx;margin:8rpx auto;"'
				)
			},
			/* 是否显示倒计时：封禁模式 + 非永久 + 有有效到期时间 */
			showCountdown() {
				return !this.banIsPermanent && Number(this.banExpiresAt) > 0
			}
		},
		watch: {
			visible(val) {
				if (val) {
					uni.hideTabBar({ animation: false })
					console.log('[AnnouncementModal] visible=true, props:', {
						type: this.type,
						banImage: this.banImage ? '有图' : '无图',
						banExpiresAt: this.banExpiresAt,
						banIsPermanent: this.banIsPermanent,
						showCountdown: this.showCountdown
					})
					if (this.showCountdown) {
						this.startCountdown()
					} else {
						console.log('[AnnouncementModal] 倒计时不显示原因:',
							this.banIsPermanent ? '永久封禁' : (Number(this.banExpiresAt) <= 0 ? 'expires_at为0或无效' : '未知'))
					}
				} else {
					uni.showTabBar({ animation: false })
					this.stopCountdown()
				}
			},
			banExpiresAt() {
				if (this.visible && this.showCountdown) {
					this.startCountdown()
				}
			}
		},
		beforeDestroy() {
			this.stopCountdown()
		},
		methods: {
			startCountdown() {
				this.stopCountdown()
				this.updateCountdown()
				this.countdownTimer = setInterval(() => {
					this.updateCountdown()
				}, 1000)
			},
			stopCountdown() {
				if (this.countdownTimer) {
					clearInterval(this.countdownTimer)
					this.countdownTimer = null
				}
			},
			updateCountdown() {
				const expiresAt = Number(this.banExpiresAt)
				if (!expiresAt || expiresAt <= 0) {
					this.countdownText = ''
					return
				}
				const now = Date.now()
				const diff = expiresAt - now
				if (diff <= 0) {
					this.countdownText = '即将解除'
					this.stopCountdown()
					return
				}
				const days = Math.floor(diff / (1000 * 60 * 60 * 24))
				const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
				const seconds = Math.floor((diff % (1000 * 60)) / 1000)
				const pad = (n) => String(n).padStart(2, '0')
				if (days > 0) {
					this.countdownText = `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
				} else {
					this.countdownText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
				}
			},
			handleMaskClick() {
				return
			},
			handleConfirm() {
				this.$emit('confirm')
			}
		}
	}
</script>

<style lang="scss" scoped>
	.announce-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 99999;

		&.ban {
			background: rgba(80, 10, 10, 0.25);
			backdrop-filter: blur(8px);
			-webkit-backdrop-filter: blur(8px);
		}
	}

	.announce-card {
		width: 580rpx;
		max-height: 80vh;
		background: #ffffff;
		border-radius: 32rpx;
		padding: 48rpx 40rpx 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.15);
		overflow: hidden;

		&.ban {
			border: 4rpx solid rgba(197, 53, 53, 0.3);
			background: #fffbfb;
		}
	}

	.card-title {
		font-size: 36rpx;
		font-weight: 700;
		color: #1a1a1a;
		text-align: center;
		margin-bottom: 28rpx;
		width: 100%;
		overflow: hidden;

		&.ban {
			color: #c53535;
		}
	}

	/* 封禁配图（独立 ban_image 字段） */
	.ban-image-wrap {
		width: 100%;
		max-height: 400rpx;
		overflow: hidden;
		border-radius: 16rpx;
		margin-bottom: 24rpx;
	}
	.ban-image {
		width: 100%;
		border-radius: 16rpx;
	}

	/* rich-text 内容区域 */
	.card-content {
		max-height: 40vh;
		width: 100%;
		margin-bottom: 24rpx;
	}
	.content-rich {
		font-size: 28rpx;
		color: #666666;
		line-height: 1.8;
	}

	/* 封禁倒计时 */
	.ban-countdown {
		width: 100%;
		padding: 20rpx 24rpx;
		background: rgba(197, 53, 53, 0.08);
		border: 2rpx solid rgba(197, 53, 53, 0.15);
		border-radius: 16rpx;
		margin-bottom: 28rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
	}
	.countdown-label {
		font-size: 24rpx;
		color: #999999;
	}
	.countdown-time {
		font-size: 40rpx;
		font-weight: 700;
		color: #c53535;
		font-family: monospace;
		letter-spacing: 2rpx;
	}

	.card-btn {
		width: 100%;
		height: 88rpx;
		border-radius: 44rpx;
		background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.2);

		&:active {
			transform: scale(0.97);
		}
	}

	.card-btn-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.ban-footer {
		width: 100%;
		text-align: center;
		padding: 8rpx 0;
	}

	.ban-footer-text {
		font-size: 24rpx;
		color: #999999;
	}
</style>
