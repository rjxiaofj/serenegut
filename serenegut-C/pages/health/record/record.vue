<template>
	<view class="page-container-no-tab">
		<custom-nav title="记录详情" showBack />
		<view class="content">
			<view class="section">
				<view class="section-header">
					<text class="section-title">形态类型</text>
					<view class="more-btn" @click="openBristol">
						<text class="more-text">更多</text>
						<image :src="pageIcons.right" class="more-arrow" mode="aspectFit" />
					</view>
				</view>
				<view class="type-card" @click="openBristol">
				<!-- 已选择形态类型时显示详情 -->
				<template v-if="selectedType > 0">
					<view class="type-check"><AppIcon name="check" color="white" :size="22" /></view>
					<view class="type-image">
						<image :src="bristolImages[selectedType - 1]" class="bristol-img" mode="aspectFit" />
					</view>
					<text class="type-number">类型 {{ selectedType }}</text>
					<text class="type-desc">{{ bristolTypes[selectedType - 1].desc }}</text>
					<text v-if="selectedType === 4" class="type-ideal">最理想</text>
				</template>
				<!-- 未选择形态类型时显示占位提示 -->
				<view v-else class="type-placeholder">
					<view class="type-placeholder-icon">
						<text class="placeholder-arrow">›</text>
					</view>
					<text class="type-placeholder-text">请选择形态类型</text>
					<text class="type-placeholder-hint">点击选择布里斯托大便分类</text>
				</view>
			</view>
			</view>

			<view class="section">
				<view class="section-header">
					<text class="section-title">蹲坑时间</text>
					<view class="modify-btn" @click="openDurationModal">
						<text class="modify-text">修改</text>
					</view>
				</view>
				<view class="duration-card">
					<view class="duration-icon">
						<image :src="pageIcons.clock" class="duration-img" mode="aspectFit" />
					</view>
					<text class="duration-value">{{ duration > 0 ? formatDuration(duration) : '未记录' }}</text>
				</view>
			</view>

			<view class="section">
				<text class="section-title">颜色</text>
				<view class="color-grid" style="margin-bottom: 16rpx;">
					<view 
						v-for="(color, index) in colors" 
						:key="index"
						:class="['color-item', { active: selectedColor === color }]"
						:style="{ backgroundColor: color }"
						@click="selectColor(color)"
					>
						<view v-if="selectedColor === color" class="color-check"><AppIcon name="check" color="white" :size="22" /></view>
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title">排便感受</text>
				<view class="feeling-grid" style="margin-top: 16rpx;">
					<view
						v-for="feeling in feelings"
						:key="feeling"
						:class="['feeling-item', { active: selectedFeeling === feeling }]"
						@click="selectFeeling(feeling)"
					>
						<text class="feeling-text">{{ feeling }}</text>
					</view>
				</view>
			</view>

			<!-- 饮水量记录 -->
			<view class="section">
				<view class="section-header">
					<text class="section-title">饮水量</text>
					<text class="record-value-text">{{ water > 0 ? water + ' ml' : '未记录' }}</text>
				</view>
				<view class="water-grid">
					<view
						v-for="opt in waterOptions"
						:key="opt"
						:class="['water-item', { active: water === opt }]"
						@click="selectWater(opt)"
					>
						<AppIcon :name="getWaterEmoji(opt)" :size="32" />
						<text class="water-text">{{ opt }}ml</text>
					</view>
					<view
						:class="['water-item', { active: isCustomWater }]"
						@click="openWaterInput"
					>
						<AppIcon name="pencil" :size="32" />
						<text class="water-text">更多</text>
					</view>
				</view>
			</view>

			<!-- 膳食纤维记录 -->
			<view class="section">
				<view class="section-header">
					<text class="section-title">膳食纤维</text>
					<text class="record-value-text">{{ fiber > 0 ? fiber + ' g' : '未记录' }}</text>
				</view>
				<view class="fiber-grid">
					<view
						v-for="opt in fiberOptions"
						:key="opt"
						:class="['fiber-item', { active: fiber === opt }]"
						@click="selectFiber(opt)"
					>
						<AppIcon :name="getFiberEmoji(opt)" :size="32" />
						<text class="fiber-text">{{ opt }}g</text>
					</view>
					<view
						:class="['fiber-item', { active: isCustomFiber }]"
						@click="openFiberInput"
					>
						<AppIcon name="pencil" :size="32" />
						<text class="fiber-text">更多</text>
					</view>
				</view>
			</view>

			<view v-if="userGender === 'female'" class="section">
				<text class="section-title">生理期</text>
				<view class="feeling-grid">
					<view 
						:class="['feeling-item', { active: isMenstruation === true }]"
						@click="selectMenstruation(true)"
					>
						<text class="feeling-text">是</text>
					</view>
					<view 
						:class="['feeling-item', { active: isMenstruation === false }]"
						@click="selectMenstruation(false)"
					>
						<text class="feeling-text">否</text>
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title">备注说明</text>
				<textarea 
					class="note-input" 
					v-model="note" 
					placeholder="例如：今天吃了很多蔬菜，感觉好多了..."
					placeholder-class="note-placeholder"
				/>
			</view>

		<TimePicker 
			v-model:visible="showDurationModal" 
			title="修改蹲坑时间"
			:value="duration"
			:maxHours="0"
			:showSeconds="true"
			:showHours="false"
			@confirm="handleDurationConfirm"
		/>

		<MenstruationModal
			:visible="showMenstruationModal"
			@close="closeMenstruationModal"
		/>

		<InputModal
			:visible="showWaterInput"
			title="输入饮水量"
			desc="请输入今日饮水量"
			:value="water"
			placeholder="如 1800"
			unit="ml"
			:min="0"
			:max="10000"
			@confirm="confirmWaterInput"
			@cancel="showWaterInput = false"
		/>

		<InputModal
			:visible="showFiberInput"
			title="输入膳食纤维"
			desc="请输入今日膳食纤维摄入量"
			:value="fiber"
			placeholder="如 35"
			unit="g"
			:min="0"
			:max="500"
			@confirm="confirmFiberInput"
			@cancel="showFiberInput = false"
		/>

		<view class="submit-btn" @click="submitRecord">
				<AppIcon name="check" color="white" :size="28" />
				<text class="submit-text">完成记录</text>
			</view>
		</view>

		<!-- 登录检查弹窗 -->
		<ConfirmModal
			:visible="showLoginModal"
			title="提示"
			content="登录后才能使用此功能，是否前往登录？"
			confirmText="去登录"
			cancelText="取消"
			@confirm="handleLoginConfirm"
			@cancel="handleLoginCancel"
		/>

		<!-- 封禁公告弹窗 -->
		<AnnouncementModal
			:visible="showBanModal"
			type="ban"
			:title="banInfo.title || '账号封禁通知'"
			:richContent="banInfo.rich_content || ''"
			:banExpiresAt="banInfo.expires_at || 0"
			:banIsPermanent="banInfo.is_permanent || false"
		/>
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import TimePicker from '@/components/TimePicker/TimePicker.vue'
	import MenstruationModal from '@/components/MenstruationModal/MenstruationModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import InputModal from '@/components/InputModal/InputModal.vue'
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import AnnouncementModal from '@/components/AnnouncementModal/AnnouncementModal.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { recordApi, bristolApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'Record',
		components: {
			TimePicker,
			MenstruationModal,
			CustomNav,
			InputModal,
			ConfirmModal,
			AnnouncementModal,
			AppIcon
		},
		data() {
				return {
					selectedType: uni.getStorageSync('selectedBristolType') || 0,
					selectedColor: '#8D4B00',
					selectedFeeling: '顺畅',
					note: '',
					duration: 0,
					selectedYear: new Date().getFullYear(),
					selectedMonth: new Date().getMonth() + 1,
					selectedDay: new Date().getDate(),
				isMenstruation: false,
				showMenstruationModal: false,
				userGender: '',
				water: 0,
				fiber: 0,
				waterOptions: [250, 500, 750, 1000, 1500],
				fiberOptions: [10, 15, 20, 25, 30],
					colors: ['#8D4B00', '#D4A373', '#6B8E23', '#2C2C2C', '#A52A2A', '#E5E4E2'],
					feelings: ['顺畅', '费力', '腹泻'],
					feelingMap: {
						'顺畅': 'smooth',
						'费力': 'effortful',
						'腹泻': 'diarrhea'
					},
					colorMap: {
						'#8D4B00': '棕色',
						'#D4A373': '浅棕色',
						'#6B8E23': '绿色',
						'#2C2C2C': '黑色',
						'#A52A2A': '红色',
						'#E5E4E2': '白色'
					},
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
						{ desc: '香肠状，表面有裂纹' },
						{ desc: '香肠状或蛇状，光滑' },
						{ desc: '软团状，边缘清晰' },
						{ desc: '糊状，边缘毛糙' },
						{ desc: '水样，无固体' }
					],
					pageIcons: {},
				showDurationModal: false,
				showWaterInput: false,
				showFiberInput: false,
				showLoginModal: false,
				showBanModal: false,
				banInfo: {}
			}
	},
	computed: {
		isCustomWater() {
			return this.water > 0 && this.waterOptions.indexOf(this.water) === -1
		},
		isCustomFiber() {
			return this.fiber > 0 && this.fiberOptions.indexOf(this.fiber) === -1
		}
	},
	onShow() {
			// 检查本地缓存的封禁信息，若存在则展示封禁弹窗
			const banInfo = uni.getStorageSync('banInfo')
			if (banInfo) {
				this.banInfo = banInfo
				this.showBanModal = true
			}
			const pages = getCurrentPages()
			const currentPage = pages[pages.length - 1]
			const options = currentPage.$page?.options || currentPage.options || {}
			
			if (options && options.year && options.month && options.day) {
				this.selectedYear = parseInt(options.year)
				this.selectedMonth = parseInt(options.month)
				this.selectedDay = parseInt(options.day)
			}
			
			const savedType = uni.getStorageSync('selectedBristolType')
			if (savedType) {
				this.selectedType = savedType
			}
			this.loadPageIcons()
		},
		onLoad(options) {
			uni.$on('showBanModal', this.handleBanModalEvent)
			if (options && options.year && options.month && options.day) {
				this.selectedYear = parseInt(options.year)
				this.selectedMonth = parseInt(options.month)
				this.selectedDay = parseInt(options.day)
			}
			if (options && options.duration) {
				this.duration = parseInt(options.duration)
			}
			this.checkLogin()
			this.loadUserGender()
		},
		onUnload() {
			uni.$off('showBanModal', this.handleBanModalEvent)
		},
		methods: {
			checkLogin() {
				const isLoggedIn = uni.getStorageSync('isLoggedIn')
				if (!isLoggedIn) {
					this.showLoginModal = true
				}
			},
			/* 处理全局封禁弹窗事件 */
			handleBanModalEvent(banData) {
				this.banInfo = banData
				this.showBanModal = true
			},
			/* 确认登录：跳转到登录页 */
			handleLoginConfirm() {
				this.showLoginModal = false
				uni.reLaunch({ url: '/pages/profile/profile' })
			},
			/* 取消登录：返回上一页 */
			handleLoginCancel() {
				this.showLoginModal = false
				uni.navigateBack()
			},
			goBack() {
				uni.navigateBack({
					delta: 999,
					fail: () => {
						uni.redirectTo({
							url: '/pages/index/index'
						})
					}
				})
			},
			openBristol() {
				uni.navigateTo({
					url: '/pages/health/type-select/type-select'
				})
			},
			selectColor(color) {
				this.selectedColor = color
			},
			selectFeeling(feeling) {
				this.selectedFeeling = feeling
			},
			selectWater(value) {
				this.water = this.water === value ? 0 : value
			},
			selectFiber(value) {
				this.fiber = this.fiber === value ? 0 : value
			},
			openWaterInput() {
				this.showWaterInput = true
			},
			confirmWaterInput(val) {
				this.water = val
				this.showWaterInput = false
				uni.showToast({ title: '已设置 ' + val + 'ml', icon: 'none' })
			},
			openFiberInput() {
				this.showFiberInput = true
			},
			confirmFiberInput(val) {
				this.fiber = val
				this.showFiberInput = false
				uni.showToast({ title: '已设置 ' + val + 'g', icon: 'none' })
			},
			getWaterEmoji(ml) {
				if (ml <= 250) return 'cup'
				if (ml <= 750) return 'cup'
				if (ml <= 1500) return 'bottle'
				return 'droplet'
			},
			getFiberEmoji(g) {
				if (g <= 10) return 'cup'
				if (g <= 20) return 'salad'
				return 'plant-2'
			},
			selectMenstruation(value) {
				this.isMenstruation = value
				if (value) {
					this.showMenstruationModal = true
				}
			},
			closeMenstruationModal() {
				this.showMenstruationModal = false
			},
			loadUserGender() {
				const userInfo = uni.getStorageSync('userInfo')
				if (userInfo) {
					const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
					this.userGender = parsed.gender || ''
				}
			},
			async submitRecord() {
				if (!this.selectedType) {
				uni.showToast({
					title: '请选择形态类型',
					icon: 'none'
				})
				return
			}

			// 蹲坑时间为必填字段，为 0 或空时阻止提交
			if (!this.duration || this.duration <= 0) {
				uni.showToast({
					title: '请选择蹲坑时间',
					icon: 'none'
				})
				return
			}

			if (!this.selectedColor) {
					uni.showToast({
						title: '请选择颜色',
						icon: 'none'
					})
					return
				}
				
				if (!this.selectedFeeling) {
					uni.showToast({
						title: '请选择排便感受',
						icon: 'none'
					})
					return
				}
				
				const userId = uni.getStorageSync('userId')
				if (!userId) {
					uni.showToast({
						title: '用户信息异常',
						icon: 'none'
					})
					return
				}
				
				uni.showLoading({
					title: '保存中...'
				})

				/* 使用 API 服务层新增排便记录 */
				try {
					const res = await recordApi.add({
						userId,
						type: this.selectedType,
						color: this.selectedColor,
						feeling: this.feelingMap[this.selectedFeeling],
						note: this.note,
						duration: this.duration,
						water: this.water,
						fiber: this.fiber,
						date: new Date(Date.UTC(this.selectedYear, this.selectedMonth - 1, this.selectedDay)).toISOString(),
						isMenstruation: this.isMenstruation
					})
					uni.hideLoading()
					if (res.code === 0) {
						uni.showToast({
							title: '记录成功',
							icon: 'success'
						})
						uni.$emit('recordSaved')
						setTimeout(() => {
							uni.switchTab({
								url: '/pages/index/index'
							})
						}, 1500)
					} else {
						uni.showToast({
							title: res.message,
							icon: 'none'
						})
					}
				} catch (err) {
					uni.hideLoading()
					console.error('保存记录失败:', err)
					uni.showToast({
						title: '保存失败，请稍后重试',
						icon: 'none'
					})
				}
			},
			async loadBristolImages() {
			try {
				const res = await bristolApi.get()
				if (res && res.images) {
					const urls = res.images.map(item => item.url)
					for (let i = 0; i < urls.length; i++) {
						if (urls[i]) {
							this.bristolImages[i] = urls[i]
						}
					}
				}
			} catch (err) {
				console.error('获取布里斯托图片失败:', err)
			}
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
			formatDuration(seconds) {
				const mins = Math.floor(seconds / 60)
				const secs = seconds % 60
				if (mins > 0) {
					return `${mins}分${secs}秒`
				}
				return `${secs}秒`
			},
			openDurationModal() {
				this.showDurationModal = true
			},
			handleDurationConfirm(totalSeconds) {
				this.duration = totalSeconds
				uni.showToast({
					title: '蹲坑时间已修改',
					icon: 'success'
				})
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

	.section {
		background: rgba(255, 249, 240, 0.82);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24rpx;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #2a1f15;
		margin-bottom: 28rpx;
	}

	.more-btn {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.more-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.more-arrow {
		width: 24rpx;
		height: 24rpx;
	}

	.type-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(141, 75, 0, 0.05);
		border-radius: 48rpx;
		padding: 32rpx;
		border: 2px solid #8d4b00;
		position: relative;
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.type-check {
		position: absolute;
		top: -16rpx;
		right: -16rpx;
		width: 48rpx;
		height: 48rpx;
		border-radius: 50%;
		background: #8d4b00;
		color: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28rpx;
	}

	.type-image {
		width: 160rpx;
		height: 160rpx;
		border-radius: 50%;
		background: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.bristol-img {
		width: 120rpx;
		height: 120rpx;
	}

	.type-number {
		font-size: 32rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.type-desc {
		font-size: 24rpx;
		color: #887364;
		margin-top: 8rpx;
	}

	.type-ideal {
		font-size: 20rpx;
		font-weight: 600;
		color: #8d4b00;
		margin-top: 12rpx;
		opacity: 0.8;
	}

	/* 未选择形态类型时的占位提示 */
	.type-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24rpx 0;
	}

	.type-placeholder-icon {
		width: 100rpx;
		height: 100rpx;
		border-radius: 50%;
		background: rgba(141, 75, 0, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20rpx;
	}

	.placeholder-arrow {
		font-size: 56rpx;
		color: #8d4b00;
		transform: rotate(90deg);
	}

	.type-placeholder-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.type-placeholder-hint {
		font-size: 24rpx;
		color: #887364;
		margin-top: 8rpx;
	}

	.color-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 24rpx;
		justify-content: space-between;
	}

	.color-item {
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
		border: 3px solid transparent;

		&.active {
			border-color: #8d4b00;
			transform: scale(1.1);
		}
	}

	.color-check {
		font-size: 28rpx;
		color: #ffffff;
		font-weight: 600;
	}

	.feeling-grid {
		display: flex;
		gap: 16rpx;
	}

	.feeling-item {
		flex: 1;
		padding: 24rpx;
		border-radius: 32rpx;
		background: rgba(255, 248, 235, 0.5);
		text-align: center;
		border: 2px solid rgba(136, 115, 100, 0.1);
		transition: all 0.3s;

		&.active {
			background: rgba(255, 219, 203, 0.8);
			border-color: transparent;
		}
	}

	.feeling-text {
		font-size: 28rpx;
		font-weight: 600;
		color: #554336;
	}

	.note-input {
		width: 100%;
		min-height: 200rpx;
		background: rgba(255, 248, 235, 0.45);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 32rpx;
		padding: 24rpx;
		font-size: 28rpx;
		color: #2a1f15;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		margin-top: 20rpx;
		box-sizing: border-box;
	}

	.note-placeholder {
		color: #887364;
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		background: linear-gradient(135deg, #8d4b00 0%, #b15f00 100%);
		border-radius: 48rpx;
		padding: 32rpx;
		text-align: center;
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		margin-top: 16rpx;

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
		}
	}

	.submit-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	.modify-btn {
		padding: 12rpx 24rpx;
		background: rgba(141, 75, 0, 0.1);
		border-radius: 24rpx;
	}

	.modify-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	.duration-card {
		display: flex;
		align-items: center;
		gap: 24rpx;
		background: linear-gradient(135deg, rgba(141, 75, 0, 0.08) 0%, rgba(255, 219, 203, 0.3) 100%);
		border-radius: 32rpx;
		padding: 36rpx 32rpx;
		border: 1rpx solid rgba(141, 75, 0, 0.1);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.duration-card:active {
		transform: scale(0.98);
	}

	.duration-icon {
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		background: rgba(141, 75, 0, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.duration-img {
		width: 40rpx;
		height: 40rpx;
	}

	.duration-value {
		font-size: 36rpx;
		font-weight: 700;
		color: #8d4b00;
	}

	.record-value-text {
		font-size: 28rpx;
		font-weight: 700;
		color: #8d4b00;
	}

	/* 饮水量 */
	.water-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-top: 16rpx;
	}

	.water-item {
		flex: 1;
		min-width: 140rpx;
		padding: 24rpx 16rpx;
		border-radius: 32rpx;
		background: rgba(255, 248, 235, 0.5);
		border: 2px solid rgba(136, 115, 100, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		transition: all 0.3s;

		&.active {
			background: rgba(59, 130, 246, 0.12);
			border-color: #3B82F6;
		}
	}

	.water-emoji {
		font-size: 40rpx;
	}

	.water-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #554336;
	}

	/* 膳食纤维 */
	.fiber-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
		margin-top: 16rpx;
	}

	.fiber-item {
		flex: 1;
		min-width: 120rpx;
		padding: 24rpx 16rpx;
		border-radius: 32rpx;
		background: rgba(255, 248, 235, 0.5);
		border: 2px solid rgba(136, 115, 100, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		transition: all 0.3s;

		&.active {
			background: rgba(34, 197, 94, 0.12);
			border-color: #22C55E;
		}
	}

	.fiber-emoji {
		font-size: 40rpx;
	}

	.fiber-text {
		font-size: 24rpx;
		font-weight: 600;
		color: #554336;
	}


</style>