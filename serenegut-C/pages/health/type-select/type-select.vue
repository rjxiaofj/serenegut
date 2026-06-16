<template>
	<view class="page-container-no-tab">
		<custom-nav title="选择类型" showBack />
		<view class="content">
			<view class="type-list">
				<view 
					v-for="(type, index) in bristolTypes" 
					:key="index"
					:class="['type-card', { active: selectedType === index + 1 }]"
					@click="selectType(index + 1)"
				>
					<view class="type-icon">
						<image :src="bristolImages[index]" class="type-img" mode="aspectFit" />
					</view>
					<view class="type-content">
						<text class="type-number">类型 {{ index + 1 }}</text>
						<text class="type-desc">{{ type.desc }}</text>
					</view>
					<view v-if="selectedType === index + 1" class="type-check">
						<AppIcon name="check" color="white" :size="22" />
					</view>
				</view>
			</view>

			<view class="confirm-btn" @click="confirmSelect">
				<text class="btn-text">确认选择</text>
			</view>
		</view>
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'

	export default {
		name: 'TypeSelect',
		components: {
			CustomNav,
			AppIcon
		},
		data() {
			return {
				selectedType: uni.getStorageSync('selectedBristolType') || 4,
				bristolImages: [
					'/pages/health/static/bristolstool-image/bristolstool-type1.png',
					'/pages/health/static/bristolstool-image/bristolstool-type2.png',
					'/pages/health/static/bristolstool-image/bristolstool-type3.png',
					'/pages/health/static/bristolstool-image/bristolstool-type4.png',
					'/pages/health/static/bristolstool-image/bristolstool-type5.png',
					'/pages/health/static/bristolstool-image/bristolstool-type6.png',
					'/pages/health/static/bristolstool-image/bristolstool-type7.png'
				],
				bristolTypes: [
					{ desc: '坚果状或球状，坚硬' },
					{ desc: '香肠状，但块状' },
					{ desc: '香肠状，表面有裂缝' },
					{ desc: '香肠状或蛇状，光滑' },
					{ desc: '软团状，边缘清晰' },
					{ desc: '糊状，边缘毛糙' },
					{ desc: '水样，无固体' }
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
		selectType(type) {
			this.selectedType = type
		},
		confirmSelect() {
			uni.setStorageSync('selectedBristolType', this.selectedType)
			uni.showToast({
				title: `已选择类型 ${this.selectedType}`,
				icon: 'success'
			})
			setTimeout(() => {
				uni.navigateBack()
			}, 1000)
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
		}
	}
}
</script>

<style lang="scss" scoped>
	.content {
		padding-top: 32rpx;
		padding-bottom: 60rpx;
	}

	.type-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding-bottom: 40rpx;
	}

	.type-card {
		display: flex;
		align-items: center;
		gap: 24rpx;
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 32rpx;
		padding: 28rpx;
		border: 2px solid transparent;
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&.active {
			border-color: #8d4b00;
			background: rgba(141, 75, 0, 0.08);
		}
	}

	.type-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: 24rpx;
		background: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.type-img {
		width: 56rpx;
		height: 56rpx;
	}

	.type-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}

	.type-number {
		font-size: 28rpx;
		font-weight: 700;
		color: #2a1f15;
	}

	.type-desc {
		font-size: 24rpx;
		color: #887364;
	}

	.type-check {
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		background: #8d4b00;
		color: #ffffff;
		font-size: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.confirm-btn {
		background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
		border-radius: 48rpx;
		padding: 28rpx;
		text-align: center;
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