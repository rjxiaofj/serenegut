<script>
	/* App 生命周期逻辑已移至 main.js 的 createApp() 中，
	   因为 uni-app Vue3 编译后 App.vue 的 options 可能不会被正确编译到小程序输出 */
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/* #ifdef H5 */
	@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');
	/* #endif */

	/* 鸿蒙暖调环境基底光：多层暖色漫射柔光，全局温润治愈 */
	page {
		background-color: #fef8f3;
		font-family: "HarmonyOS Sans", "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		min-height: 100vh;
		background-image:
			radial-gradient(circle at 50% -8%, rgba(255, 219, 203, 0.55) 0%, transparent 58%),
			radial-gradient(circle at 12% 18%, rgba(255, 220, 195, 0.32) 0%, transparent 46%),
			radial-gradient(circle at 88% 26%, rgba(255, 235, 215, 0.28) 0%, transparent 50%),
			linear-gradient(180deg, rgba(255, 244, 233, 0.4) 0%, rgba(254, 248, 243, 0) 38%);
		background-attachment: fixed;
		color: #2a1f15;
	}

	/* 鸿蒙暖调磨砂卡片：哑光低透光 + 暖色细描边 + 柔和弥散暖光晕
	   区别 iOS 冷调高透玻璃（白色高光边 + 厚阴影） */
	.glass-card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	/* 鸿蒙暖调磨砂栏（导航/底栏）：强底暖调，轻薄浅投影 */
	.glass-bar {
		background: #fefaf3;
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-bottom: 1rpx solid rgba(255, 220, 195, 0.4);
		box-shadow: 0 4rpx 20rpx rgba(146, 64, 14, 0.05);
	}

	.text-primary {
		color: #8d4b00;
	}

	.text-secondary {
		color: #554336;
	}

	.text-muted {
		color: #887364;
	}

	.bg-primary {
		background-color: #8d4b00;
	}

	.bg-secondary {
		background-color: #9a4614;
	}

	.bg-card {
		background: rgba(255, 249, 240, 0.82);
	}

	/* 鸿蒙柔和弥散暖光晕（呼吸动画，统一替换原 box-shadow 版） */
	.breathing-glow {
		animation: breathing-pulse 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes breathing-pulse {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(141, 75, 0, 0.18), 0 8rpx 32rpx rgba(141, 75, 0, 0.12);
		}
		50% {
			box-shadow: 0 0 24rpx 8rpx rgba(177, 95, 0, 0.16), 0 12rpx 40rpx rgba(141, 75, 0, 0.16);
		}
	}

	/* 鸿蒙涟漪：柔和暖光扩散（非锐利） */
	.ripple-animation {
		animation: ripple 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes ripple {
		0% {
			transform: scale(1);
			opacity: 0.18;
			box-shadow: 0 0 0 0 rgba(141, 75, 0, 0.12);
		}
		100% {
			transform: scale(3);
			opacity: 0;
			box-shadow: 0 0 40rpx 0 rgba(141, 75, 0, 0.04);
		}
	}

	.text-truncate-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.page-container {
		padding: 0 32rpx;
		min-height: 100vh;
		padding-bottom: 180rpx;
	}

	.page-container-no-tab {
		padding: 0 32rpx;
		min-height: 100vh;
	}

	/* 鸿蒙暖调主按钮：渐变 + 柔和暖光晕 + 圆润 + 微动效 */
	.btn-primary {
		background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
		color: #ffffff;
		font-weight: 600;
		border-radius: 48rpx;
		padding: 24rpx 48rpx;
		text-align: center;
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
		}
	}

	.btn-secondary {
		background: rgba(141, 75, 0, 0.08);
		color: #8d4b00;
		font-weight: 600;
		border-radius: 32rpx;
		padding: 20rpx 40rpx;
		text-align: center;
		border: 1rpx solid rgba(141, 75, 0, 0.12);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			background: rgba(141, 75, 0, 0.12);
		}
	}

	/* 鸿蒙暖光晕装饰：柔和弥散暖光，用于图标底/装饰元素 */
	.harmony-glow {
		box-shadow: 0 0 24rpx 0 rgba(141, 75, 0, 0.10), 0 4rpx 16rpx rgba(177, 95, 0, 0.06);
	}

	/* 鸿蒙按压微动效工具类 */
	.harmony-press {
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
		}
	}

	/* ===== 全局隐藏滚动条 ===== */
	/* #ifdef H5 || MP-WEIXIN */
	::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
		background: transparent;
		color: transparent;
	}
	/* #endif */

	/* 所有可滚动元素隐藏滚动条 */
	scroll-view,
	.page-container,
	.page-container-no-tab,
	.content {
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	scroll-view::-webkit-scrollbar,
	.content::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}
</style>