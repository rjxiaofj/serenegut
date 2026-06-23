<template>
	<view class="page-container-no-tab">
		<custom-nav title="布里斯托分类法" showBack />
		<view class="content">
			<view class="intro-section">
				<text class="intro-title">科学评估您的健康状态</text>
			</view>



			<view class="type-list">
				<view 
					v-for="(type, index) in bristolTypes" 
					:key="index"
					class="type-card"
				>
					<view class="type-icon">
						<image :src="getBristolImageUrl(index)" class="type-img" mode="aspectFit" />
					</view>
					<view class="type-content">
						<text class="type-number">第{{ type.chineseNum }}型</text>
						<text class="type-name">{{ type.name }}</text>
						<text class="type-desc">{{ type.desc }}</text>
					</view>
				</view>
			</view>

			<view class="summary-card">
				<view class="summary-row">
					<view class="summary-item">
						<view class="summary-dot constipation"></view>
						<text class="summary-label">类型 1-2</text>
						<text class="summary-status">便秘倾向</text>
					</view>
					<view class="summary-item ideal">
						<view class="summary-dot ideal"></view>
						<text class="summary-label">类型 3-4</text>
						<text class="summary-status">健康理想</text>
					</view>
					<view class="summary-item">
						<view class="summary-dot diarrhea"></view>
						<text class="summary-label">类型 5-7</text>
						<text class="summary-status">腹泻倾向</text>
					</view>
				</view>
			</view>

			<view class="back-btn" @click="goBack">
				<text class="btn-text">返回</text>
			</view>
		</view>
	</view>
</template>

<script>
	import CustomNav from '@/components/custom-nav/custom-nav.vue'

	export default {
		name: 'Bristol',
		components: {
			CustomNav
		},
		data() {
			return {
				bristolTypes: [
					{
						name: '颗粒状',
						desc: '粪便呈坚硬的球状或颗粒状，表明水分被过度吸收。',
						shapeClass: 'shape-1',
						isIdeal: false,
						chineseNum: '一'
					},
					{
						name: '块状香肠',
						desc: '粪便呈香肠状但有明显的块状结构。',
						shapeClass: 'shape-2',
						isIdeal: false,
						chineseNum: '二'
					},
					{
						name: '裂纹香肠',
						desc: '粪便呈香肠状，表面有明显的裂纹。',
						shapeClass: 'shape-3',
						isIdeal: false,
						chineseNum: '三'
					},
					{
						name: '香肠型',
						desc: '最理想的状态，表明消化系统极其健康、平衡。',
						shapeClass: 'shape-4',
						isIdeal: true,
						chineseNum: '四'
					},
					{
						name: '软团状',
						desc: '粪便呈软团状，边缘清晰，表明排便较快。',
						shapeClass: 'shape-5',
						isIdeal: false,
						chineseNum: '五'
					},
					{
						name: '糊状',
						desc: '粪便呈糊状，边缘毛糙不规则。',
						shapeClass: 'shape-6',
						isIdeal: false,
						chineseNum: '六'
					},
					{
						name: '水样',
						desc: '粪便呈完全液体状，没有固体成分。',
						shapeClass: 'shape-7',
						isIdeal: false,
						chineseNum: '七'
					}
				],
				bristolImages: [
					'/pages/health/static/bristolstool-image/bristolstool-type1.png',
					'/pages/health/static/bristolstool-image/bristolstool-type2.png',
					'/pages/health/static/bristolstool-image/bristolstool-type3.png',
					'/pages/health/static/bristolstool-image/bristolstool-type4.png',
					'/pages/health/static/bristolstool-image/bristolstool-type5.png',
					'/pages/health/static/bristolstool-image/bristolstool-type6.png',
					'/pages/health/static/bristolstool-image/bristolstool-type7.png'
				],
				pageIcons: {}
			}
		},
		onLoad() {
			this.loadPageIcons()
		},
		methods: {
			goBack() {
				uni.navigateBack()
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
			getBristolImageUrl(index) {
				return this.bristolImages[index] || ''
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		display: flex;
		flex-direction: column;
		gap: 32rpx;
		padding-top: 32rpx;
		padding-bottom: 60rpx;
		padding-left: 20rpx;
		padding-right: 20rpx;
	}

	.intro-section {
		text-align: center;
		padding: 0 40rpx;
	}

	.intro-title {
		font-size: 40rpx;
		font-weight: 700;
		color: #8d4b00;
		display: block;
		margin-bottom: 16rpx;
	}

	.intro-desc {
		font-size: 26rpx;
		color: #887364;
		line-height: 1.6;
	}

	.type-list {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	.type-card {
		display: flex;
		gap: 24rpx;
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 28rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.type-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: 32rpx;
		background: #f5f5f4;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.8);
	}

	.type-img {
		width: 60rpx;
		height: 60rpx;
	}

	.type-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}

	.type-number {
		font-size: 22rpx;
		font-weight: 600;
		color: #d4a373;
	}

	.type-name {
		font-size: 30rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.type-desc {
		font-size: 24rpx;
		color: #887364;
		line-height: 1.5;
	}

	.summary-card {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 28rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.summary-row {
		display: flex;
		justify-content: space-around;
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		padding: 16rpx 20rpx;
		border-radius: 24rpx;
		background: rgba(255, 248, 235, 0.5);

		&.ideal {
			border: 1px solid rgba(141, 75, 0, 0.2);
		}
	}

	.summary-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;

		&.constipation {
			background: #c0533c;
		}

		&.ideal {
			background: #8d4b00;
		}

		&.diarrhea {
			background: #d99441;
		}
	}

	.summary-label {
		font-size: 20rpx;
		font-weight: 600;
		color: #887364;
	}

	.summary-status {
		font-size: 22rpx;
		font-weight: 700;

		.ideal & {
			color: #8d4b00;
		}

		.summary-item:not(.ideal) & {
			color: #554336;
		}
	}

	.back-btn {
		background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
		border-radius: 48rpx;
		padding: 28rpx;
		text-align: center;
		margin-top: 16rpx;
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
		}
	}

	.btn-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}
</style>