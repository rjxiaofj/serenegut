<template>
	<view class="page-container-no-tab">
		<custom-nav title="修改账户资料" showBack />
		<ConfirmModal
			:visible="showConfirmModal"
			:title="confirmModalTitle"
			:content="confirmModalContent"
			:confirmText="confirmModalConfirmText"
			:cancelText="confirmModalCancelText"
			@confirm="confirmConfirmModal"
			@cancel="closeConfirmModal"
		/>
		<!-- 来源选择弹窗 -->
		<view class="source-picker-mask" v-if="showSourcePicker" @click="closeSourcePicker">
			<view class="source-picker" @click.stop>
				<view class="picker-header">
					<text class="picker-title">{{ sourcePickerType === 'avatar' ? '选择头像来源' : '选择昵称来源' }}</text>
				</view>
				<view class="picker-options">
					<button v-if="sourcePickerType === 'avatar'" class="picker-option picker-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
						<text class="option-text">获取微信头像</text>
					</button>
					<view v-if="sourcePickerType === 'nickname'" class="picker-option" @click="selectWeChatNickname">
						<text class="option-text">获取微信昵称</text>
					</view>
					<view v-if="sourcePickerType === 'avatar'" class="picker-option" @click="selectAlbum">
						<text class="option-text">从相册选择</text>
					</view>
					<view v-if="sourcePickerType === 'avatar'" class="picker-option" @click="selectCamera">
						<text class="option-text">拍照</text>
					</view>
					<view v-if="sourcePickerType === 'nickname'" class="picker-option" @click="selectManualInput">
						<text class="option-text">手动输入</text>
					</view>
				</view>
				<view class="picker-cancel" @click="closeSourcePicker">
					<text class="cancel-text">取消</text>
				</view>
			</view>
		</view>
		<view class="content">
			<view class="avatar-section">
				<view class="avatar-container">
					<image 
						:src="avatarPreviewUrl || formData.avatarUrl || 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'" 
						class="avatar-img" 
						mode="aspectFill" 
					/>
					<view class="avatar-edit-btn" @click="openSourcePicker('avatar')">
						<AppIcon name="camera" color="white" :size="32" />
					</view>
				</view>
				<text class="avatar-tip">点击头像更换</text>
			</view>

			<view class="form-card">
				<view class="form-item">
					<text class="form-label">昵称</text>
					<input
					:value="formData.nickName"
					class="form-input"
					:type="nickNameInputType"
					placeholder="请输入您的昵称"
					maxlength="20"
					@click="onNicknameClick"
					@input="onNicknameInput"
					@blur="onNicknameBlur"
					:focus="nicknameFocus"
				/>
				</view>

				<view class="form-item">
					<view class="label-row">
						<text class="form-label">电话号码</text>
						<text class="required-mark">*</text>
					</view>
					<view class="input-with-action">
						<input
							:value="phoneDisplay"
							class="form-input"
							type="number"
							placeholder="请输入电话号码"
							maxlength="11"
							@input="onPhoneInput"
						/>
						<button class="get-phone-btn" open-type="getPhoneNumber" @getphonenumber="onGetPhoneNumber">
							<text class="get-phone-text">获取</text>
						</button>
					</view>
				</view>

				<view class="form-item">
					<view class="label-row">
						<text class="form-label">电子邮箱</text>
						<text v-if="emailLocked" class="locked-tip">（已绑定）</text>
					</view>
					<input
						v-model="formData.email"
						class="form-input"
						:class="{ disabled: emailLocked }"
						:disabled="emailLocked"
						type="email"
						placeholder="请输入邮箱"
					/>
				</view>

				<view class="form-item">
				<view class="label-row">
					<text class="form-label">性别</text>
					<text class="required-mark">*</text>
					<text v-if="genderLocked" class="locked-tip">（已锁定，仅可修改一次）</text>
				</view>
				<view class="gender-options">
					<view
						:class="['gender-option', { active: formData.gender === 'male', disabled: genderLocked }]"
						@click="selectGender('male')"
					>
						<text class="gender-text">男</text>
					</view>
					<view
						:class="['gender-option', { active: formData.gender === 'female', disabled: genderLocked }]"
						@click="selectGender('female')"
					>
						<text class="gender-text">女</text>
					</view>
				</view>
			</view>

			<view class="form-item">
				<view class="label-row">
					<text class="form-label">生日</text>
					<text v-if="birthdayLocked" class="locked-tip">（已锁定，仅可修改一次）</text>
				</view>
				<DatePicker
					v-model="formData.birthday"
					placeholder="请选择生日"
					title="选择生日"
					:startYear="1940"
					:endDate="todayStr"
					:locked="birthdayLocked"
					@change="onBirthdayChange"
				/>
			</view>
			</view>


			<view class="save-btn" :class="{ disabled: !canSave }" @click="handleSave">
				<text class="save-text">保存修改</text>
			</view>
		</view>

		<CustomToast ref="customToast" />
	</view>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import DatePicker from '@/components/DatePicker/DatePicker.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { userApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'EditProfile',
		components: {
			ConfirmModal,
			DatePicker,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				avatarPreviewUrl: '',
				formData: {
					avatarUrl: 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg',
					nickName: '',
					name: '',
					phone: '',
					email: '',
					gender: '',
					birthday: ''
				},
				originalData: {},
				pageIcons: {},
				showConfirmModal: false,
				confirmModalTitle: '',
				confirmModalContent: '',
				confirmModalConfirmText: '确定',
				confirmModalCancelText: '取消',
				confirmModalCallback: null,
				showSourcePicker: false,
				sourcePickerType: '',
				nicknameFocus: false,
				nickNameInputType: 'text',
				hasSelectedNicknameSource: false,
				todayStr: new Date().toISOString().split('T')[0],
				emailLocked: false,
				birthdayLocked: false,
				genderLocked: false,
				phoneMasked: false
			}
		},
		computed: {
			canSave() {
				// 有变更 且 必填字段都有值
				if (!this.hasChanges()) return false
				if (!this.formData.nickName.trim()) return false
				if (!this.formData.phone.trim()) return false
				if (!this.formData.gender) return false
				return true
			},
			phoneDisplay() {
				const phone = this.formData.phone || ''
				if (this.phoneMasked && phone.length === 11) {
					return phone.substring(0, 3) + '****' + phone.substring(9)
				}
				return phone
			}
		},
		watch: {
			/* 生日修改后立即锁定，防止在当前页面再次修改 */
			'formData.birthday'(newVal, oldVal) {
				if (newVal && !oldVal && !this.birthdayLocked) {
					/* 首次设置生日，标记为已锁定（保存后生效） */
				}
			}
		},
		onLoad() {
			this.loadPageIcons()
			this.loadUserInfo().then(async () => {
				this.avatarPreviewUrl = await this.resolveAvatarUrl(this.formData.avatarUrl)
				this.saveOriginalData()
			})
		},
		onShow() {
			/* 避免重复加载导致覆盖未保存的编辑 */
		},
		onBackPress() {
			if (this.hasChanges()) {
				this.showModal('提示', '您有未保存的修改，确定要离开吗？', '确定离开', '继续编辑', () => {
					uni.navigateBack()
				})
				return true
			}
			return false
		},
		methods: {
			saveOriginalData() {
				this.originalData = JSON.parse(JSON.stringify(this.formData))
			},
			hasChanges() {
				return JSON.stringify(this.formData) !== JSON.stringify(this.originalData)
			},
			showModal(title, content, confirmText = '确定', cancelText = '取消', callback = null) {
				this.confirmModalTitle = title
				this.confirmModalContent = content
				this.confirmModalConfirmText = confirmText
				this.confirmModalCancelText = cancelText
				this.confirmModalCallback = callback
				this.showConfirmModal = true
			},
			closeConfirmModal() {
				this.showConfirmModal = false
				this.confirmModalCallback = null
			},
			confirmConfirmModal() {
				if (this.confirmModalCallback) {
					this.confirmModalCallback()
				}
				this.closeConfirmModal()
			},
			async loadUserInfo() {
				try {
					const userId = uni.getStorageSync('userId')
					if (!userId) {
						const userInfo = uni.getStorageSync('userInfo')
						if (userInfo) {
							const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
							this.formData.avatarUrl = parsed.avatarUrl || 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'
							this.formData.nickName = parsed.nickName || ''
							this.formData.name = parsed.name || ''
							this.formData.phone = parsed.phone || ''
							this.formData.email = parsed.email || ''
							this.formData.gender = parsed.gender || ''
							this.formData.birthday = parsed.birthday || ''
						}
						return
					}

					/* 使用 API 服务层获取用户资料 */
				const res = await userApi.get(userId)

				if (res && res.code === 0) {
					const user = res.data
						this.formData.avatarUrl = user.avatar_url || 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'
						this.formData.nickName = user.nickname || ''
						this.formData.name = user.name || ''
						this.formData.phone = user.phone || ''
						this.formData.email = user.email || ''
						this.formData.gender = user.gender || ''
						this.formData.birthday = user.birthday || ''
						// 邮箱已设置则锁定
						this.emailLocked = !!user.email
						// 生日已设置则锁定
						this.birthdayLocked = !!user.birthday
						// 性别已设置则锁定
						this.genderLocked = !!user.gender
						// 手机号已存在则脱敏显示
						this.phoneMasked = !!user.phone

						const userInfo = {
							avatarUrl: this.formData.avatarUrl,
							nickName: this.formData.nickName,
							name: this.formData.name,
							phone: this.formData.phone,
							email: this.formData.email,
							gender: this.formData.gender,
							birthday: this.formData.birthday
						}
						uni.setStorageSync('userInfo', JSON.stringify(userInfo))
					} else {
						const userInfo = uni.getStorageSync('userInfo')
						if (userInfo) {
							const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
							this.formData.avatarUrl = parsed.avatarUrl || 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'
							this.formData.nickName = parsed.nickName || ''
							this.formData.name = parsed.name || ''
							this.formData.phone = parsed.phone || ''
							this.formData.email = parsed.email || ''
							this.formData.gender = parsed.gender || ''
							this.formData.birthday = parsed.birthday || ''
						}
					}
				} catch (err) {
					console.error('加载用户信息失败:', err)
					const userInfo = uni.getStorageSync('userInfo')
					if (userInfo) {
						const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
						this.formData.avatarUrl = parsed.avatarUrl || 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'
						this.formData.nickName = parsed.nickName || ''
						this.formData.name = parsed.name || ''
						this.formData.phone = parsed.phone || ''
						this.formData.email = parsed.email || ''
						this.formData.gender = parsed.gender || ''
						this.formData.birthday = parsed.birthday || ''
					}
				}
			},
			handleGoBack() {
				if (this.hasChanges()) {
					this.showModal('提示', '您有未保存的修改，确定要离开吗？', '确定', '取消', () => {
						uni.navigateBack()
					})
				} else {
					uni.navigateBack()
				}
			},
			async handleSave() {
				if (!this.canSave) {
					uni.showToast({ title: '请先完善必填信息', icon: 'none' })
					return
				}

				// 必填验证
				if (!this.formData.nickName.trim()) {
					uni.showToast({ title: '请输入昵称', icon: 'none' })
					return
				}
				if (!this.formData.phone.trim()) {
					uni.showToast({ title: '请输入电话号码', icon: 'none' })
					return
				}
				if (!/^1[3-9]\d{9}$/.test(this.formData.phone.trim())) {
					uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
					return
				}
				if (!this.formData.gender) {
					uni.showToast({ title: '请选择性别', icon: 'none' })
					return
				}

				const userId = uni.getStorageSync('userId')
				if (!userId) {
					uni.showToast({
						title: '请先登录',
						icon: 'none'
					})
					return
				}

				this.showModal('提示', '确定要保存修改吗？', '保存', '取消', async () => {
					try {
						/* 只提交实际可修改的字段，已锁定的性别/生日不再重复提交 */
						const payload = {
							avatarUrl: this.formData.avatarUrl,
							nickName: this.formData.nickName,
							name: this.formData.name,
							phone: this.formData.phone,
							email: this.formData.email
						}
						if (!this.genderLocked) payload.gender = this.formData.gender
						if (!this.birthdayLocked) payload.birthday = this.formData.birthday

						const res = await userApi.update(userId, payload)

						if (res && res.code === 0) {
						const userInfo = uni.getStorageSync('userInfo')
						const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo || {}
						parsed.avatarUrl = this.formData.avatarUrl
						parsed.nickName = this.formData.nickName
						parsed.name = this.formData.name
						parsed.phone = this.formData.phone
						parsed.email = this.formData.email
						parsed.gender = this.formData.gender
						parsed.birthday = this.formData.birthday
						uni.setStorageSync('userInfo', JSON.stringify(parsed))

						/* 保存成功后锁定已设置的生日和性别 */
						if (this.formData.birthday) this.birthdayLocked = true
						if (this.formData.gender) this.genderLocked = true

						this.saveOriginalData()

						/* 清除新用户强制完善资料标记 */
						uni.removeStorageSync('needProfileSetup')

						uni.showToast({
								title: '更新资料成功',
								icon: 'success'
							})
							setTimeout(() => {
								uni.navigateBack()
							}, 1500)
						} else {
							const errorMsg = res?.message || '保存失败'
							uni.showToast({
								title: errorMsg,
								icon: 'none'
							})
						}
					} catch (err) {
						console.error('保存失败 - 异常:', err)
						uni.showToast({
							title: '保存失败，请重试',
							icon: 'none'
						})
					}
				})
			},
			changeAvatar() {
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: (res) => {
						this.uploadAvatar(res.tempFilePaths[0])
					},
					fail: () => {
						uni.showToast({
							title: '取消选择',
							icon: 'none'
						})
					}
				})
			},
			async uploadAvatar(tempFilePath) {
				uni.showLoading({ title: '上传头像...' })
				try {
					const uploadRes = await uniCloud.uploadFile({
						filePath: tempFilePath,
						cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`
					})
					if (uploadRes.fileID) {
						this.formData.avatarUrl = uploadRes.fileID
						this.avatarPreviewUrl = await this.resolveAvatarUrl(uploadRes.fileID)
					}
				} catch (err) {
					console.error('上传失败:', err)
					uni.showToast({
						title: '头像上传失败，请重试',
						icon: 'none'
					})
				} finally {
					uni.hideLoading()
				}
			},
			/* 云存储 fileID 转成可用于 image 的临时地址 */
			async resolveAvatarUrl(url) {
				if (!url || !url.startsWith('cloud://')) return url
				try {
					const res = await uniCloud.getTempFileURL({ fileList: [url] })
					const file = res.fileList && res.fileList[0]
					return (file && file.tempFileURL) || url
				} catch (err) {
					console.error('获取头像地址失败:', err)
					return url
				}
			},
			openSourcePicker(type) {
				this.sourcePickerType = type
				this.showSourcePicker = true
			},
			closeSourcePicker() {
				this.showSourcePicker = false
			},
			onChooseAvatar(e) {
				this.closeSourcePicker()
				if (e.detail.avatarUrl) {
					this.uploadAvatar(e.detail.avatarUrl)
				}
			},
			selectWeChatNickname() {
				this.closeSourcePicker()
				this.nickNameInputType = 'nickname'
				this.hasSelectedNicknameSource = true
				this.$nextTick(() => {
					this.nicknameFocus = true
				})
			},
			selectAlbum() {
				this.closeSourcePicker()
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album'],
					success: (res) => {
						this.uploadAvatar(res.tempFilePaths[0])
					}
				})
			},
			selectCamera() {
				this.closeSourcePicker()
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['camera'],
					success: (res) => {
						this.uploadAvatar(res.tempFilePaths[0])
					}
				})
			},
			selectManualInput() {
				this.closeSourcePicker()
				this.nickNameInputType = 'text'
				this.hasSelectedNicknameSource = true
				this.$nextTick(() => {
					this.nicknameFocus = true
				})
			},
			onNicknameInput(e) {
				this.formData.nickName = e.detail.value
			},
			onNicknameBlur() {
				this.nicknameFocus = false
			},
			onNicknameClick() {
				if (!this.hasSelectedNicknameSource) {
					this.openSourcePicker('nickname')
				}
			},
			async onGetPhoneNumber(e) {
				if (e.detail.errMsg !== 'getPhoneNumber:ok') {
					uni.showToast({ title: '取消获取', icon: 'none' })
					return
				}
				try {
					uni.showLoading({ title: '获取中...' })
				/* 使用 API 服务层解密手机号 */
				const res = await userApi.decodePhoneNumber(e.detail.code)
				uni.hideLoading()
				if (res && res.code === 0) {
					this.formData.phone = res.data.phoneNumber
					this.phoneMasked = true
					uni.showToast({ title: '已获取手机号', icon: 'success' })
				} else {
					uni.showToast({ title: res?.message || '获取失败，请手动输入', icon: 'none' })
				}
				} catch (err) {
					uni.hideLoading()
					console.error('获取手机号失败:', err)
					uni.showToast({ title: '获取失败，请手动输入', icon: 'none' })
				}
			},
			onPhoneInput(e) {
				this.formData.phone = e.detail.value
				this.phoneMasked = false
			},
			onBirthdayChange(value) {
				this.formData.birthday = value
			},
			selectGender(gender) {
				if (this.genderLocked) {
					uni.showToast({ title: '性别已锁定，仅可修改一次', icon: 'none' })
					return
				}
				this.formData.gender = gender
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
		padding: 32rpx 32rpx 60rpx;
		display: flex;
		flex-direction: column;
		gap: 40rpx;
	}

	.avatar-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16rpx;
	}

	.avatar-tip {
		font-size: 24rpx;
		color: #887364;
	}

	.avatar-container {
		position: relative;
		width: 200rpx;
		height: 200rpx;
		border-radius: 50%;
		border: 8rpx solid #ffffff;
		box-shadow: 0 8rpx 32rpx rgba(141, 75, 0, 0.12);
		z-index: 1;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.avatar-edit-btn {
		position: absolute;
		bottom: -8rpx;
		right: -8rpx;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: #8d4b00;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 4rpx solid #ffffff;
		box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.12), 0 1rpx 4rpx rgba(146, 64, 14, 0.06);
		z-index: 10;
	}

	.edit-icon {
		font-size: 28rpx;
	}

	.form-card {
		background: rgba(255, 249, 240, 0.95);
		border-radius: 48rpx;
		padding: 40rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
	}

	.form-item {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
		margin-bottom: 32rpx;
		&:last-child {
			margin-bottom: 0;
		}
	}

	.form-label {
		font-size: 24rpx;
		font-weight: 600;
		color: #887364;
		text-transform: uppercase;
		letter-spacing: 4rpx;
		padding-left: 8rpx;
	}

	.label-row {
		display: flex;
		align-items: center;
		gap: 8rpx;
	}

	.required-mark {
		font-size: 28rpx;
		color: #d32f2f;
		font-weight: 700;
	}

	.input-with-action {
		display: flex;
		gap: 16rpx;
		align-items: center;
	}

	.input-with-action .form-input {
		flex: 1;
	}

	.get-phone-btn {
		flex-shrink: 0;
		height: 88rpx;
		width: 120rpx;
		line-height: 88rpx;
		text-align: center;
		background: rgba(141, 75, 0, 0.1);
		border-radius: 32rpx;
		border: 2rpx solid rgba(141, 75, 0, 0.08);
		padding: 0;
		margin: 0;
		font-size: 26rpx;
		font-weight: 600;
		color: #8d4b00;

		&::after {
			border: none;
		}

		&:active {
			background: rgba(141, 75, 0, 0.15);
		}
	}

	.get-phone-text {
		font-size: 26rpx;
		font-weight: 600;
		color: #8d4b00;
	}

	/* ========== 修复：输入框点击不偏移、高度固定 ========== */
	.form-input {
		box-sizing: border-box;
		width: 100%;
		height: 88rpx;
		line-height: 88rpx; /* 关键修复：垂直居中 */
		background: rgba(255, 248, 235, 0.55);
		backdrop-filter: blur(14px) saturate(1.05);
		-webkit-backdrop-filter: blur(14px) saturate(1.05);
		border-radius: 32rpx;
		padding: 0 32rpx; /* 关键修复：只用左右内边距 */
		border: 2rpx solid rgba(141, 75, 0, 0.08);
		font-size: 30rpx;
		font-weight: 600;
		color: #2a1f15;

		&::placeholder {
			color: rgba(136, 115, 100, 0.4);
			line-height: 88rpx;
		}

		&.disabled {
			background: rgba(254, 244, 233, 0.6);
			color: #887364;
		}
	}

	.gender-options {
		display: flex;
		gap: 24rpx;
	}

	.gender-option {
		flex: 1;
		height: 88rpx;
		border-radius: 48rpx;
		background: rgba(255, 248, 235, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2rpx solid rgba(141, 75, 0, 0.08);
		transition: all 0.3s;

		&.active {
			background: #8d4b00;
			border-color: #8d4b00;
			.gender-text {
				color: #ffffff;
			}
		}

		&.disabled {
			opacity: 0.6;
		}
	}

	.gender-text {
		font-size: 30rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.save-btn {
		margin-top: 16rpx;
		height: 100rpx;
		border-radius: 48rpx;
		background: #8d4b00;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		margin-left: 32rpx;
		margin-right: 32rpx;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&.disabled {
			background: rgba(136, 115, 100, 0.3);
			box-shadow: none;
			pointer-events: none;
		}

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
		}
	}

	.locked-tip {
		font-size: 20rpx;
		color: #887364;
		font-weight: 400;
	}

	.save-text {
		font-size: 32rpx;
		font-weight: 600;
		color: #ffffff;
	}

	/* ========== 来源选择弹窗 ========== */
	.source-picker-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(42, 31, 21, 0.45);
		z-index: 999;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.source-picker {
		width: 100%;
		background: rgba(255, 250, 243, 0.98);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: 48rpx 48rpx 0 0;
		padding: 32rpx 32rpx 60rpx;
		box-shadow: 0 -8rpx 40rpx rgba(141, 75, 0, 0.12);
	}

	.picker-header {
		text-align: center;
		padding: 16rpx 0 32rpx;
		border-bottom: 1rpx solid rgba(255, 220, 195, 0.45);
	}

	.picker-title {
		font-size: 30rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.picker-options {
		padding: 16rpx 0;
	}

	.picker-option {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100rpx;
		border-radius: 32rpx;
		margin-bottom: 16rpx;
		background: rgba(255, 248, 235, 0.55);
		border: 2rpx solid rgba(141, 75, 0, 0.08);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
			background: rgba(141, 75, 0, 0.06);
		}
	}

	.picker-btn {
		padding: 0;
		margin: 0;
		line-height: 100rpx;
		font-size: inherit;
		font-weight: inherit;
		color: inherit;
		text-align: center;

		&::after {
			border: none;
		}
	}

	.option-text {
		font-size: 30rpx;
		font-weight: 600;
		color: #2a1f15;
	}

	.picker-cancel {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100rpx;
		border-radius: 48rpx;
		background: rgba(141, 75, 0, 0.08);
		margin-top: 16rpx;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&:active {
			transform: scale(0.97);
		}
	}

	.cancel-text {
		font-size: 30rpx;
		font-weight: 600;
		color: #887364;
	}
</style>
