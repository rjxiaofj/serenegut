<template>
	<view class="fab-record" @click="goToRecord">
		<view class="fab-inner">
			<text class="fab-icon">+</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'FloatingRecordButton',
		methods: {
			/* 检查登录状态，未登录则跳转到我的页 */
			checkLogin() {
				const isLoggedIn = uni.getStorageSync('isLoggedIn')
				const userId = uni.getStorageSync('userId')
				if (!(isLoggedIn === true || isLoggedIn === 'true') || !userId) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					setTimeout(() => {
						uni.switchTab({ url: '/pages/profile/profile' })
					}, 1000)
					return false
				}
				return true
			},
			goToRecord() {
				if (!this.checkLogin()) return
				uni.navigateTo({
					url: '/pages/health/record/record'
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	/* 右下角浮窗记录按钮 */
	.fab-record {
		position: fixed;
		right: 40rpx;
		bottom: 180rpx;
		z-index: 999;
	}

	.fab-inner {
		width: 100rpx;
		height: 100rpx;
		border-radius: 50%;
		background: linear-gradient(135deg, #b15f00 0%, #8d4b00 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.30), 0 2rpx 8rpx rgba(141, 75, 0, 0.15);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.fab-inner:active {
		transform: scale(0.90);
	}

	.fab-icon {
		font-size: 56rpx;
		font-weight: 300;
		color: #ffffff;
		line-height: 1;
	}
</style>
