<template>
	<view class="page-container">
		<custom-nav title="我的" align="left" :bold="true" />
		<view v-if="!isLoggedIn" class="login-content">
			<view class="login-illustration">
			<view class="ripple-ring ripple-1"></view>
			<view class="ripple-ring ripple-2"></view>
			<view class="ripple-ring ripple-3"></view>
			<view class="ripple-ring ripple-4"></view>
			<view class="ripple-ring ripple-5"></view>
			<image src="/static/images/logo.png" class="login-logo-img" mode="aspectFit" />
		</view>
			<text class="login-title">欢迎来到肠健康</text>
			<text class="login-desc">登录后即可同步数据，享受个性化健康服务</text>
			<view class="login-buttons">
				<view class="login-btn primary" @click="wechatLogin">
					<text class="btn-text">微信一键登录</text>
				</view>
				<text class="login-phone-hint">使用手机号登录（开发中）</text>
			</view>
		</view>

		<view v-else class="profile-content">
			<view class="profile-header">
				<view class="avatar" @click="goToEditProfile">
					<image :src="userInfo.avatarUrl || 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg'" class="avatar-img" mode="aspectFill" />
					<view class="avatar-edit-indicator">
						<view class="edit-indicator-icon"><AppIcon name="settings" :size="24" /></view>
					</view>
				</view>
				<view class="user-info">
					<text class="user-name">Hi, {{ userInfo.nickName || '用户' }}</text>
					<view class="user-badge">
						<view class="badge-icon"><AppIcon name="star-filled" :size="24" /></view>
					<text class="badge-text">本月已记录{{ thisMonthRecordCount }}次</text>
					</view>
				</view>
			</view>

			<view class="section">
				<view class="section-header">
					<text class="section-title">排便频率日历</text>
					<view class="view-detail" @click="goToStatistics">
						<text class="detail-text">详情</text>
						<image :src="pageIcons.right" class="detail-arrow" mode="aspectFit" />
					</view>
				</view>
				<CustomCalendar 
					:trackedDays="trackedDays"
					:initialYear="currentYear"
					:initialMonth="currentMonth"
					:pageIcons="pageIcons"
					@dayClick="onDayClick"
					@monthChange="onMonthChange"
				/>
				<view class="calendar-legend">
					<view class="legend-item">
						<view class="legend-dot"></view>
						<text class="legend-text">已记录</text>
					</view>
				</view>
			</view>

			<view class="section">
				<text class="section-title">每日提醒</text>
				<view class="reminder-list">
					<view
						v-for="reminder in reminders"
						:key="reminder.id"
						class="swipe-container"
						@touchstart="(e) => onTouchStart(e, reminder.id)"
						@touchmove="(e) => onTouchMove(e, reminder.id)"
						@touchend="(e) => onTouchEnd(e, reminder.id)"
					>
						<view class="delete-btn" @click="deleteReminder(reminder.id)">
							<text class="delete-text">删除</text>
						</view>
						<view
							class="reminder-card"
							:style="{ transform: `translateX(${getSwipeOffset(reminder.id)})` }"
						>
							<view class="reminder-info" @click="() => showEditReminderModal(reminder)">
								<view :class="['reminder-icon', { active: reminder.enabled }]">
									<AppIcon class="icon-text" name="bell" :size="28" />
								</view>
								<view class="reminder-detail">
									<view class="reminder-time-row">
										<text class="reminder-time">{{ reminder.time }}</text>
										<view class="edit-btn" @click="(e) => { e.stopPropagation(); showEditReminderModal(reminder); }">
											<text class="edit-text">修改</text>
										</view>
									</view>
									<text class="reminder-status">通知提醒已{{ reminder.enabled ? '开启' : '关闭' }}</text>
								</view>
							</view>
							<view
								:class="['reminder-switch', { active: reminder.enabled }]"
								@click="toggleReminder(reminder.id)"
							>
								<view class="switch-thumb"></view>
							</view>
						</view>
					</view>
				</view>
				<view class="add-reminder" @click="showAddReminderModal">
					<text class="add-text">+ 添加记录提醒</text>
				</view>
			</view>

		<view class="settings-entry" @click="goToSettings">
				<view class="settings-icon">
					<image :src="pageIcons.set" class="settings-img" mode="aspectFit" />
				</view>
				<text class="settings-text">设置与安全</text>
				<image :src="pageIcons.right" class="settings-arrow" mode="aspectFit" />
			</view>
		</view>

		<TimePicker 
			v-model:visible="showReminderModal" 
			:title="isEditingReminder ? '修改提醒' : '添加提醒'"
			:value="reminderTimeSeconds"
			:maxHours="23"
			:showSeconds="false"
			@confirm="handleReminderConfirm"
		/>

		<ConfirmModal
			:visible="showConfirmModal"
			:title="confirmModalTitle"
			:content="confirmModalContent"
			:confirmText="confirmModalConfirmText"
			:cancelText="confirmModalCancelText"
			@confirm="confirmConfirmModal"
			@cancel="closeConfirmModal"
		/>

		<!-- 新用户强制完善资料引导弹窗 -->
		<ConfirmModal
			:visible="showProfileSetupModal"
			title="完善个人信息"
			content="为了提供更好的服务，请先完善您的基本信息"
			:showCancel="false"
			:closeOnMask="false"
			confirmText="去完善"
			@confirm="goToEditProfileFromSetup"
		/>

		<!-- 右下角浮窗记录按钮 -->
		<FloatingRecordButton />
		<CustomToast ref="customToast" />
	</view>
</template>

<script>
import CustomCalendar from '@/components/CustomCalendar.vue'
import TimePicker from '@/components/TimePicker/TimePicker.vue'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
import CustomNav from '@/components/custom-nav/custom-nav.vue'
import FloatingRecordButton from '@/components/FloatingRecordButton/FloatingRecordButton.vue'
import AppIcon from '@/components/AppIcon/AppIcon.vue'
import { authApi, recordApi, reminderApi } from '@/js_sdk/sg-client/api.js'

export default {
    name: 'Profile',
    components: {
        CustomCalendar,
        TimePicker,
        ConfirmModal,
        CustomNav,
        FloatingRecordButton,
        AppIcon
    },
    data() {
        const now = new Date()
        return {
            isLoggedIn: false,
            userInfo: {
                nickName: '',
                avatarUrl: ''
            },
            currentYear: now.getFullYear(),
            currentMonth: now.getMonth() + 1,
            trackedDays: [],
            records: {},
            thisMonthRecordCount: 0,
            selectedDate: null,
            selectedDateRecords: [],
            reminders: uni.getStorageSync('userReminders') || [
                { id: '1', time: '08:30', enabled: false },
                { id: '2', time: '20:30', enabled: false }
            ],
            showReminderModal: false,
            isEditingReminder: false,
            editingReminderId: null,
            swipeData: {},
            showConfirmModal: false,
            confirmModalTitle: '',
            confirmModalContent: '',
            confirmModalConfirmText: '确定',
            confirmModalCancelText: '取消',
            confirmModalCallback: null,
            showPhoneModal: false,
            pageIcons: {},
            /* 新用户强制完善资料引导弹窗 */
            showProfileSetupModal: false
        }
    },
    computed: {
        endDate() {
            return new Date().toISOString().split('T')[0]
        },
        years() {
            const currentYear = new Date().getFullYear()
            const years = []
            for (let i = currentYear - 10; i <= currentYear + 10; i++) {
                years.push(i)
            }
            return years
        },
        months() {
            return Array.from({ length: 12 }, (_, i) => i + 1)
        },
        reminderTimeSeconds() {
            if (!this.editingReminderId) {
                return 8 * 3600 + 30 * 60
            }
            const reminder = this.reminders.find(r => r.id === this.editingReminderId)
            if (reminder) {
                const [hour, minute] = reminder.time.split(':').map(Number)
                return hour * 3600 + minute * 60
            }
            return 8 * 3600 + 30 * 60
        }
    },
    onShow() {
        uni.$emit('tabChange', 2)
        this.checkLoginStatus()

        // 检查是否需要完善资料（仅登录用户）
        if (this.isLoggedIn && uni.getStorageSync('needProfileSetup')) {
            if (!this.checkProfileComplete()) {
                this.showProfileSetupModal = true
            } else {
                uni.removeStorageSync('needProfileSetup')
            }
        }

        /* 登录后同步提醒订阅状态 */
        if (this.isLoggedIn) {
            const storedReminders = uni.getStorageSync('userReminders')
            if (storedReminders && storedReminders.length) {
                this.reminders = storedReminders
            } else {
                uni.setStorageSync('userReminders', this.reminders)
            }
            this.loadReminderStatus()
        }

        uni.$on('recordSaved', () => {
            if (this.isLoggedIn) {
                const userId = uni.getStorageSync('userId')
                if (userId) {
                    this.loadRecords(userId)
                }
            }
        })
    },
    onLoad() {
        this.loadPageIcons()
        this.checkLoginStatus()
    },
    methods: {
        /* 本地持久化提醒列表（与 AI 助手添加的提醒共用） */
        saveReminders() {
            uni.setStorageSync('userReminders', this.reminders)
        },
        /* 云存储 fileID 转成可用于 image 的临时地址 */
        async resolveAvatarUrl() {
            const url = this.userInfo.avatarUrl
            if (!url || !url.startsWith('cloud://')) return
            try {
                const res = await uniCloud.getTempFileURL({ fileList: [url] })
                const file = res.fileList && res.fileList[0]
                if (file && file.tempFileURL) {
                    this.userInfo.avatarUrl = file.tempFileURL
                }
            } catch (err) {
                console.error('获取头像地址失败:', err)
            }
        },
        checkLoginStatus() {
            const isLoggedIn = uni.getStorageSync('isLoggedIn')
            const userId = uni.getStorageSync('userId')
            const userInfo = uni.getStorageSync('userInfo')
            
            this.isLoggedIn = (isLoggedIn === true || isLoggedIn === 'true') && !!userId
            this.userInfo = userInfo ? (typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo) : { nickName: '', avatarUrl: '' }
            this.resolveAvatarUrl()
            
            if (this.isLoggedIn) {
                this.loadRecords(userId)
            }
        },
        checkLogin(callback) {
            if (!this.isLoggedIn) {
                this.confirmModalTitle = '提示'
                this.confirmModalContent = '登录后才能使用此功能，是否前往登录?'
                this.confirmModalConfirmText = '去登录'
                this.confirmModalCancelText = '取消'
                this.confirmModalCallback = () => {
                    this.wechatLogin()
                }
                this.showConfirmModal = true
                return false
            }
            if (callback) callback()
            return true
        },
		wechatLogin() {
			uni.showLoading({
				title: '登录中...'
			})

			uni.login({
				provider: 'weixin',
				success: async (loginRes) => {
					console.log('微信登录code:', loginRes.code)

					/* 使用 API 服务层调用微信登录 */
					try {
						const result = await authApi.wechatLogin(loginRes.code)
						uni.hideLoading()
						if (result && result.code === 0) {
							this.handleWechatLoginSuccess(result.data)
						} else if (result && result.code === -2) {
							// 被封禁：存入 banInfo，跳转到首页展示封禁弹窗
							if (result.data && result.data.ban) {
								uni.setStorageSync('banInfo', result.data.ban)
							}
							// 不设置登录状态
							uni.showToast({ title: '账号已被封禁', icon: 'none' })
							setTimeout(() => {
								uni.switchTab({ url: '/pages/index/index' })
							}, 1500)
						} else {
							const msg = (result && result.message) || '登录失败'
							console.error('登录失败:', msg)
							uni.showToast({ title: msg, icon: 'none' })
						}
					} catch (err) {
						uni.hideLoading()
						console.error('云函数调用失败:', err)
						uni.showToast({ title: '网络错误，请检查云函数是否已部署', icon: 'none' })
					}
				},
				fail: (err) => {
					uni.hideLoading()
					console.error('uni.login失败:', err)
					uni.showToast({
						title: '微信登录失败',
						icon: 'none'
					})
				}
			})
		},
        async loadRecords(userId) {
            /* 使用 API 服务层获取排便记录 */
            try {
                const result = await recordApi.get({ userId, year: this.currentYear, month: this.currentMonth })
                if (result.code === 0) {
                    this.processRecords(result.data)
                }
            } catch (err) {
                console.error('获取记录失败:', err)
            }
        },
        processRecords(records) {
            const trackedDays = []
            const recordMap = {}
            
            records.forEach(record => {
                const date = new Date(record.created_at)
                const recordYear = date.getFullYear()
                const recordMonth = date.getMonth() + 1
                const day = date.getDate()
                const time = date.toTimeString().slice(0, 5)
                
                if (recordYear !== this.currentYear || recordMonth !== this.currentMonth) {
                    return
                }
                
                const feelingMap = {
                    'smooth': '顺畅无痛',
                    'effortful': '轻微费力',
                    'diarrhea': '腹泻状态'
                }
                
                const typeMap = {
                    1: 'Type 1 坚果状',
                    2: 'Type 2 香肠状',
                    3: 'Type 3 香肠状',
                    4: 'Type 4 香蕉状',
                    5: 'Type 5 蛇状',
                    6: 'Type 6 糊状',
                    7: 'Type 7 水样'
                }
                
                if (!recordMap[day]) {
                    recordMap[day] = []
                    trackedDays.push(day)
                }
                
                recordMap[day].push({
                    time: time,
                    type: typeMap[record.type] || '未知类型',
                    color: record.color || '棕色',
                    status: feelingMap[record.feeling] || '未知',
                    note: record.note || ''
                })
            })
            
            this.trackedDays = trackedDays.sort((a, b) => a - b)
            this.records = recordMap
            this.thisMonthRecordCount = trackedDays.length
        },
        phoneLogin() {
            // 手机号登录功能开发中
        },
        handleWechatLoginSuccess(data) {
            const { token, user } = data
            uni.setStorageSync('isLoggedIn', true)
            uni.setStorageSync('token', token)
            uni.setStorageSync('userId', user._id)
            this.isLoggedIn = true

            this.userInfo = {
                nickName: user.nickname || '微信用户',
                avatarUrl: user.avatar_url || '',
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                gender: user.gender || '',
                birthday: user.birthday || ''
            }
            uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))

            this.loadRecords(user._id)

            uni.showToast({
                title: '登录成功',
                icon: 'success'
            })

            // 检查资料完整性，不完整则标记需要完善
            if (!this.checkProfileComplete()) {
                uni.setStorageSync('needProfileSetup', true)
            }
        },
        async handleLoginSuccess(token) {
            uni.setStorageSync('isLoggedIn', true)
            uni.setStorageSync('token', token)
            this.isLoggedIn = true

            const mockUserId = 'mock_wechat_user'
            uni.setStorageSync('userId', mockUserId)

            let userInfo = null
            try {
                const userRes = await uni.getUserInfo({ provider: 'weixin' })
                console.log('静默获取用户信息:', userRes.userInfo)
                userInfo = userRes.userInfo
            } catch (err) {
                console.log('静默获取用户信息失败')
            }

            if (!userInfo) {
                userInfo = {
                    nickName: '微信用户',
                    avatarUrl: ''
                }
            }
            
            this.userInfo = userInfo
            uni.setStorageSync('userInfo', JSON.stringify(userInfo))

            this.loadRecords(mockUserId)

            uni.showToast({
                title: '登录成功',
                icon: 'success'
            })
        },
        goToStatistics() {
            this.checkLogin(() => {
                uni.navigateTo({
                    url: '/pages/health/statistics/statistics'
                })
            })
        },
        goToRecord() {
            uni.navigateTo({
                url: '/pages/health/record/record'
            })
        },
        onDayClick(event) {
            this.checkLogin(() => {
                const { day, year, month, isTracked } = event
                this.currentYear = year
                this.currentMonth = month
                this.selectedDate = day
                if (isTracked) {
                    this.selectedDateRecords = this.records[day] || []
                    uni.navigateTo({
                        url: '/pages/health/statistics/statistics'
                    })
                } else {
                    this.selectedDateRecords = []
                    this.confirmModalTitle = '提示'
                    this.confirmModalContent = `${month}月${day}日暂无记录，是否前往添加？`
                    this.confirmModalConfirmText = '去添加'
                    this.confirmModalCancelText = '取消'
                    this.confirmModalCallback = () => {
                        uni.navigateTo({
                            url: `/pages/health/record/record?year=${year}&month=${month}&day=${day}`
                        })
                    }
                    this.showConfirmModal = true
                }
            })
        },
        onMonthChange(event) {
            const { year, month } = event
            this.currentYear = year
            this.currentMonth = month
            if (this.isLoggedIn) {
                const userId = uni.getStorageSync('userId')
                if (userId) {
                    this.loadRecords(userId)
                }
            }
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
        showAddReminderModal() {
            this.checkLogin(() => {
                this.isEditingReminder = false
                this.editingReminderId = null
                this.showReminderModal = true
            })
        },
        showEditReminderModal(reminder) {
            this.checkLogin(() => {
                this.isEditingReminder = true
                this.editingReminderId = reminder.id
                this.showReminderModal = true
            })
        },
        async handleReminderConfirm(totalSeconds) {
            const hours = Math.floor(totalSeconds / 3600)
            const minutes = Math.floor((totalSeconds % 3600) / 60)
            const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

            if (this.isEditingReminder && this.editingReminderId) {
                const reminder = this.reminders.find(r => r.id === this.editingReminderId)
                if (reminder) {
                    /* 如果提醒正在启用状态且时间有变，先取消旧时间的订阅 */
                    if (reminder.enabled && reminder.time !== timeStr) {
                        const userId = uni.getStorageSync('userId')
                        if (userId) {
                            try {
                                await reminderApi.unsubscribe(userId, reminder.time)
                            } catch (err) {
                                console.error('取消旧订阅失败:', err)
                            }
                        }
                        /* 修改时间后需要重新开启提醒 */
                        reminder.enabled = false
                    }
                    reminder.time = timeStr
                }
                uni.showToast({ title: '提醒已修改', icon: 'success' })
            } else {
                const newId = Date.now().toString()
                this.reminders.push({
                    id: newId,
                    time: timeStr,
                    enabled: false
                })
                uni.showToast({ title: '提醒已添加', icon: 'success' })
            }
            this.saveReminders()
        },
        toggleReminder(id) {
            this.checkLogin(() => {
                const reminder = this.reminders.find(r => r.id === id)
                if (!reminder) return

                if (reminder.enabled) {
                    /* 关闭提醒：调用后端取消订阅 */
                    this.doUnsubscribe(reminder)
                } else {
                    /* 开启提醒：调起微信订阅消息授权弹窗 */
                    this.doSubscribe(reminder)
                }
            })
        },
        /* 调起微信订阅消息授权弹窗，授权成功后同步到后端 */
        doSubscribe(reminder) {
            const userId = uni.getStorageSync('userId')
            if (!userId) {
                uni.showToast({ title: '请先登录', icon: 'none' })
                return
            }

            /* wx.requestSubscribeMessage 必须在用户点击事件中直接调用 */
            uni.requestSubscribeMessage({
                tmplIds: ['REPLACE_WITH_YOUR_TEMPLATE_ID'],
                success: async (res) => {
                    /* res[模板ID] 的值: 'accept' | 'reject' | 'ban' */
                    const templateId = 'REPLACE_WITH_YOUR_TEMPLATE_ID'
                    if (res[templateId] === 'accept') {
                        /* 用户同意订阅，同步到后端 */
                        try {
                            const result = await reminderApi.subscribe(userId, reminder.time, templateId)
                            if (result.code === 0) {
                                reminder.enabled = true
                                this.saveReminders()
                                uni.showToast({ title: '提醒已开启', icon: 'success' })
                            } else {
                                uni.showToast({ title: result.message || '订阅失败', icon: 'none' })
                            }
                        } catch (err) {
                            console.error('订阅提醒失败:', err)
                            uni.showToast({ title: '网络错误，订阅失败', icon: 'none' })
                        }
                    } else if (res[templateId] === 'reject') {
                        uni.showToast({ title: '已拒绝订阅', icon: 'none' })
                    } else if (res[templateId] === 'ban') {
                        uni.showToast({ title: '订阅已被禁止，请到设置开启', icon: 'none' })
                    }
                },
                fail: (err) => {
                    console.error('requestSubscribeMessage失败:', err)
                    /* 常见原因：不在点击事件中调用、模板ID无效 */
                    if (err.errCode === 20004) {
                        uni.showToast({ title: '模板ID无效，请联系管理员', icon: 'none' })
                    } else {
                        uni.showToast({ title: '订阅失败，请重试', icon: 'none' })
                    }
                }
            })
        },
        /* 取消订阅：调用后端将指定时间的提醒设为关闭 */
        async doUnsubscribe(reminder) {
            const userId = uni.getStorageSync('userId')
            if (!userId) return

            try {
                const result = await reminderApi.unsubscribe(userId, reminder.time)
                if (result.code === 0) {
                    reminder.enabled = false
                    this.saveReminders()
                    uni.showToast({ title: '提醒已关闭', icon: 'none' })
                } else {
                    uni.showToast({ title: result.message || '取消失败', icon: 'none' })
                }
            } catch (err) {
                console.error('取消订阅失败:', err)
                uni.showToast({ title: '网络错误，取消失败', icon: 'none' })
            }
        },
        /* 从后端同步提醒订阅状态 */
        async loadReminderStatus() {
            const userId = uni.getStorageSync('userId')
            if (!userId) return

            try {
                const result = await reminderApi.getStatus(userId)
                if (result.code === 0 && result.data && result.data.subscriptions) {
                    /* 遍历后端返回的订阅列表，更新本地提醒状态 */
                    result.data.subscriptions.forEach(sub => {
                        /* 匹配本地提醒列表中相同时间的项 */
                        const reminder = this.reminders.find(r => r.time === sub.reminderTime)
                        if (reminder) {
                            /* 同时检查激活状态和剩余次数，配额用完视为关闭 */
                            reminder.enabled = sub.isActive && sub.remainingCount > 0
                        }
                    })
                }
            } catch (err) {
                console.error('获取提醒状态失败:', err)
            }
        },
        deleteReminder(id) {
            this.checkLogin(() => {
                this.confirmModalTitle = '提示'
                this.confirmModalContent = '确定要删除这个提醒吗？'
                this.confirmModalConfirmText = '确定'
                this.confirmModalCancelText = '取消'
                this.confirmModalCallback = async () => {
                    const index = this.reminders.findIndex(r => r.id === id)
                    if (index > -1) {
                        const reminder = this.reminders[index]
                        /* 如果提醒正在启用状态，先取消后端订阅 */
                        if (reminder.enabled) {
                            const userId = uni.getStorageSync('userId')
                            if (userId) {
                                try {
                                    await reminderApi.unsubscribe(userId, reminder.time)
                                } catch (err) {
                                    console.error('删除时取消订阅失败:', err)
                                }
                            }
                        }
                        this.reminders.splice(index, 1)
                        this.saveReminders()
                        uni.showToast({ title: '已删除', icon: 'success' })
                    }
                }
                this.showConfirmModal = true
            })
        },
        onTouchStart(e, id) {
            if (!this.swipeData[id]) {
                this.$set(this.swipeData, id, {
                    startX: e.touches[0].clientX,
                    startY: e.touches[0].clientY,
                    offsetX: 0,
                    isSwiping: false
                })
            } else {
                this.swipeData[id].startX = e.touches[0].clientX
                this.swipeData[id].startY = e.touches[0].clientY
                this.swipeData[id].offsetX = 0
            }
        },
        onTouchMove(e, id) {
            if (!this.swipeData[id]) return
            const currentX = e.touches[0].clientX
            const currentY = e.touches[0].clientY
            const deltaX = currentX - this.swipeData[id].startX
            const deltaY = currentY - this.swipeData[id].startY

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                this.swipeData[id].isSwiping = true
                let offset = deltaX
                if (offset > 0) offset = 0
                if (offset < -140) offset = -140
                this.swipeData[id].offsetX = offset
            }
        },
        onTouchEnd(e, id) {
            if (!this.swipeData[id]) return
            const offset = this.swipeData[id].offsetX
            if (offset < -70) {
                this.swipeData[id].offsetX = -75
            } else {
                this.swipeData[id].offsetX = 0
            }
        },
        getSwipeOffset(id) {
            if (this.swipeData[id]) {
                return `${this.swipeData[id].offsetX}px`
            }
            return '0px'
        },
        goToEditProfile() {
            this.checkLogin(() => {
                uni.navigateTo({
                    url: '/pages/user-settings/edit-profile/edit-profile'
                })
            })
        },
        goToSettings() {
            this.checkLogin(() => {
                uni.navigateTo({
                    url: '/pages/user-settings/settings/settings'
                })
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
        /* 检查用户资料是否完整：缺少昵称/性别/生日任一则视为未完善 */
        checkProfileComplete() {
            const userInfo = uni.getStorageSync('userInfo')
            if (!userInfo) return true
            const parsed = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
            if (!parsed.nickName || parsed.nickName === '微信用户') return false
            if (!parsed.gender) return false
            if (!parsed.birthday) return false
            return true
        },
        /* 引导弹窗确认后跳转到编辑资料页 */
        goToEditProfileFromSetup() {
            this.showProfileSetupModal = false
            uni.navigateTo({
                url: '/pages/user-settings/edit-profile/edit-profile'
            })
        }
    }
}
</script>

<style lang="scss" scoped>
	.page-container {
		padding: 0 32rpx;
	}

	.login-content {
		padding-top: 60rpx;
		@include flex-center;
		flex-direction: column;
	}

	.login-illustration {
		@include flex-center;
		position: relative;
		width: 200rpx;
		height: 200rpx;
		margin-bottom: 40rpx;
	}

	.login-logo-img {
		position: relative;
		z-index: 10;
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		animation: breathing-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	/* 多层涟漪效果 - 像石头落入水面 */
	.ripple-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		border-radius: 50%;
		border: 2rpx solid rgba(141, 75, 0, 0.15);
		transform: translate(-50%, -50%);
		pointer-events: none;
		animation: ripple-expand 4s ease-out infinite;
	}

	.ripple-1 {
		width: 120rpx;
		height: 120rpx;
		animation-delay: 0s;
	}
	.ripple-2 {
		width: 120rpx;
		height: 120rpx;
		animation-delay: 0.8s;
	}
	.ripple-3 {
		width: 120rpx;
		height: 120rpx;
		animation-delay: 1.6s;
	}
	.ripple-4 {
		width: 120rpx;
		height: 120rpx;
		animation-delay: 2.4s;
	}
	.ripple-5 {
		width: 120rpx;
		height: 120rpx;
		animation-delay: 3.2s;
	}

	@keyframes ripple-expand {
		0% {
			width: 120rpx;
			height: 120rpx;
			opacity: 0;
			border-width: 4rpx;
		}
		10% {
			opacity: 0.4;
		}
		100% {
			width: 320rpx;
			height: 320rpx;
			opacity: 0;
			border-width: 1rpx;
		}
	}

	@keyframes breathing-pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}
	.login-title { font-size: 40rpx; font-weight: 700; color: $text-primary; margin-bottom: 16rpx; }
	.login-desc { font-size: $font-size-base; color: $text-muted; margin-bottom: 48rpx; }

	.login-buttons {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		width: 100%;
	}

	.login-phone-hint {
		font-size: 26rpx;
		color: #999;
		margin-top: 24rpx;
		text-align: center;
	}

	.login-btn {
		@include flex-center;
		border-radius: $radius-xl;
		padding: 32rpx;
		&.primary { background: linear-gradient(135deg, $primary-color 0%, #b15f00 100%); }
		&.secondary { background: rgba($primary-color, 0.1); border: 2px solid rgba($primary-color, 0.2); }
	}

	.btn-text {
		font-size: $font-size-lg;
		font-weight: 600;
		color: $primary-color;
		.primary & { color: #fff; }
	}

	.profile-content {
		padding-top: 32rpx;
		display: flex;
		flex-direction: column;
		gap: 32rpx;
	}

	.profile-header { display: flex; align-items: center; gap: 24rpx; }

	.avatar {
		position: relative;
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		border: 4px solid #fff;
		box-shadow: 0 4px 12px rgba($primary-color, 0.1);
		z-index: 1;
	}

	.avatar-img { 
		width: 100%; 
		height: 100%; 
		border-radius: 50%;
	}

	.avatar-edit-indicator {
		position: absolute;
		bottom: -8rpx;
		right: -8rpx;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid #fff;
		box-shadow: 0 2px 8px rgba(52, 52, 52, 0.3);
		z-index: 10;
	}

	.edit-indicator-icon { font-size: 30rpx; }

	.user-info { flex: 1; }

	.user-name { font-size: 40rpx; font-weight: 700; color: $text-primary; display: block; }

	.user-badge { display: flex; align-items: center; gap: 8rpx; margin-top: 8rpx; }

	.badge-icon { font-size: 20rpx; color: $primary-color; }
	.badge-text { font-size: $font-size-sm; font-weight: 600; color: $primary-color; }

	.section { display: flex; flex-direction: column; gap: 20rpx; }
	.section-header { @include flex-between; }
	.section-title { font-size: $font-size-lg; font-weight: 600; color: $text-primary; }

	.view-detail { display: flex; align-items: center; gap: 8rpx; }
	.detail-text { font-size: $font-size-sm; color: $text-muted; }
	.detail-arrow { width: 28rpx; height: 28rpx; opacity: 0.5; }

	.calendar-card {
		@include card-base;
		padding: 28rpx;
	}

	.calendar-header {
		@include flex-between;
		margin-bottom: 24rpx;
	}

	.calendar-title-wrap { display: flex; align-items: center; gap: 8rpx; }
	.calendar-title { font-size: $font-size-lg; font-weight: 600; color: $text-primary; }
	.calendar-arrow { font-size: 20rpx; color: $text-muted; }

	.calendar-nav { display: flex; gap: 16rpx; }

	.nav-btn {
		@include flex-center;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		background: rgba($primary-color, 0.1);
	}

	.nav-icon { width: 32rpx; height: 32rpx; }

	.calendar-weekdays {
		display: flex;
		margin-bottom: 16rpx;
	}

	.weekday {
		flex: 1;
		text-align: center;
		font-size: $font-size-sm;
		color: $text-muted;
	}

	.calendar-days {
		display: flex;
		flex-wrap: wrap;
	}

	.calendar-day {
		width: calc(100% / 7);
		aspect-ratio: 1;
		@include flex-center;
		&.tracked .day-number { background: $primary-color; color: #fff; }
		&.empty, &.other { opacity: 0.3; }
	}

	.day-number {
		@include flex-center;
		width: 64rpx;
		height: 64rpx;
		border-radius: 50%;
		font-size: $font-size-base;
		color: $text-primary;
	}

	.calendar-legend {
		@include flex-center;
		gap: 24rpx;
		margin-top: 16rpx;
		padding-top: 16rpx;
		border-top: 1px solid rgba($text-muted, 0.1);
	}

	.legend-item { display: flex; align-items: center; gap: 8rpx; }

	.legend-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: $primary-color;
	}

	.legend-text { font-size: $font-size-sm; color: $text-muted; }

	.reminder-list { display: flex; flex-direction: column; gap: 16rpx; }

	.swipe-container {
		position: relative;
		overflow: hidden;
		border-radius: $radius-xl;
	}

	.delete-btn {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 140rpx;
		@include flex-center;
		background: #d32f2f;
		border-radius: $radius-xl;
	}

	.delete-text { font-size: $font-size-base; font-weight: 600; color: #fff; }

	.reminder-card {
		position: relative;
		z-index: 2;
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(255, 249, 240, 0.95);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: $radius-xl;
		padding: 28rpx;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 8rpx 40rpx rgba(141, 75, 0, 0.10), 0 2rpx 8rpx rgba(146, 64, 14, 0.05);
		transition: transform 0.3s ease;
	}

	.reminder-info { display: flex; align-items: center; gap: 20rpx; flex: 1; }

	.reminder-icon {
		@include flex-center;
		width: 72rpx;
		height: 72rpx;
		border-radius: $radius-lg;
		background: #fbf2ea;
		&.active { background: rgba($primary-color, 0.1); }
	}

	.icon-text { font-size: 32rpx; }

	.reminder-detail { flex: 1; }

	.reminder-time-row { display: flex; align-items: center; gap: 16rpx; }
	.reminder-time { font-size: 40rpx; font-weight: 700; color: $text-primary; }

	.edit-btn {
		padding: 8rpx 16rpx;
		border-radius: $radius-md;
		background: #fbf2ea;
	}

	.edit-text { font-size: $font-size-xs; font-weight: 600; color: $text-muted; }
	.reminder-status { font-size: $font-size-xs; font-weight: 600; color: $text-muted; }

	.add-reminder {
		@include flex-center;
		@include card-base;
		padding: 32rpx;
		border: 2px dashed rgba($text-muted, 0.2);
		margin-top: 8rpx;
	}

	.add-text { font-size: $font-size-base; font-weight: 600; color: $text-muted; }

	.reminder-switch {
		position: relative;
		width: 88rpx;
		height: 48rpx;
		border-radius: 24rpx;
		background: rgba(141, 75, 0, 0.12);
		transition: background 0.3s;
		&.active { background: $primary-color; }
	}

	.switch-thumb {
		position: absolute;
		top: 4rpx;
		left: 4rpx;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: #fff;
		transition: transform 0.3s;
		.reminder-switch.active & { transform: translateX(40rpx); }
	}

	.settings-entry {
		display: flex;
		align-items: center;
		@include card-base;
		padding: 28rpx;
		margin-top: 16rpx;
	}

	.settings-icon {
		@include flex-center;
		width: 72rpx;
		height: 72rpx;
		border-radius: $radius-lg;
		background: rgba($primary-color, 0.1);
		margin-right: 20rpx;
	}

	.settings-img { width: 36rpx; height: 36rpx; }
	.settings-text { flex: 1; font-size: $font-size-lg; font-weight: 600; color: $text-primary; }
	.settings-arrow { width: 28rpx; height: 28rpx; opacity: 0.5; }

	.picker-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(45, 30, 20, 0.45);
		display: flex;
		align-items: flex-end;
		z-index: 1000;
	}

	.picker-container {
		width: 100%;
		background: #fff;
		border-radius: $radius-lg $radius-lg 0 0;
		overflow: hidden;
	}

	.login-btn.tertiary {
		background: transparent;
		border: 2px solid rgba($text-muted, 0.2);
		.btn-text { color: $text-muted; }
	}

	.confirm-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(45, 30, 20, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.email-modal-container {
		width: 560rpx;
		max-height: 1250rpx;
		background: rgba(255, 249, 240, 0.92);
		backdrop-filter: blur(20px) saturate(1.08);
		-webkit-backdrop-filter: blur(20px) saturate(1.08);
		border-radius: $radius-xl;
		border: 1rpx solid rgba(255, 220, 195, 0.45);
		box-shadow: 0 16rpx 64rpx rgba(45, 30, 20, 0.15);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.email-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 32rpx;
		border-bottom: 1px solid rgba($text-muted, 0.1);
		flex-shrink: 0;
	}

	.email-modal-scroll {
		flex: 1;
		max-height: 800rpx;
	}

	.email-modal-title {
		font-size: 32rpx;
		font-weight: 700;
		color: $text-primary;
	}

	.email-modal-close {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: rgba($text-muted, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-icon {
		font-size: 28rpx;
		color: $text-muted;
	}

	.email-modal-body {
		padding: 32rpx;
	}

	.email-form-item {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
		margin-bottom: 24rpx;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.email-form-label {
		font-size: $font-size-xs;
		font-weight: 600;
		color: $text-muted;
		text-transform: uppercase;
		letter-spacing: 2rpx;
	}

	.email-form-input {
		width: 100%;
		height: 88rpx;
		background: rgba($text-muted, 0.05);
		border-radius: $radius-lg;
		padding: 0 24rpx;
		font-size: $font-size-base;
		color: $text-primary;
		border: 2px solid transparent;
		transition: border-color 0.3s;

		&:focus {
			border-color: rgba($primary-color, 0.3);
		}

		&::placeholder {
			color: rgba($text-muted, 0.4);
		}
	}

	.email-form-picker {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 88rpx;
		background: rgba($text-muted, 0.05);
		border-radius: $radius-lg;
		padding: 0 24rpx;
		border: 2px solid transparent;
	}

	.email-form-picker-text {
		font-size: $font-size-base;
		color: $text-primary;

		&.placeholder {
			color: rgba($text-muted, 0.4);
		}
	}

	.email-form-arrow {
		width: 24rpx;
		height: 24rpx;
		opacity: 0.4;
	}

	.email-form-gender {
		display: flex;
		gap: 20rpx;
	}

	.email-form-gender-option {
		flex: 1;
		height: 88rpx;
		border-radius: $radius-lg;
		background: rgba($text-muted, 0.05);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid transparent;
		transition: all 0.3s;

		&.active {
			background: rgba($primary-color, 0.1);
			border-color: $primary-color;

			.email-form-gender-text {
				color: $primary-color;
			}
		}
	}

	.email-form-gender-text {
		font-size: $font-size-base;
		font-weight: 600;
		color: $text-primary;
	}

	.email-modal-footer {
		padding: 0 32rpx 32rpx;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		flex-shrink: 0;
	}

	.email-modal-btn {
		height: 88rpx;
		border-radius: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

		&.primary {
			background: linear-gradient(135deg, $primary-color 0%, #b15f00 100%);
			box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.20), 0 2rpx 6rpx rgba(141, 75, 0, 0.12);
		}

		&:active {
			transform: scale(0.97);
			box-shadow: 0 4rpx 16rpx rgba(141, 75, 0, 0.16);
		}
	}

	.email-modal-btn-text {
		font-size: $font-size-lg;
		font-weight: 600;
		color: #fff;
	}

	.email-modal-link {
		text-align: center;
	}

	.link-text {
		font-size: $font-size-sm;
		color: $primary-color;
	}
</style>
