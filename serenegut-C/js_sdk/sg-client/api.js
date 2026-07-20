/* ============================================================
 * API 服务层 · Serene Gut 用户端
 * 统一通过 client-api 云函数访问数据，使用 module + action 双层路由
 * 含：超时处理 + 错误提示（不含缓存层，保持轻量）
 * ============================================================ */

/* 统一云函数名 */
const CLOUD_FUNCTION = 'client-api'

/* ===================== 云函数调用 ===================== */

/**
 * 带超时的云函数调用（统一走 client-api，通过 module 区分业务模块）
 * @param {string} mod - 模块名（user, records, article, ranking, config, auth, sync, ai, announcement）
 * @param {object} data - 业务参数（包含 action 和其他参数）
 * @param {object} options - 可选项（timeout 超时时间，默认 10 秒）
 * @returns {Promise<object>} 云函数返回结果
 */
async function callCloud(mod, data = {}, options = {}) {
	const { timeout = 10000 } = options
	/* 将 module 注入到 data 中 */
	const payload = { module: mod, ...data }

	try {
		const res = await Promise.race([
			uniCloud.callFunction({ name: CLOUD_FUNCTION, data: payload }),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('网络请求超时')), timeout)
			)
		])
		return res.result
	} catch (err) {
		console.error(`[API] ${mod} 调用失败:`, err)
		throw err
	}
}

/* ============================================================
 * 用户模块（user）
 * action: get, update, delete, decodePhoneNumber
 * ============================================================ */
export const userApi = {
	/* 获取用户资料 */
	get(userId) {
		return callCloud('user', { action: 'get', userId })
	},
	/* 更新用户资料 */
	update(userId, data) {
		return callCloud('user', { action: 'update', userId, ...data })
	},
	/* 注销用户账号 */
	delete(userId, confirmText) {
		return callCloud('user', { action: 'delete', userId, confirmText })
	},
	/* 微信手机号快捷登录（解密手机号） */
	decodePhoneNumber(code) {
		return callCloud('user', { action: 'decodePhoneNumber', code })
	}
}

/* ============================================================
 * 排便记录模块（records）
 * action: get, add
 * ============================================================ */
export const recordApi = {
	/* 获取排便记录列表（支持按年月或日期范围查询） */
	get(params) {
		return callCloud('records', { action: 'get', ...params })
	},
	/* 新增一条排便记录 */
	add(data) {
		return callCloud('records', { action: 'add', ...data })
	}
}

/* ============================================================
 * 文章模块（article）
 * action: list, get, increment, like, favorite, check
 * ============================================================ */
export const articleApi = {
	/* 获取文章列表 */
	list(params = {}) {
		return callCloud('article', { action: 'list', ...params })
	},
	/* 获取文章详情 */
	get(article_id) {
		return callCloud('article', { action: 'get', article_id })
	},
	/* 文章浏览/分享次数自增 */
	increment(article_id, type) {
		return callCloud('article', { action: 'increment', article_id, type })
	},
	/* 点赞文章 */
	like(article_id, user_id) {
		return callCloud('article', { action: 'like', article_id, user_id })
	},
	/* 收藏文章 */
	favorite(article_id, user_id) {
		return callCloud('article', { action: 'favorite', article_id, user_id })
	},
	/* 检查用户对文章的点赞/收藏状态 */
	check(article_id, user_id) {
		return callCloud('article', { action: 'check', article_id, user_id })
	}
}

/* ============================================================
 * 排行榜模块（ranking）
 * action: get
 * ============================================================ */
export const rankingApi = {
	/* 获取当日排行榜（传入 userId 获取自己的排名） */
	get(userId, size = 10) {
		return callCloud('ranking', { action: 'get', userId, size })
	}
}

/* ============================================================
 * 应用配置模块（config）
 * action: get, update
 * ============================================================ */
export const configApi = {
	/* 获取全局应用配置 */
	get() {
		return callCloud('config', { action: 'get' })
	},
	/* 更新应用配置 */
	update(data) {
		return callCloud('config', { action: 'update', ...data })
	}
}

/* ============================================================
 * 认证模块（auth）
 * action: email-login, email-register, wechat-login, bind-account
 * ============================================================ */
export const authApi = {
	/* 邮箱密码登录 */
	emailLogin(email, password) {
		return callCloud('auth', { action: 'email-login', email, password })
	},
	/* 邮箱注册新账号 */
	emailRegister(data) {
		return callCloud('auth', { action: 'email-register', ...data })
	},
	/* 微信小程序授权登录 */
	wechatLogin(code) {
		return callCloud('auth', { action: 'wechat-login', code })
	},
	/* 绑定第三方账号到现有用户 */
	bindAccount(data) {
		return callCloud('auth', { action: 'bind-account', ...data })
	}
}

/* ============================================================
 * 批量同步模块（sync）
 * action: batch
 * ============================================================ */
export const syncApi = {
	/* 批量同步操作（客户端累积一批操作后统一处理） */
	batch(actions) {
		return callCloud('sync', { action: 'batch', actions })
	}
}

/* ============================================================
 * AI 健康分析模块（ai）
 * action: get, check, test
 * ============================================================ */
export const aiApi = {
	/* 获取或生成 AI 报告（支持 period 周期参数：week/month/day） */
	get(userId, period = 'week', timeout = 55000) {
		return callCloud('ai', { action: 'get', userId, period }, { timeout })
	},
	/* AI 健康助手对话：识别记录、提醒、播报等意图 */
	chat(userId, message, history = [], timeout = 45000) {
		return callCloud('ai', { action: 'chat', userId, message, history }, { timeout })
	},
	/* 获取趋势分析数据（支持 period 周期参数：week/month/year） */
	getTrend(userId, period = 'week') {
		return callCloud('ai', { action: 'getTrend', userId, period }, { timeout: 15000 })
	},
	/* 检查今日是否已有报告 */
	check(userId) {
		return callCloud('ai', { action: 'check', userId })
	},
	/* 测试 AI 连接是否正常 */
	test() {
		return callCloud('ai', { action: 'test' }, { timeout: 20000 })
	}
}

/* ============================================================
 * 可穿戴设备模块（device）
 * action: config, bindHuawei, syncHuawei, status, unbind
 * ============================================================ */
export const deviceApi = {
	/* 获取华为授权所需配置（小程序 AppID、client_id、scope） */
	config() {
		return callCloud('device', { action: 'config' })
	},
	/* 绑定状态与最近一次同步的健康数据 */
	status(userId) {
		return callCloud('device', { action: 'status', userId })
	},
	/* 华为智能穿戴小程序授权返回 code 后完成绑定 */
	bindHuawei(userId, code, state) {
		return callCloud('device', { action: 'bindHuawei', userId, code, state }, { timeout: 40000 })
	},
	/* 手动同步华为健康数据 */
	syncHuawei(userId) {
		return callCloud('device', { action: 'syncHuawei', userId }, { timeout: 40000 })
	},
	/* 解绑华为运动健康 */
	unbind(userId) {
		return callCloud('device', { action: 'unbind', userId })
	}
}

/* ============================================================
 * 公告模块（announcement）
 * action: get, checkBan
 * ============================================================ */
export const announcementApi = {
	/* 获取启用的公告（普通公告列表 + 封禁公告） */
	get(userId) {
		return callCloud('announcement', { action: 'get', userId })
	},
	/* 检查用户封禁状态 */
	checkBan(userId) {
		return callCloud('announcement', { action: 'checkBan', userId })
	}
}

/* ============================================================
 * 布里斯托图片模块（bristol）
 * action: get
 * ============================================================ */
export const bristolApi = {
	/* 获取布里斯托分类图片列表 */
	get() {
		return callCloud('bristol', { action: 'get' })
	}
}

/* ============================================================
 * 提醒模块（reminder）
 * action: subscribe, unsubscribe, getStatus
 * ============================================================ */
export const reminderApi = {
	/* 订阅提醒（用户授权后调用，累加发送配额） */
	subscribe(userId, reminderTime, templateId) {
		return callCloud('reminder', { action: 'subscribe', userId, reminderTime, templateId })
	},
	/* 取消订阅（指定提醒时间） */
	unsubscribe(userId, reminderTime) {
		return callCloud('reminder', { action: 'unsubscribe', userId, reminderTime })
	},
	/* 获取所有提醒订阅状态 */
	getStatus(userId) {
		return callCloud('reminder', { action: 'getStatus', userId })
	}
}
