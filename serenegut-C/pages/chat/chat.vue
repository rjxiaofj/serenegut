<template>
	<view class="chat-page">
		<custom-nav title="AI 健康助手" />

		<view class="agent-bar">
			<text class="bar-title">{{ currentTitle }}</text>
			<view class="session-btn" @click="showSessions = true">
				<AppIcon name="message-circle" :size="24" />
				<text class="session-btn-text">会话</text>
			</view>
		</view>

		<scroll-view
			class="msg-scroll"
			scroll-y
			:scroll-into-view="scrollIntoId"
			:scroll-with-animation="true"
		>
			<view class="msg-list">
				<view v-for="msg in messages" :key="msg.id" :id="'msg-' + msg.id" class="msg-row" :class="msg.role">
					<view v-if="msg.role === 'assistant'" class="agent-avatar">
						<AppIcon name="sparkles" color="white" :size="32" />
					</view>
					<view class="msg-body">
						<view class="bubble" :class="msg.role">
							<text class="bubble-text">{{ msg.content }}</text>
						</view>

						<view v-if="msg.result" class="tool-card">
							<AppIcon :name="msg.resultIcon || 'circle-check-filled'" :size="32" />
							<view class="tool-info">
								<text class="tool-title">{{ msg.resultTitle || '操作已完成' }}</text>
								<text class="tool-desc">{{ msg.result }}</text>
							</view>
						</view>

						<view v-if="msg.role === 'assistant' && msg.showReport" class="bubble-actions">
							<view class="bubble-action" @click="openReport">
								<AppIcon name="chart-bar" :size="22" />
								<text class="action-text">查看报告</text>
							</view>
						</view>
					</view>
				</view>

				<view v-if="sending" class="msg-row assistant">
					<view class="agent-avatar">
						<AppIcon name="sparkles" color="white" :size="32" />
					</view>
					<view class="bubble assistant typing">
						<view class="typing-dot"></view>
						<view class="typing-dot"></view>
						<view class="typing-dot"></view>
					</view>
				</view>

				<!-- 设备提示：可关闭，关闭后不再显示 -->
				<view v-if="showDeviceTip" class="device-tip">
					<view class="device-tip-left" @click="goBindDevice">
						<AppIcon name="device-watch" :size="34" />
						<view class="device-tip-texts">
							<text class="device-tip-title">绑定华为手环，分析更准确</text>
							<text class="device-tip-desc">同步心率、血氧等数据</text>
						</view>
					</view>
					<view class="device-tip-close" @click="closeDeviceTip">
						<AppIcon name="x" :size="20" />
					</view>
				</view>

				<view class="bottom-space"></view>
			</view>
		</scroll-view>

		<view class="input-bar">
			<input
				v-model="inputText"
				class="chat-input"
				placeholder="聊聊你的肠道健康…"
				:disabled="sending"
				confirm-type="send"
				@confirm="sendMessage(inputText)"
			/>
			<view class="send-btn" :class="{ disabled: !inputText || sending }" @click="sendMessage(inputText)">
				<AppIcon name="arrow-up" color="white" :size="32" />
			</view>
		</view>

		<!-- 会话列表 -->
		<view v-if="showSessions" class="session-mask" @click="showSessions = false">
			<view class="session-panel" @click.stop>
				<view class="session-head">
					<text class="session-title">历史会话</text>
					<view class="session-new" @click="createSession">＋ 新对话</view>
				</view>
				<scroll-view scroll-y class="session-list">
					<view
						v-for="session in sessions"
						:key="session.id"
						class="session-item"
						:class="{ active: session.id === currentSessionId }"
						@click="switchSession(session.id)"
					>
						<view class="session-item-main">
							<text class="session-item-title">{{ session.title || '新对话' }}</text>
							<text class="session-item-time">{{ formatSessionTime(session.updatedAt) }}</text>
						</view>
						<view class="session-delete" @click.stop="deleteSession(session.id)">删除</view>
					</view>
					<view v-if="sessions.length === 0" class="session-empty">暂无会话</view>
				</scroll-view>
			</view>
		</view>

		<ConfirmModal
			:visible="showLoginModal"
			title="提示"
			content="登录后才能使用 AI 健康助手，是否前往登录？"
			confirmText="去登录"
			cancelText="取消"
			@confirm="handleLoginConfirm"
			@cancel="handleLoginCancel"
		/>
	</view>
</template>

<script>
	import ConfirmModal from '@/components/ConfirmModal/ConfirmModal.vue'
	import CustomNav from '@/components/custom-nav/custom-nav.vue'
	import AppIcon from '@/components/AppIcon/AppIcon.vue'
	import { aiApi, recordApi, deviceApi } from '@/js_sdk/sg-client/api.js'

	export default {
		name: 'AiChat',
		components: {
			ConfirmModal,
			CustomNav,
			AppIcon
		},
		data() {
			return {
				showLoginModal: false,
				sessions: [],
				currentSessionId: '',
				messages: [],
				inputText: '',
				sending: false,
				boundDevices: [],
				hideDeviceTip: false,
				showSessions: false,
				scrollIntoId: ''
			}
		},
		computed: {
			currentTitle() {
				const session = this.sessions.find(s => s.id === this.currentSessionId)
				return session ? session.title : '新对话'
			},
			showDeviceTip() {
				return !this.hideDeviceTip && this.boundDevices.length === 0
			}
		},
		onShow() {
			const isLoggedIn = uni.getStorageSync('isLoggedIn')
			if (!isLoggedIn) {
				this.showLoginModal = true
				return
			}
			this.hideDeviceTip = uni.getStorageSync('hideDeviceTip') === true
			this.loadDevices()
			this.loadSessions()
		},
		methods: {
			handleLoginConfirm() {
				this.showLoginModal = false
				uni.reLaunch({ url: '/pages/profile/profile' })
			},
			handleLoginCancel() {
				this.showLoginModal = false
				uni.switchTab({ url: '/pages/index/index' })
			},
			async loadDevices() {
				const userId = uni.getStorageSync('userId')
				if (!userId) return
				const res = await deviceApi.status(userId)
				if (res && res.code === 0 && res.data) {
					this.boundDevices = res.data.huawei ? [res.data.huawei] : []
				}
			},
			goBindDevice() {
				uni.navigateTo({ url: '/pages/user-settings/devices/devices' })
			},
			closeDeviceTip() {
				this.hideDeviceTip = true
				uni.setStorageSync('hideDeviceTip', true)
			},
			/* ============ 会话管理 ============ */
			loadSessions() {
				if (this.currentSessionId) this.saveCurrentSession()
				const saved = uni.getStorageSync('chatSessions') || []
				this.sessions = saved
				const currentId = uni.getStorageSync('chatCurrentSessionId')
				const current = saved.find(s => s.id === currentId) || saved[0]
				if (current) {
					this.currentSessionId = current.id
					this.messages = current.messages || []
					uni.setStorageSync('chatCurrentSessionId', current.id)
					this.scrollToBottom()
				} else {
					this.createSession()
				}
			},
			createSession() {
				this.saveCurrentSession()
				const welcome = {
					id: 'welcome_' + Date.now(),
					role: 'assistant',
					content: '你好，我是你的肠道 AI 助手，可以帮你记录排便、设置提醒、解读分析。',
					result: ''
				}
				const session = {
					id: 's_' + Date.now(),
					title: '新对话',
					messages: [welcome],
					updatedAt: Date.now()
				}
				this.sessions.unshift(session)
				this.currentSessionId = session.id
				this.messages = session.messages
				this.showSessions = false
				this.saveCurrentSession()
				this.scrollToBottom()
			},
			switchSession(id) {
				if (id === this.currentSessionId) {
					this.showSessions = false
					return
				}
				this.saveCurrentSession()
				const session = this.sessions.find(s => s.id === id)
				if (!session) return
				this.currentSessionId = id
				this.messages = session.messages || []
				uni.setStorageSync('chatCurrentSessionId', id)
				this.showSessions = false
				this.scrollToBottom()
			},
			deleteSession(id) {
				this.sessions = this.sessions.filter(s => s.id !== id)
				if (id === this.currentSessionId) {
					const next = this.sessions[0]
					if (next) {
						this.currentSessionId = next.id
						this.messages = next.messages || []
						uni.setStorageSync('chatCurrentSessionId', next.id)
					} else {
						this.currentSessionId = ''
						this.messages = []
						this.createSession()
					}
				}
				this.saveSessions()
			},
			saveCurrentSession() {
				const index = this.sessions.findIndex(s => s.id === this.currentSessionId)
				if (index < 0) return
				const firstUser = this.messages.find(m => m.role === 'user')
				this.sessions[index] = {
					...this.sessions[index],
					title: firstUser ? firstUser.content.slice(0, 12) : '新对话',
					messages: this.messages.slice(-60),
					updatedAt: Date.now()
				}
				this.saveSessions()
			},
			saveSessions() {
				uni.setStorageSync('chatSessions', this.sessions)
				if (this.currentSessionId) {
					uni.setStorageSync('chatCurrentSessionId', this.currentSessionId)
				}
			},
			formatSessionTime(timestamp) {
				if (!timestamp) return ''
				const d = new Date(timestamp)
				const now = new Date()
				const pad = n => String(n).padStart(2, '0')
				if (d.toDateString() === now.toDateString()) {
					return `${pad(d.getHours())}:${pad(d.getMinutes())}`
				}
				return `${d.getMonth() + 1}月${d.getDate()}日`
			},
			scrollToBottom() {
				this.$nextTick(() => {
					const last = this.messages[this.messages.length - 1]
					if (last) this.scrollIntoId = 'msg-' + last.id
				})
			},
			/* ============ 对话 ============ */
			async sendMessage(text) {
				const content = (text || '').trim()
				if (!content || this.sending) return
				const userId = uni.getStorageSync('userId')
				if (!userId) {
					this.showLoginModal = true
					return
				}

				this.inputText = ''
				const userMsg = {
					id: String(Date.now()),
					role: 'user',
					content
				}
				this.messages.push(userMsg)
				this.sending = true
				this.scrollToBottom()
				this.saveCurrentSession()

				const history = this.messages
					.filter(m => m.role === 'user' || (m.role === 'assistant' && !String(m.id).startsWith('welcome')))
					.slice(-9, -1)
					.map(m => ({ role: m.role, content: m.content }))

				try {
					const res = await aiApi.chat(userId, content, history)
					if (res && res.code === 0 && res.data) {
						const aiMsg = {
							id: String(Date.now() + 1),
							role: 'assistant',
							content: res.data.reply || '我在，有什么可以帮你？',
							result: '',
							showReport: res.data.action && (res.data.action.type === 'open_report' || res.data.action.type === 'broadcast_analysis')
						}
						this.messages.push(aiMsg)
						this.sending = false
						this.scrollToBottom()
						await this.executeAction(aiMsg, res.data.action)
						this.saveCurrentSession()
						this.scrollToBottom()
					} else {
						this.messages.push({
							id: String(Date.now() + 1),
							role: 'assistant',
							content: (res && res.message) || 'AI 助手暂时没有回应，请稍后再试。'
						})
						this.sending = false
						this.saveCurrentSession()
						this.scrollToBottom()
					}
				} catch (e) {
					console.error('[chat] AI 对话失败:', e)
					this.messages.push({
						id: String(Date.now() + 1),
						role: 'assistant',
						content: '网络开小差了，请稍后再试。'
					})
					this.sending = false
					this.saveCurrentSession()
					this.scrollToBottom()
				}
			},
			async executeAction(aiMsg, action) {
				if (!action || !action.type || action.type === 'none') return
				const payload = action.payload || {}

				if (action.type === 'add_record') {
					const userId = uni.getStorageSync('userId')
					const res = await recordApi.add({
						userId,
						type: parseInt(payload.type),
						color: payload.color || '棕色',
						feeling: payload.feeling || 'smooth',
						note: payload.note || '',
						duration: parseInt(payload.duration) || 0,
						water: parseInt(payload.water) || 0,
						fiber: parseInt(payload.fiber) || 0,
						isMenstruation: !!payload.isMenstruation
					})
					if (res && res.code === 0) {
						uni.removeStorageSync('aiReportCache_week')
						uni.removeStorageSync('aiReportCache_month')
						uni.removeStorageSync('aiReportCache_year')
						aiMsg.resultIcon = 'notebook'
						aiMsg.resultTitle = '排便记录已保存'
						aiMsg.result = '记录成功，今日分析报告将在下次打开时自动更新。'
					} else {
						aiMsg.resultIcon = 'alert-triangle'
						aiMsg.resultTitle = '记录未保存'
						aiMsg.result = (res && res.message) || '请补充排便类型（1-7）和感受后再试。'
					}
					return
				}

				if (action.type === 'add_reminder') {
					const time = payload.time
					if (!time) return
					const list = uni.getStorageSync('userReminders') || []
					if (!list.some(r => r.time === time)) {
						list.push({ id: Date.now().toString(), time, enabled: false })
					}
					uni.setStorageSync('userReminders', list)
					aiMsg.resultIcon = 'bell'
					aiMsg.resultTitle = '每日提醒已添加'
					aiMsg.result = '每天 ' + time + ' 提醒你记录排便，可到「我的」中开启通知。'
					return
				}

				if (action.type === 'broadcast_analysis') {
					aiMsg.resultIcon = 'chart-bar'
					aiMsg.resultTitle = '今日分析'
					aiMsg.result = await this.loadReportSummary(payload.period || 'week')
					return
				}

				if (action.type === 'open_report') {
					this.openReport()
					return
				}
			},
			async loadReportSummary(period) {
				const userId = uni.getStorageSync('userId')
				const today = this.getTodayStr()
				let report = null
				const cache = uni.getStorageSync('aiReportCache_' + period)
				if (cache && cache.date === today && cache.data) {
					report = cache.data
				} else {
					uni.showLoading({ title: '正在生成分析…' })
					const res = await aiApi.get(userId, period)
					uni.hideLoading()
					if (res && res.code === 0) {
						report = res.data
						uni.setStorageSync('aiReportCache_' + period, { date: today, data: report })
					}
				}
				if (!report) return '暂时无法生成分析报告，请稍后重试。'
				return '你的肠道健康评分 ' + (report.score || 0) + ' 分。' + (report.aiSummary || '暂时没有分析内容。')
			},
			getTodayStr() {
				const now = new Date()
				const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000)
				return beijing.toISOString().slice(0, 10)
			},
			openReport() {
				uni.navigateTo({ url: '/pages/others/ai-analysis/ai-analysis' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	$primary: #8d4b00;
	$primary-light: #b15f00;
	$text-primary: #2a1f15;
	$text-secondary: #554336;
	$text-muted: #887364;
	$card: rgba(255, 249, 240, 0.86);

	.chat-page {
		height: calc(100vh - var(--window-bottom, 0px));
		display: flex;
		flex-direction: column;
		padding: 0 24rpx;
		box-sizing: border-box;
		background:
			radial-gradient(circle at 50% -8%, rgba(255, 219, 203, 0.5) 0%, transparent 58%),
			linear-gradient(180deg, #fff7ef 0%, #fef8f3 45%);
	}

	.agent-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		padding: 8rpx 8rpx 16rpx;
	}

	.bar-title {
		font-size: 24rpx;
		color: $text-muted;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.session-btn {
		display: flex;
		align-items: center;
		gap: 6rpx;
		padding: 10rpx 20rpx;
		border-radius: 100rpx;
		background: rgba(141, 75, 0, 0.08);
		flex-shrink: 0;
	}

	.session-btn-text {
		font-size: 23rpx;
		font-weight: 600;
		color: $primary;
	}

	.msg-scroll {
		flex: 1;
		height: 0;
	}

	.msg-list {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
		padding: 8rpx 4rpx 24rpx;
	}

	.msg-row {
		display: flex;
		gap: 16rpx;
		max-width: 100%;

		&.user {
			flex-direction: row-reverse;
		}
	}

	.agent-avatar {
		width: 60rpx;
		height: 60rpx;
		border-radius: 20rpx;
		background: linear-gradient(135deg, #b15f00 0%, #8d4b00 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: 0 6rpx 18rpx rgba(141, 75, 0, 0.18);
	}

	.msg-body {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
		max-width: 78%;
		align-items: flex-start;
	}

	.msg-row.user .msg-body {
		align-items: flex-end;
	}

	.bubble {
		padding: 22rpx 28rpx;
		border-radius: 28rpx;

		&.assistant {
			background: $card;
			border: 1rpx solid rgba(255, 220, 195, 0.5);
			border-top-left-radius: 8rpx;
			box-shadow: 0 8rpx 28rpx rgba(146, 64, 14, 0.06);
		}

		&.user {
			background: linear-gradient(135deg, $primary-light 0%, $primary 100%);
			border-top-right-radius: 8rpx;
			box-shadow: 0 8rpx 24rpx rgba(141, 75, 0, 0.18);
		}
	}

	.bubble-text {
		font-size: 28rpx;
		line-height: 1.7;
		white-space: pre-wrap;

		.bubble.assistant & {
			color: $text-primary;
		}

		.bubble.user & {
			color: #ffffff;
		}
	}

	.bubble.typing {
		display: flex;
		align-items: center;
		gap: 10rpx;
		padding: 28rpx;
	}

	.typing-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: rgba(141, 75, 0, 0.4);
		animation: typing 1.2s ease-in-out infinite;

		&:nth-child(2) { animation-delay: 0.15s; }
		&:nth-child(3) { animation-delay: 0.3s; }
	}

	@keyframes typing {
		0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
		30% { transform: translateY(-8rpx); opacity: 1; }
	}

	.tool-card {
		display: flex;
		gap: 16rpx;
		padding: 22rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(16, 185, 129, 0.07);
		border: 1rpx solid rgba(16, 185, 129, 0.16);
		width: 100%;
		box-sizing: border-box;
	}

	.tool-info {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}

	.tool-title {
		font-size: 26rpx;
		font-weight: 700;
		color: #0f766e;
	}

	.tool-desc {
		font-size: 24rpx;
		color: #3f6f66;
		line-height: 1.6;
	}

	.bubble-actions {
		display: flex;
		gap: 12rpx;
	}

	.bubble-action {
		display: flex;
		align-items: center;
		gap: 6rpx;
		padding: 8rpx 18rpx;
		border-radius: 100rpx;
		background: rgba(141, 75, 0, 0.06);
	}

	.action-text {
		font-size: 22rpx;
		color: $primary;
	}

	.device-tip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 24rpx;
		border-radius: 24rpx;
		background: rgba(59, 130, 246, 0.06);
		border: 1rpx solid rgba(59, 130, 246, 0.14);
	}

	.device-tip-left {
		display: flex;
		align-items: center;
		gap: 16rpx;
		flex: 1;
	}

	.device-tip-texts {
		display: flex;
		flex-direction: column;
		gap: 2rpx;
	}

	.device-tip-title {
		font-size: 25rpx;
		font-weight: 700;
		color: #1d4ed8;
	}

	.device-tip-desc {
		font-size: 21rpx;
		color: #3b5b8c;
	}

	.device-tip-close {
		width: 48rpx;
		height: 48rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.55;
	}

	.bottom-space {
		height: 24rpx;
	}

	.input-bar {
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 16rpx 0 12rpx;
	}

	.send-btn {
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: linear-gradient(135deg, $primary-light 0%, $primary 100%);
		box-shadow: 0 6rpx 18rpx rgba(141, 75, 0, 0.2);

		&.disabled {
			opacity: 0.4;
		}
	}

	.chat-input {
		flex: 1;
		height: 76rpx;
		background: rgba(255, 249, 240, 0.94);
		border: 1rpx solid rgba(255, 220, 195, 0.6);
		border-radius: 38rpx;
		padding: 0 28rpx;
		font-size: 28rpx;
		color: $text-primary;
		box-shadow: inset 0 2rpx 8rpx rgba(146, 64, 14, 0.04);
	}

	.session-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(45, 30, 20, 0.35);
		z-index: 1000;
		display: flex;
		align-items: flex-end;
	}

	.session-panel {
		width: 100%;
		max-height: 70vh;
		background: #fffaf3;
		border-radius: 40rpx 40rpx 0 0;
		padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.session-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.session-title {
		font-size: 32rpx;
		font-weight: 700;
		color: $text-primary;
	}

	.session-new {
		font-size: 25rpx;
		font-weight: 600;
		color: $primary;
		padding: 10rpx 22rpx;
		border-radius: 100rpx;
		background: rgba(141, 75, 0, 0.08);
	}

	.session-list {
		max-height: 52vh;
	}

	.session-item {
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 22rpx 20rpx;
		border-radius: 24rpx;
		margin-bottom: 10rpx;
		background: rgba(255, 255, 255, 0.6);

		&.active {
			background: rgba(141, 75, 0, 0.08);
		}
	}

	.session-item-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4rpx;
		overflow: hidden;
	}

	.session-item-title {
		font-size: 27rpx;
		font-weight: 600;
		color: $text-primary;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.session-item-time {
		font-size: 21rpx;
		color: $text-muted;
	}

	.session-delete {
		font-size: 22rpx;
		color: #c0533c;
		padding: 8rpx 14rpx;
		border-radius: 100rpx;
		background: rgba(192, 83, 60, 0.08);
	}

	.session-empty {
		text-align: center;
		font-size: 24rpx;
		color: $text-muted;
		padding: 40rpx 0;
	}
</style>