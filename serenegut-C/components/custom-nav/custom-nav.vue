<template>
	<view class="custom-nav">
		<!-- 第一层：状态栏占位（透明背景） -->
		<view
			class="nav-status-bar"
			:style="{ height: statusBarHeight + 'px' }"
		></view>
		<!-- 第二层：标题栏主体（透明背景，与胶囊按钮垂直居中对齐） -->
		<view class="nav-bar-body" :style="{ height: navBarHeight + 'px' }">
			<!-- 返回按钮 -->
			<view v-if="showBack" class="nav-back-btn" :style="{ height: navBarHeight + 'px' }" @click="handleBack">
				<view class="nav-back-arrow" :style="{ borderColor: fontColor }"></view>
			</view>
			<!-- 标题区域 -->
			<view class="nav-title-area" :style="{ paddingRight: capsuleSpace + 'px' }">
				<view class="nav-title-box" :class="'align-' + align">
					<text
						class="nav-title-text"
						:style="{
							color: fontColor,
							fontSize: fontSize + 'rpx',
							fontWeight: bold ? '700' : '600'
						}"
					>{{ title }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'CustomNav',
		props: {
			title: { type: String, default: '' },
			bgColor: { type: String, default: 'transparent' },
			fontColor: { type: String, default: '#2a1f15' },
			fontSize: { type: Number, default: 42 },
			align: { type: String, default: 'center' },
			bold: { type: Boolean, default: false },
			showBack: { type: Boolean, default: false }
		},
		data() {
			return {
				statusBarHeight: 20,
				navBarHeight: 44,
				capsuleSpace: 95
			}
		},
		created() {
			this.initLayout()
		},
		methods: {
			initLayout() {
				try {
					const sysInfo = uni.getSystemInfoSync()
					this.statusBarHeight = sysInfo.statusBarHeight || 20

					// #ifdef MP-WEIXIN
					const capsule = uni.getMenuButtonBoundingClientRect()
					if (capsule && capsule.height > 0) {
						// 导航栏高度 = 胶囊上下间距 * 2 + 胶囊高度
						// 这样标题栏的垂直中心 = 胶囊的垂直中心，文字自然对齐
						const capsuleMargin = capsule.top - this.statusBarHeight
						this.navBarHeight = capsuleMargin * 2 + capsule.height
						this.capsuleSpace = sysInfo.windowWidth - capsule.left + 12
					}
					// #endif
				} catch (e) {
					console.warn('[custom-nav] 初始化布局失败:', e)
				}
			},
			handleBack() {
				const pages = getCurrentPages()
				if (pages.length > 1) {
					uni.navigateBack()
				} else {
					uni.switchTab({ url: '/pages/index/index' })
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.custom-nav {
		/* 突破父容器 padding，铺满屏幕宽度 */
		width: 100vw;
		position: relative;
		left: 50%;
		margin-left: -50vw;
	}

	.nav-status-bar {
		width: 100%;
	}

	.nav-bar-body {
		width: 100%;
		display: flex;
		align-items: center;
	}

	.nav-back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80rpx;
		padding: 0 20rpx;
		flex-shrink: 0;

		&:active {
			opacity: 0.6;
		}
	}

	.nav-back-arrow {
		width: 18rpx;
		height: 18rpx;
		border-left: 5rpx solid #2a1f15;
		border-bottom: 5rpx solid #2a1f15;
		transform: rotate(45deg);
	}

	.nav-title-area {
		flex: 1;
		display: flex;
		align-items: center;
		padding-left: 12rpx;
		min-width: 0;
		overflow: hidden;
	}

	.nav-title-box {
		flex: 1;
		overflow: hidden;

		&.align-left {
			text-align: left;
		}

		&.align-center {
			text-align: center;
		}
	}

	.nav-title-text {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
</style>
