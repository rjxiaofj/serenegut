<template>
	<view class="page-container-no-tab">
		<!-- 居中对齐（默认） -->
		<custom-nav title="导航栏演示" showBack />

		<view class="demo-content">
			<view class="demo-section">
				<text class="demo-label">1. 居中对齐（默认）</text>
				<custom-nav title="AI分析报告" />
			</view>

			<view class="demo-section">
				<text class="demo-label">2. 左对齐加粗（主页面）</text>
				<custom-nav title="肠健康" align="left" :bold="true" />
			</view>

			<view class="demo-section">
				<text class="demo-label">3. 自定义背景色+字色</text>
				<custom-nav title="深色导航栏" bgColor="#2a1f15" fontColor="#fef8f3" />
			</view>

			<view class="demo-section">
				<text class="demo-label">4. 自定义字号</text>
				<custom-nav title="大字号标题" :fontSize="40" />
			</view>

			<view class="demo-section">
				<text class="demo-label">5. 带返回按钮</text>
				<custom-nav title="设置与安全" showBack />
			</view>

			<view class="demo-section">
				<text class="demo-label">6. 长标题自动省略</text>
				<custom-nav title="这是一个非常非常非常长的标题文字测试省略效果" />
			</view>

			<view class="demo-section">
				<text class="demo-label">7. 透明背景（默认）</text>
				<custom-nav title="肠健康" align="left" :bold="true" />
			</view>
		</view>
	</view>
</template>

<script>
	import CustomNav from '@/components/custom-nav/custom-nav.vue'

	export default {
		name: 'NavDemo',
		components: {
			CustomNav
		}
	}
</script>

<style lang="scss" scoped>
	.demo-content {
		padding: 32rpx;
		display: flex;
		flex-direction: column;
		gap: 48rpx;
	}

	.demo-section {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.demo-label {
		font-size: 26rpx;
		color: #887364;
		font-weight: 500;
		padding-left: 8rpx;
	}
</style>
