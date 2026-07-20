'use strict';
/**
 * @name client-api
 * @description 用户端统一API云函数（module + action 双层路由）
 *
 * 合并了以下12个云函数：
 * - user: 用户资料管理（get, update, delete, decodePhoneNumber）
 * - records: 排便记录管理（get, add）
 * - article: 文章管理（list, get, increment, decrement, like, favorite, check, create, update, toggle, delete）
 * - ranking: 当日排行榜（get）
 * - config: 应用配置（get, update）
 * - auth: 认证（email-login, email-register, wechat-login, bind-account）
 * - sync: 批量同步（batch）
 * - ai: AI肠道健康分析（get, check, test）
 * - announcement: 公告管理（get, checkBan）
 *
 * @example
 * uniCloud.callFunction({
 *   name: 'client-api',
 *   data: { module: 'user', action: 'get', userId: 'xxx' }
 * })
 */

// ==================== 依赖引入 ====================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==================== 数据库连接（共享） ====================
const db = uniCloud.database();
const _ = db.command;
const usersCollection = db.collection('users');
const recordsCollection = db.collection('records');
const articleCollection = db.collection('article');
const reportsCollection = db.collection('ai_reports');
const configCollection = db.collection('app_config');
const healthDevicesCollection = db.collection('health_devices');
const healthMetricsCollection = db.collection('health_metrics');

// JWT 密钥
const JWT_SECRET = 'changethissecretkeyinproduction';

// 默认AI配置（数据库未配置时使用）
const DEFAULT_AI_CONFIG = {
	api_key: '',
	api_url: 'https://api.deepseek.com/v1/chat/completions',
	model: 'deepseek-chat'
};

/* ===================== 华为运动健康（Health Service Kit） ===================== */
const HUAWEI_HEALTH = {
	tokenUrl: 'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
	apiBase: 'https://health-api.cloud.huawei.com/healthkit/v2',
	redirectUri: 'https://h5hosting.dbankcdn.com/cch5/healthkit/oauth-h5/oauth-callback.html',
	miniProgramAppId: 'wxa6c04f899577d944',
	miniProgramPath: 'pages/authLogin/authLogin'
};

const HUAWEI_DEFAULT_SCOPES = [
	'https://www.huawei.com/healthkit/step.read',
	'https://www.huawei.com/healthkit/heartrate.read',
	'https://www.huawei.com/healthkit/oxygensaturation.read',
	'https://www.huawei.com/healthkit/stress.read',
	'https://www.huawei.com/healthkit/bodytemperature.read',
	'https://www.huawei.com/healthkit/sleep.read'
];

// ==================== 共享工具函数 ====================

/**
 * 生成JWT Token（邮箱登录/注册使用）
 * @param {string} userId - 用户ID
 * @returns {string} JWT token，有效期7天
 */
function generateJWTToken(userId) {
	return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * 生成随机Token（微信登录使用）
 * @returns {string} 随机token字符串
 */
function generateRandomToken() {
	return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 10);
}

/**
 * 日期格式化为 "YYYY-MM-DD HH:mm"
 * @param {number|Date} timestamp - 时间戳或日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(timestamp) {
	if (!timestamp) return '';
	const d = new Date(timestamp);
	if (isNaN(d.getTime())) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 将秒数格式化为 "MM:SS"
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatDuration(seconds) {
	if (!seconds || seconds <= 0) return '00:00';
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 从 HTML content 中提取所有 img 标签信息
 * @param {string} content - HTML 正文
 * @returns {Array} [{url, alt, sort}]
 */
function extractImagesFromContent(content) {
	if (!content) return [];
	const images = [];
	const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
	let match;
	let sort = 0;
	while ((match = imgRegex.exec(content)) !== null) {
		images.push({
			url: match[1],
			alt: match[2] || '',
			sort: sort++
		});
	}
	return images;
}

/**
 * 获取北京时区当前日期字符串 "YYYY-MM-DD"
 * @returns {string} 日期字符串
 */
function getBeijingDateStr() {
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	const y = beijingTime.getUTCFullYear();
	const m = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
	const d = String(beijingTime.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * 获取本周时间范围（周一到周日），以昨天为基准，不包含当天数据
 * 例如今天是7.17(周四)，则分析7.14(周一)~7.20(周日)中截至7.16的数据
 * @returns {{weekStart: Date, weekEnd: Date}}
 */
function getWeekRange() {
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	// 使用昨天作为基准（不包含今天的数据）
	const yesterday = new Date(beijingTime);
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);

	const dayOfWeek = yesterday.getUTCDay(); // 0=Sunday
	const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

	const weekStart = new Date(yesterday);
	weekStart.setUTCDate(yesterday.getUTCDate() + mondayOffset);
	weekStart.setUTCHours(0, 0, 0, 0);

	const weekEnd = new Date(weekStart);
	weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
	weekEnd.setUTCHours(23, 59, 59, 999);

	return { weekStart, weekEnd };
}

/**
 * 获取上个月时间范围（本月1号到昨天），不包含当天数据
 * @returns {{monthStart: Date, monthEnd: Date}}
 */
function getMonthRange() {
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	// 昨天作为结束时间（不包含今天）
	const yesterday = new Date(beijingTime);
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	yesterday.setUTCHours(23, 59, 59, 999);

	// 本月1号作为起始时间
	const monthStart = new Date(yesterday);
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);

	return { monthStart, monthEnd: yesterday };
}

/**
 * 获取昨天的时间范围（仅昨天一天），不包含当天数据
 * @returns {{dayStart: Date, dayEnd: Date}}
 */
function getYesterdayRange() {
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	const yesterday = new Date(beijingTime);
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	yesterday.setUTCHours(0, 0, 0, 0);

	const dayEnd = new Date(yesterday);
	dayEnd.setUTCHours(23, 59, 59, 999);

	return { dayStart: yesterday, dayEnd };
}

/**
 * 获取本年时间范围（今年1月1号到昨天），不包含当天数据
 * @returns {{yearStart: Date, yearEnd: Date}}
 */
function getYearRange() {
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	const yesterday = new Date(beijingTime);
	yesterday.setUTCDate(yesterday.getUTCDate() - 1);
	yesterday.setUTCHours(23, 59, 59, 999);

	const yearStart = new Date(Date.UTC(beijingTime.getUTCFullYear(), 0, 1));
	yearStart.setUTCHours(0, 0, 0, 0);

	return { yearStart, yearEnd: yesterday };
}

/**
 * 根据周期类型获取统一格式的时间范围 { start, end }
 * @param {string} period - 周期：week/month/day/year
 * @returns {{start: Date, end: Date}}
 */
function getPeriodTimeRange(period) {
	if (period === 'month') {
		const { monthStart, monthEnd } = getMonthRange();
		return { start: monthStart, end: monthEnd };
	} else if (period === 'day') {
		const { dayStart, dayEnd } = getYesterdayRange();
		return { start: dayStart, end: dayEnd };
	} else if (period === 'year') {
		const { yearStart, yearEnd } = getYearRange();
		return { start: yearStart, end: yearEnd };
	}
	// 默认 week
	const { weekStart, weekEnd } = getWeekRange();
	return { start: weekStart, end: weekEnd };
}

/**
 * 根据周期类型获取天数（用于计算平均频率）
 * @param {string} period - 周期：week/month/day/year
 * @param {{start: Date, end: Date}} timeRange - 时间范围
 * @returns {number} 天数
 */
function getPeriodDays(period, timeRange) {
	if (period === 'week') return 7;
	if (period === 'day') return 1;
	if (period === 'month' || period === 'year') {
		// 计算时间范围内的天数
		const diffMs = timeRange.end.getTime() - timeRange.start.getTime();
		return Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1);
	}
	return 7;
}

/**
 * 格式化日期为 "YYYY-MM-DD"（使用UTC）
 * @param {Date} date - 日期对象
 * @returns {string} 日期字符串
 */
function formatDateStr(date) {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, '0');
	const d = String(date.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * 格式化AI报告数据（统一字段命名）
 * @param {Object} raw - 原始报告数据
 * @returns {Object} 格式化后的报告
 */
function formatReport(raw) {
	return {
		score: raw.score || 0,
		weeklyData: raw.weekly_data || raw.weeklyData || [],
		averageFrequency: raw.average_frequency !== undefined ? raw.average_frequency : (raw.averageFrequency || 0),
		qualifiedDays: raw.qualified_days !== undefined ? raw.qualified_days : (raw.qualifiedDays || 0),
		scoreTrend: raw.score_trend || raw.scoreTrend || '首次分析',
		userRanking: raw.user_ranking || raw.userRanking || '暂无排名数据',
		aiSummary: raw.ai_summary || raw.aiSummary || '',
		aiSummaryTags: raw.ai_summary_tags || raw.aiSummaryTags || [],
		metrics: raw.metrics || [],
		tips: raw.tips || []
	};
}

/**
 * 读取AI配置（增强版）
 * 优先级：ai_models表（is_active=true）> app_config表（sync_config文档）> 默认值
 * @returns {{api_key: string, api_url: string, model: string}}
 */
async function getAIConfig() {
	// 1. 优先从 ai_models 表读取启用的模型
	try {
		const modelRes = await db.collection('ai_models').where({ is_active: true }).limit(1).get();
		if (modelRes.data && modelRes.data.length > 0) {
			const m = modelRes.data[0];
			return {
				api_key: m.api_key || DEFAULT_AI_CONFIG.api_key,
				api_url: m.api_url || DEFAULT_AI_CONFIG.api_url,
				model: m.model || DEFAULT_AI_CONFIG.model
			};
		}
	} catch (e) {
		console.warn('[ai] 读取ai_models表失败:', e.message);
	}
	// 2. 降级从 app_config 表读取
	try {
		const res = await configCollection.doc('sync_config').get();
		if (res.data && res.data.length > 0) {
			const cfg = res.data[0];
			return {
				api_key: cfg.ai_api_key || DEFAULT_AI_CONFIG.api_key,
				api_url: cfg.ai_api_url || DEFAULT_AI_CONFIG.api_url,
				model: cfg.ai_model || DEFAULT_AI_CONFIG.model
			};
		}
	} catch (e) {
		console.warn('[ai] 读取app_config失败:', e.message);
	}
	// 3. 使用默认值
	return DEFAULT_AI_CONFIG;
}

// ==================== 主路由入口 ====================

exports.main = async (event, context) => {
	/* 定时触发器：event 无 module 字段，但有 TriggerName 字段 */
	if (event.TriggerName) {
		console.log('[timer] 定时触发器:', event.TriggerName);
		return await handleTimerTrigger(event);
	}

	const { module: mod, action } = event;

	if (!mod) {
		return { code: -1, message: '缺少模块名(module)' };
	}

	switch (mod) {
		case 'user':
			return await userModule(event, context);
		case 'records':
			return await recordsModule(event, context);
		case 'article':
			return await articleModule(event, context);
		case 'ranking':
			return await rankingModule(event, context);
		case 'config':
			return await configModule(event, context);
		case 'auth':
			return await authModule(event, context);
		case 'sync':
			return await syncModule(event, context);
		case 'ai':
			return await aiModule(event, context);
		case 'announcement':
			return await announcementModule(event, context);
		case 'bristol':
			return await bristolModule(event, context);
		case 'reminder':
			return await reminderModule(event, context);
		case 'device':
			return await deviceModule(event, context);
		default:
			return { code: -1, message: '不支持的模块' };
	}
};

// ==================== user 模块：用户资料管理 ====================
// action: get, update, delete, decodePhoneNumber

async function userModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'get':
			return await userGet(event, context);
		case 'update':
			return await userUpdate(event, context);
		case 'delete':
			return await userDelete(event, context);
		case 'decodePhoneNumber':
			return await userDecodePhoneNumber(event, context);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、update、delete、decodePhoneNumber' };
	}
}

/** 手机号解密（通过微信code获取手机号） */
async function userDecodePhoneNumber(event, context) {
	const { code } = event;

	if (!code) {
		return { code: -1, message: 'code不能为空' };
	}

	try {
		// 尝试使用 uniCloud 内置 API
		const phoneInfo = await uniCloud.getPhoneNumber({ code });
		if (phoneInfo && phoneInfo.phoneNumber) {
			return { code: 0, data: { phoneNumber: phoneInfo.phoneNumber } };
		}
		return { code: -1, message: '获取手机号失败：返回数据为空' };
	} catch (e) {
		console.error('[user] getPhoneNumber 失败:', e.message);
		return { code: -1, message: '获取手机号失败: ' + e.message };
	}
}

/** 获取用户信息 */
async function userGet(event, context) {
	const { userId } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		const userRes = await usersCollection.where({ _id: userId }).get();

		if (userRes.data.length === 0) {
			return { code: -1, message: '用户不存在' };
		}

		const user = userRes.data[0];

		return {
			code: 0,
			message: '获取成功',
			data: {
				_id: user._id,
				nickname: user.nickname || '',
				name: user.name || '',
				avatar_url: user.avatar_url || '',
				phone: user.phone || '',
				email: user.email || '',
				gender: user.gender || '',
				birthday: user.birthday || '',
				devices: user.devices || [],
				is_member: user.is_member,
				status: user.status,
				wechat_openid: user.wechat_openid || '',
				created_at: user.created_at,
				updated_at: user.updated_at
			}
		};
	} catch (error) {
		console.error('获取用户信息失败:', error);
		return { code: -1, message: '获取失败，请重试' };
	}
}

/** 更新用户资料 */
async function userUpdate(event, context) {
	const { userId, avatarUrl, nickName, name, phone, email, gender, birthday, devices } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		const userRes = await usersCollection.where({ _id: userId }).get();

		if (userRes.data.length === 0) {
			return { code: -1, message: '用户不存在' };
		}

		const existingUser = userRes.data[0];

		/* 手机号/邮箱变更时校验唯一性 */
		if (phone !== undefined && phone !== null && phone !== '' && phone !== existingUser.phone) {
			const duplicated = await usersCollection.where({ phone, _id: _.neq(userId) }).get();
			if (duplicated.data.length > 0) {
				return { code: -1, message: '该手机号已被其他账号绑定' };
			}
		}
		if (email !== undefined && email !== null && email !== '' && email !== existingUser.email) {
			const duplicated = await usersCollection.where({ email, _id: _.neq(userId) }).get();
			if (duplicated.data.length > 0) {
				return { code: -1, message: '该邮箱已被其他账号绑定' };
			}
		}

		const updateData = {};
		if (avatarUrl !== undefined && avatarUrl !== null) updateData.avatar_url = avatarUrl;
		if (nickName !== undefined && nickName !== null) updateData.nickname = nickName;
		if (name !== undefined && name !== null) updateData.name = name;
		if (phone !== undefined && phone !== null) updateData.phone = phone;
		if (email !== undefined && email !== null) updateData.email = email;
		if (devices !== undefined && devices !== null) updateData.devices = devices;

		/* 性别和生日仅允许修改一次：值未变化时直接跳过，避免保存其他字段时被误拦截 */
		if (gender !== undefined && gender !== null && gender !== '') {
			if (existingUser.gender && existingUser.gender !== gender) {
				return { code: -1, message: '性别已设置，仅可修改一次' };
			}
			if (!existingUser.gender) {
				updateData.gender = gender;
			}
		}
		if (birthday !== undefined && birthday !== null && birthday !== '') {
			if (existingUser.birthday && existingUser.birthday !== birthday) {
				return { code: -1, message: '生日已设置，仅可修改一次' };
			}
			if (!existingUser.birthday) {
				updateData.birthday = birthday;
			}
		}

		updateData.updated_at = new Date();

		await usersCollection.where({ _id: userId }).update(updateData);

		return {
			code: 0,
			message: '更新成功'
		};
	} catch (error) {
		console.error('更新用户资料失败:', error);
		return { code: -1, message: '更新失败，请重试' };
	}
}

/** 注销账户（同时删除用户的所有记录） */
async function userDelete(event, context) {
	const { userId, confirmText } = event;

	if (!confirmText || confirmText !== '确认注销') {
		return { code: -1, message: '请输入正确的确认文字' };
	}

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		const userRes = await usersCollection.where({ _id: userId }).get();

		if (userRes.data.length === 0) {
			return { code: -1, message: '用户不存在' };
		}

		await recordsCollection.where({ user_id: userId }).remove();
		await usersCollection.where({ _id: userId }).remove();

		return {
			code: 0,
			message: '账号已注销'
		};
	} catch (error) {
		console.error('注销账号失败:', error);
		return { code: -1, message: '注销失败，请重试' };
	}
}

// ==================== records 模块：排便记录管理 ====================
// action: get, add

async function recordsModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	const { userId } = event;
	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	switch (action) {
		case 'get':
			return await recordsGet(event);
		case 'add':
			return await recordsAdd(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、add' };
	}
}

/** 获取记录列表（支持按年月筛选） */
async function recordsGet(event) {
	const { userId, year, month } = event;

	let condition = { user_id: userId };

	if (year && month) {
		const startDate = new Date(Date.UTC(year, month - 1, 1));
		const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
		condition.created_at = db.command.gte(startDate).and(db.command.lte(endDate));
	}

	const result = await recordsCollection.where(condition).orderBy('created_at', 'desc').get();

	return {
		code: 0,
		message: '获取成功',
		data: result.data
	};
}

/** 保存新记录 */
async function recordsAdd(event) {
	const { userId, type, color, feeling, note, duration, water, fiber, isMenstruation, date } = event;

	if (!type || type < 1 || type > 7) {
		return { code: -1, message: '请选择有效的粪便类型（1-7）' };
	}

	if (!feeling || !['smooth', 'effortful', 'diarrhea'].includes(feeling)) {
		return { code: -1, message: '请选择有效的排便感受' };
	}

	const result = await recordsCollection.add({
		user_id: userId,
		type: parseInt(type),
		color: color || '棕色',
		feeling: feeling,
		note: note || '',
		duration: parseInt(duration) || 0,
		water: parseInt(water) || 0,
		fiber: parseInt(fiber) || 0,
		is_menstruation: isMenstruation || false,
		created_at: date ? new Date(date) : new Date()
	});

	return {
		code: 0,
		message: '保存成功',
		data: { recordId: result._id }
	};
}

// ==================== article 模块：文章管理 ====================
// action: list, get, increment, decrement, like, favorite, check, create, update, toggle, delete

async function articleModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'list':
			return await articleList(event);
		case 'get':
			return await articleGet(event);
		case 'increment':
			return await articleIncrement(event);
		case 'decrement':
			return await articleDecrement(event);
		case 'like':
			return await articleLike(event);
		case 'favorite':
			return await articleFavorite(event);
		case 'check':
			return await articleCheck(event);
		case 'create':
			return await articleCreate(event);
		case 'update':
			return await articleUpdate(event);
		case 'toggle':
			return await articleToggle(event);
		case 'delete':
			return await articleDelete(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：list、get、increment、decrement、like、favorite、check、create、update、toggle、delete' };
	}
}

/**
 * 获取文章列表
 * 支持按分类、标签、关键词筛选
 * status 兼容：'published'→1, 'draft'→0, 'all'或不传→不筛选, 数字→直接用
 * category 兼容：category_id 优先，否则用 category 匹配 category_name
 * keyword 同时匹配 title 和 author_name
 */
async function articleList(event) {
	const { page = 1, size = 10, category_id, category, keyword, status, tag, is_top } = event;

	let whereCondition = {};

	// status 兼容处理：管理端传字符串，端侧传数字
	// 默认排除已删除文章（status=2），除非明确查全部
	if (status === 'published') {
		whereCondition.status = 1;
	} else if (status === 'draft') {
		whereCondition.status = 0;
	} else if (status !== 'all' && status !== undefined && status !== null && status !== '') {
		whereCondition.status = parseInt(status);
	} else {
		// 未指定 status 时，排除已删除的文章
		whereCondition.status = db.command.neq(2);
	}

	// category 兼容处理：category_id 优先，否则用 category 匹配 category_name
	if (category_id) {
		whereCondition.category_id = category_id;
	} else if (category) {
		whereCondition.category_name = category;
	}

	if (tag) {
		whereCondition.tags = db.command.in([tag]);
	}

	// is_top 筛选：精选内容只获取推流文章（兼容布尔值与字符串）
	if (is_top !== undefined && is_top !== null && is_top !== '') {
		whereCondition.is_top = is_top === true || is_top === 'true';
	}

	// keyword 同时匹配标题和作者名
	if (keyword) {
		const reg = db.command.regexp({ regexp: keyword, options: 'i' });
		const keywordOr = db.command.or([
			{ title: reg },
			{ author_name: reg }
		]);
		if (Object.keys(whereCondition).length > 0) {
			whereCondition = db.command.and([whereCondition, keywordOr]);
		} else {
			whereCondition = keywordOr;
		}
	}

	const skip = (page - 1) * size;

	try {
		// 不使用 .field()，避免 SDK 内部 bug（Cannot assign to read only property）
		const result = await db.collection('article')
			.where(whereCondition)
			.orderBy('is_top', 'desc')
			.orderBy('top_level', 'desc')
			.orderBy('is_recommend', 'desc')
			.orderBy('recommend_level', 'desc')
			.orderBy('publish_time', 'desc')
			.skip(skip)
			.limit(size)
			.get();

		const countResult = await db.collection('article')
			.where(whereCondition)
			.count();

		// 转换返回数据格式：增加 id 字段、status 转字符串、is_top 转 top
		const statusMap = { 0: 'draft', 1: 'published', 2: 'deleted', 3: 'reviewing', 4: 'rejected' };
		const list = result.data.map(item => {
			const { content, like_user_ids, favorite_user_ids, ...rest } = item;
			return {
				...rest,
				id: item._id,
				status: statusMap[item.status] !== undefined ? statusMap[item.status] : item.status,
				top: !!item.is_top,
				category: item.category_name || '',
				author: item.author_name || '',
				views: item.view_count || 0,
				likes: item.like_count || 0,
				publishTime: formatDate(item.publish_time || item.create_time)
			};
		});

		return {
			code: 0,
			message: '获取成功',
			data: {
				list: list,
				total: countResult.total,
				page: parseInt(page),
				size: parseInt(size)
			}
		};
	} catch (error) {
		console.error('获取文章列表失败:', error);
		return { code: -1, message: '获取文章列表失败: ' + (error.message || '未知错误') };
	}
}

/**
 * 获取单篇文章详情
 * 自动补充作者信息（从冗余字段读取，无需 join）
 */
async function articleGet(event) {
	const { article_id } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	// 管理端不限制 status，客户端传 include_all=true 时也不限制
	const query = event.include_all
		? { _id: article_id }
		: { _id: article_id, status: db.command.neq(2) };
	const result = await articleCollection.where(query).get();

	if (result.data.length === 0) {
		return { code: -1, message: '文章不存在或已删除' };
	}

	const article = result.data[0];

	// 补充默认值（兼容旧数据）
	const data = {
		_id: article._id,
		title: article.title || '',
		short_title: article.short_title || '',
		summary: article.summary || '',
		content: article.content || '',
		content_images: article.content_images || [],
		cover_image: article.cover_image || '',
		author_id: article.author_id || '',
		author_name: article.author_name || '未知作者',
		author_avatar: article.author_avatar || '',
		category_id: article.category_id || '',
		category_name: article.category_name || '',
		tags: article.tags || [],
		word_count: article.word_count || 0,
		reading_time: article.reading_time || 1,
		view_count: article.view_count || 0,
		like_count: article.like_count || 0,
		comment_count: article.comment_count || 0,
		share_count: article.share_count || 0,
		favorite_count: article.favorite_count || 0,
		publish_time: article.publish_time || article.create_time || Date.now(),
		is_comment: article.is_comment !== false
	};

	return {
		code: 0,
		message: '获取成功',
		data: data
	};
}

/** 增加统计数（阅读、分享等不可逆操作） */
async function articleIncrement(event) {
	const { article_id, type } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	if (!type || !['view', 'like', 'share', 'comment', 'favorite'].includes(type)) {
		return { code: -1, message: '无效的统计类型' };
	}

	const fieldMap = {
		view: 'view_count',
		like: 'like_count',
		share: 'share_count',
		comment: 'comment_count',
		favorite: 'favorite_count'
	};

	const field = fieldMap[type];

	try {
		await articleCollection.where({ _id: article_id }).update({
			[field]: db.command.inc(1),
			update_time: new Date()
		});

		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新统计失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/** 减少统计数（取消点赞、取消收藏） */
async function articleDecrement(event) {
	const { article_id, type } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	if (!type || !['like', 'favorite'].includes(type)) {
		return { code: -1, message: '无效的统计类型，仅支持 like/favorite' };
	}

	const fieldMap = {
		like: 'like_count',
		favorite: 'favorite_count'
	};

	const field = fieldMap[type];

	try {
		await articleCollection.where({ _id: article_id }).update({
			[field]: db.command.inc(-1),
			update_time: new Date()
		});

		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新统计失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/** 点赞/取消点赞（带用户去重） */
async function articleLike(event) {
	const { article_id, user_id } = event;

	if (!article_id || !user_id) {
		return { code: -1, message: '缺少参数' };
	}

	try {
		const result = await articleCollection.where({ _id: article_id }).get();
		if (result.data.length === 0) {
			return { code: -1, message: '文章不存在' };
		}

		const article = result.data[0];
		const likeUserIds = article.like_user_ids || [];
		const isLiked = likeUserIds.includes(user_id);

		if (isLiked) {
			// 取消点赞
			await articleCollection.where({ _id: article_id }).update({
				like_count: db.command.inc(-1),
				like_user_ids: db.command.pull(user_id),
				update_time: new Date()
			});
			return { code: 0, message: '已取消点赞', data: { isLiked: false } };
		} else {
			// 点赞
			await articleCollection.where({ _id: article_id }).update({
				like_count: db.command.inc(1),
				like_user_ids: db.command.push(user_id),
				update_time: new Date()
			});
			return { code: 0, message: '点赞成功', data: { isLiked: true } };
		}
	} catch (error) {
		console.error('点赞操作失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

/** 收藏/取消收藏（带用户去重） */
async function articleFavorite(event) {
	const { article_id, user_id } = event;

	if (!article_id || !user_id) {
		return { code: -1, message: '缺少参数' };
	}

	try {
		const result = await articleCollection.where({ _id: article_id }).get();
		if (result.data.length === 0) {
			return { code: -1, message: '文章不存在' };
		}

		const article = result.data[0];
		const favoriteUserIds = article.favorite_user_ids || [];
		const isFavorited = favoriteUserIds.includes(user_id);

		if (isFavorited) {
			// 取消收藏
			await articleCollection.where({ _id: article_id }).update({
				favorite_count: db.command.inc(-1),
				favorite_user_ids: db.command.pull(user_id),
				update_time: new Date()
			});
			return { code: 0, message: '已取消收藏', data: { isFavorited: false } };
		} else {
			// 收藏
			await articleCollection.where({ _id: article_id }).update({
				favorite_count: db.command.inc(1),
				favorite_user_ids: db.command.push(user_id),
				update_time: new Date()
			});
			return { code: 0, message: '收藏成功', data: { isFavorited: true } };
		}
	} catch (error) {
		console.error('收藏操作失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

/** 检查用户对文章的点赞/收藏状态 */
async function articleCheck(event) {
	const { article_id, user_id } = event;

	if (!article_id || !user_id) {
		return { code: -1, message: '缺少参数' };
	}

	try {
		const result = await articleCollection
			.where({ _id: article_id })
			.get();

		if (result.data.length === 0) {
			return { code: -1, message: '文章不存在' };
		}

		const article = result.data[0];
		const likeUserIds = article.like_user_ids || [];
		const favoriteUserIds = article.favorite_user_ids || [];

		return {
			code: 0,
			message: '获取成功',
			data: {
				isLiked: likeUserIds.includes(user_id),
				isFavorited: favoriteUserIds.includes(user_id)
			}
		};
	} catch (error) {
		console.error('检查状态失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

/**
 * 新建文章
 * 支持两种方式传入图片：
 * 1. content_images 数组（前端传入，优先使用）
 * 2. 从 content HTML 中自动提取 img 标签
 */
async function articleCreate(event) {
	const { title, category, author, summary, content, content_images, cover_image, status = 'draft', top = false } = event;

	if (!title) {
		return { code: -1, message: '标题不能为空' };
	}

	const now = Date.now();
	const plainText = (content || '').replace(/<[^>]+>/g, '');
	const wordCount = plainText.length;
	const readingTime = Math.ceil(wordCount / 300) || 1;
	const statusNum = status === 'published' ? 1 : 0;

	// 提取图片：优先用前端传的 content_images，否则从 content 中自动提取
	const images = (content_images && content_images.length > 0)
		? content_images.map((img, i) => ({
			url: img.url || '',
			alt: img.alt || '',
			sort: i
		}))
		: extractImagesFromContent(content);

	// 封面图：使用前端上传的 cover_image，不再自动从内容图片中选取
	const coverImage = cover_image || '';

	const article = {
		title,
		content: content || '',
		summary: summary || '',
		content_images: images,
		cover_image: coverImage,
		category_name: category || '',
		author_name: author || 'admin',
		author_id: 'admin',
		status: statusNum,
		is_top: !!top,
		top_level: top ? 1 : 0,
		view_count: 0,
		like_count: 0,
		comment_count: 0,
		share_count: 0,
		favorite_count: 0,
		like_user_ids: [],
		favorite_user_ids: [],
		word_count: wordCount,
		reading_time: readingTime,
		create_time: now,
		update_time: now
	};

	if (statusNum === 1) {
		article.publish_time = now;
	}

	try {
		const result = await articleCollection.add(article);
		return { code: 0, message: '创建成功', data: { id: result.id } };
	} catch (error) {
		console.error('创建文章失败:', error);
		return { code: -1, message: '创建失败' };
	}
}

/**
 * 更新文章
 * 支持两种方式传入图片：
 * 1. content_images 数组（前端传入，优先使用）
 * 2. 从 content HTML 中自动提取 img 标签
 */
async function articleUpdate(event) {
	const { article_id, title, category, author, summary, content, content_images, cover_image, status, top } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	const updateData = {};

	if (title !== undefined) updateData.title = title;
	if (content !== undefined) {
		updateData.content = content;
		const plainText = content.replace(/<[^>]+>/g, '');
		updateData.word_count = plainText.length;
		updateData.reading_time = Math.ceil(plainText.length / 300) || 1;

		// 更新图片：优先用前端传的 content_images，否则从 content 中自动提取
		const images = (content_images && content_images.length > 0)
			? content_images.map((img, i) => ({
				url: img.url || '',
				alt: img.alt || '',
				sort: i
			}))
			: extractImagesFromContent(content);

		updateData.content_images = images;
	}
	// 封面图：使用前端上传的 cover_image
	if (cover_image !== undefined) {
		updateData.cover_image = cover_image;
	}
	if (summary !== undefined) updateData.summary = summary;
	if (category !== undefined) updateData.category_name = category;
	if (author !== undefined) updateData.author_name = author;
	if (status !== undefined) {
		updateData.status = status === 'published' ? 1 : 0;
	}
	if (top !== undefined) {
		updateData.is_top = !!top;
		updateData.top_level = top ? 1 : 0;
	}

	updateData.update_time = Date.now();

	// 如果 status 从 draft 改为 published，设置 publish_time
	if (status === 'published') {
		const current = await articleCollection.where({ _id: article_id }).get();
		if (current.data.length > 0 && current.data[0].status !== 1) {
			updateData.publish_time = Date.now();
		}
	}

	try {
		await articleCollection.where({ _id: article_id }).update(updateData);
		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新文章失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/**
 * 统一切换接口（合并 togglePublish + toggleTop，减少云函数调用次数）
 * 参数：article_id, field('publish'|'top')
 * 用数据库命令直接操作，避免先查再改的两次查询
 */
async function articleToggle(event) {
	const { article_id, field } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	if (!field || !['publish', 'top'].includes(field)) {
		return { code: -1, message: 'field 参数无效，应为 publish 或 top' };
	}

	try {
		if (field === 'publish') {
			// 发布/下架切换：用条件判断直接更新，减少一次查询
			const result = await articleCollection.where({ _id: article_id }).get();
			if (result.data.length === 0) {
				return { code: -1, message: '文章不存在' };
			}
			const currentStatus = result.data[0].status;
			const isPublishing = currentStatus !== 1;
			const updateData = { update_time: Date.now() };
			if (isPublishing) {
				updateData.status = 1;
				updateData.publish_time = Date.now();
			} else {
				updateData.status = 0;
			}
			await articleCollection.where({ _id: article_id }).update(updateData);
			return { code: 0, message: isPublishing ? '已发布' : '已下架' };
		} else {
			// 置顶切换：用 inc 命令实现 toggle，但 is_top 是布尔值，
			// 仍需一次查询获取当前值。优化：用 $inc 配合 0/1 存储
			const result = await articleCollection.where({ _id: article_id }).get();
			if (result.data.length === 0) {
				return { code: -1, message: '文章不存在' };
			}
			const newIsTop = !result.data[0].is_top;
			await articleCollection.where({ _id: article_id }).update({
				is_top: newIsTop,
				top_level: newIsTop ? 1 : 0,
				update_time: Date.now()
			});
			return { code: 0, message: '操作成功' };
		}
	} catch (error) {
		console.error('切换失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

/** 删除文章（软删除），直接更新，不做前置查询 */
async function articleDelete(event) {
	const { article_id } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	try {
		const updateRes = await articleCollection.where({ _id: article_id }).update({
			status: 2,
			delete_time: Date.now()
		});

		if (updateRes.updated === 0) {
			return { code: -1, message: '文章不存在' };
		}

		return { code: 0, message: '删除成功' };
	} catch (error) {
		console.error('删除文章失败:', error);
		return { code: -1, message: '删除失败' };
	}
}

// ==================== ranking 模块：当日蹲坑排行榜 ====================
// action: get

async function rankingModule(event, context) {
	const { action = 'get' } = event;

	switch (action) {
		case 'get':
			return await rankingGet(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get' };
	}
}

/** 获取当日排行榜（按排便总时长排名） */
async function rankingGet(event) {
	const { userId, size = 10 } = event;

	// 计算今天的时间范围（本地时区 UTC+8）
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	const todayStart = new Date(Date.UTC(beijingTime.getUTCFullYear(), beijingTime.getUTCMonth(), beijingTime.getUTCDate()));
	const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

	const DEFAULT_AVATAR = 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg';

	try {
		// 先尝试聚合查询
		let rankedList = [];
		try {
			const aggregateRes = await recordsCollection
				.aggregate()
				.match({
					created_at: {
						$gte: todayStart,
						$lte: todayEnd
					},
					duration: {
						$gt: 0
					}
				})
				.group({
					_id: '$user_id',
					total_duration: { $sum: '$duration' },
					record_count: { $sum: 1 }
				})
				.sort({ total_duration: -1 })
				.limit(100)
				.end();

			rankedList = aggregateRes.data || [];
		} catch (aggError) {
			console.warn('聚合查询失败，降级为普通查询:', aggError.message);

			// 降级：普通查询 + JS 手动分组
			const todayRecords = await recordsCollection
				.where({
					created_at: db.command.gte(todayStart).and(db.command.lte(todayEnd)),
					duration: db.command.gt(0)
				})
				.limit(1000)
				.get();

			const groupMap = {};
			todayRecords.data.forEach(record => {
				const uid = record.user_id;
				if (!groupMap[uid]) {
					groupMap[uid] = { _id: uid, total_duration: 0, record_count: 0 };
				}
				groupMap[uid].total_duration += (record.duration || 0);
				groupMap[uid].record_count += 1;
			});

			rankedList = Object.values(groupMap).sort((a, b) => b.total_duration - a.total_duration);
		}

		if (rankedList.length === 0) {
			return {
				code: 0,
				message: '暂无排行数据',
				data: {
					leaderboard: [],
					myRank: userId ? { rank: 0, name: '我', time: '00:00', avatar: '', total_duration: 0 } : null
				}
			};
		}

		// 取排名前 size 名的 user_id
		const topUserIds = rankedList.slice(0, size).map(item => item._id);

		// 查询用户昵称和头像
		const usersRes = await usersCollection
			.where({ _id: db.command.in(topUserIds) })
			.get();

		const userMap = {};
		/* 云存储头像 fileID 转成可访问的临时地址 */
		const avatarFileIds = [...new Set(
			usersRes.data
				.map(u => u.avatar_url)
				.filter(url => typeof url === 'string' && url.startsWith('cloud://'))
		)];
		const avatarMap = {};
		if (avatarFileIds.length > 0) {
			try {
				const tempRes = await uniCloud.getTempFileURL({ fileList: avatarFileIds });
				(tempRes.fileList || []).forEach(file => {
					if (file.fileID && file.tempFileURL) avatarMap[file.fileID] = file.tempFileURL;
				});
			} catch (e) {
				console.warn('[ranking] 头像地址转换失败:', e.message);
			}
		}

		usersRes.data.forEach(u => {
			userMap[u._id] = {
				name: u.nickname || '匿名用户',
				avatar: avatarMap[u.avatar_url] || u.avatar_url || DEFAULT_AVATAR
			};
		});

		// 构建排行榜
		const leaderboard = rankedList.slice(0, size).map((item, index) => {
			const userInfo = userMap[item._id] || { name: '匿名用户', avatar: DEFAULT_AVATAR };
			return {
				rank: index + 1,
				user_id: item._id,
				name: userInfo.name,
				avatar: userInfo.avatar,
				time: formatDuration(item.total_duration),
				total_duration: item.total_duration,
				record_count: item.record_count
			};
		});

		// 查找当前用户排名
		let myRank = null;
		if (userId) {
			const myIndex = rankedList.findIndex(item => item._id === userId);
			if (myIndex >= 0) {
				const myData = rankedList[myIndex];
				const userInfo = userMap[userId] || { name: '我', avatar: DEFAULT_AVATAR };
				myRank = {
					rank: myIndex + 1,
					name: userInfo.name,
					avatar: userInfo.avatar,
					time: formatDuration(myData.total_duration),
					total_duration: myData.total_duration,
					record_count: myData.record_count
				};
			} else {
				const userInfo = userMap[userId] || { name: '我', avatar: DEFAULT_AVATAR };
				myRank = {
					rank: 0,
					name: userInfo.name,
					avatar: userInfo.avatar,
					time: '00:00',
					total_duration: 0,
					record_count: 0
				};
			}
		}

		return {
			code: 0,
			message: '获取成功',
			data: {
				leaderboard,
				myRank,
				total_users: rankedList.length
			}
		};
	} catch (error) {
		console.error('获取排行失败:', error.message, error.stack);
		return { code: -1, message: '获取排行失败: ' + (error.message || JSON.stringify(error)) };
	}
}

// ==================== config 模块：应用配置管理 ====================
// action: get, update

async function configModule(event, context) {
	const { action } = event;

	switch (action) {
		case 'get':
			return await configGet(event);
		case 'update':
			return await configUpdate(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、update' };
	}
}

/** 获取全局应用配置（客户端启动时调用，读取 batch_interval 等参数） */
async function configGet(event) {
	try {
		const res = await configCollection.doc('sync_config').get();

		if (res.data && res.data.length > 0) {
			return {
				code: 0,
				data: res.data[0]
			};
		}

		// 没有配置文档则返回默认值
		return {
			code: 0,
			data: {
				batch_interval: 600,
				batch_enabled: true,
				ai_provider: 'deepseek',
				ai_api_url: 'https://api.deepseek.com/v1/chat/completions',
				ai_api_key: '',
				ai_model: 'deepseek-chat',
				rankingMarqueeText: '',
				cooperationTitle: '',
				cooperationDesc: '',
				wechatService: '',
				contactPhone: '',
				contactEmail: '',
				companyPhilosophy: ''
			}
		};
	} catch (error) {
		console.error('获取配置失败:', error);
		return {
			code: -1,
			message: '获取配置失败',
			data: {
				batch_interval: 600,
				batch_enabled: true,
				ai_provider: 'deepseek',
				ai_api_url: 'https://api.deepseek.com/v1/chat/completions',
				ai_api_key: '',
				ai_model: 'deepseek-chat',
				rankingMarqueeText: '',
				cooperationTitle: '',
				cooperationDesc: '',
				wechatService: '',
				contactPhone: '',
				contactEmail: '',
				companyPhilosophy: ''
			}
		};
	}
}

/** 更新应用配置（供后台管理页面调用） */
async function configUpdate(event) {
	const { batch_interval, batch_enabled, ai_provider, ai_api_url, ai_api_key, ai_model } = event;

	if (batch_interval !== undefined && (typeof batch_interval !== 'number' || batch_interval < 30)) {
		return { code: -1, message: '同步间隔不能少于 30 秒' };
	}

	try {
		const updateData = { updated_at: new Date() };

		if (batch_interval !== undefined) updateData.batch_interval = batch_interval;
		if (batch_enabled !== undefined) updateData.batch_enabled = batch_enabled;
		if (ai_provider !== undefined) updateData.ai_provider = ai_provider;
		if (ai_api_url !== undefined) updateData.ai_api_url = ai_api_url;
		if (ai_api_key !== undefined) updateData.ai_api_key = ai_api_key;
		if (ai_model !== undefined) updateData.ai_model = ai_model;

		await configCollection.doc('sync_config').set(updateData);

		return {
			code: 0,
			message: '配置更新成功',
			data: updateData
		};
	} catch (error) {
		console.error('更新配置失败:', error);
		return { code: -1, message: '更新配置失败' };
	}
}

// ==================== auth 模块：认证管理 ====================
// action: email-login, email-register, wechat-login, bind-account

async function authModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'email-login':
			return await authEmailLogin(event, context);
		case 'email-register':
			return await authEmailRegister(event, context);
		case 'wechat-login':
			return await authWechatLogin(event, context);
		case 'bind-account':
			return await authBindAccount(event, context);
		default:
			return { code: -1, message: '不支持的操作类型，支持：email-login、email-register、wechat-login、bind-account' };
	}
}

/** 邮箱密码登录（验证邮箱和密码，返回JWT token和用户信息） */
async function authEmailLogin(event, context) {
	const { email, password } = event;

	if (!email) {
		return { code: -1, message: '请输入邮箱地址' };
	}

	if (!password) {
		return { code: -1, message: '请输入密码' };
	}

	const userResult = await usersCollection.where({ email }).get();
	if (userResult.data.length === 0) {
		return { code: -1, message: '邮箱或密码错误' };
	}

	const user = userResult.data[0];

	if (!user.email_password) {
		return { code: -1, message: '该账号未设置密码，请通过其他方式登录' };
	}

	if (!bcrypt.compareSync(password, user.email_password)) {
		return { code: -1, message: '邮箱或密码错误' };
	}

	/* 先检查封禁状态：被封禁则返回封禁公告信息（优先于 status 检查） */
	console.log('[login] 邮箱登录开始检查封禁状态, userId:', user._id);
	const banInfo = await checkUserBanStatus(user._id);
	console.log('[login] 邮箱登录封禁检查结果:', banInfo ? '被封禁' : '未封禁');
	if (banInfo) {
		return {
			code: -2,
			message: '账号已被封禁',
			data: { ban: banInfo }
		};
	}

	if (user.status !== 1) {
		console.log('[login] 邮箱登录: 账号已被禁用, status:', user.status);
		return { code: -1, message: '账号已被禁用' };
	}

	const token = generateJWTToken(user._id);

	return {
		code: 0,
		message: '登录成功',
		data: {
			token,
			user: {
				_id: user._id,
				nickname: user.nickname || '',
				name: user.name || '',
				avatar_url: user.avatar_url || '',
				is_member: user.is_member,
				email: user.email,
				phone: user.phone || '',
				birthday: user.birthday || '',
				gender: user.gender || '',
				wechat_openid: user.wechat_openid || ''
			}
		}
	};
}

/** 邮箱注册新账号（自动生成昵称，密码需6位以上） */
async function authEmailRegister(event, context) {
	const { email, password, confirmPassword, phone, birthday, gender } = event;

	if (!email) {
		return { code: -1, message: '请输入邮箱地址' };
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return { code: -1, message: '请输入正确的邮箱格式' };
	}

	if (!password) {
		return { code: -1, message: '请输入密码' };
	}

	if (password.length < 6) {
		return { code: -1, message: '密码至少需要6位' };
	}

	if (password !== confirmPassword) {
		return { code: -1, message: '两次输入的密码不一致' };
	}

	const existingUser = await usersCollection.where({ email }).get();
	if (existingUser.data.length > 0) {
		return { code: -1, message: '该邮箱已被注册' };
	}

	const passwordHash = bcrypt.hashSync(password, 10);
	const nickname = email.split('@')[0];

	const userData = {
		email,
		email_password: passwordHash,
		nickname: nickname,
		is_member: 0,
		status: 1,
		created_at: new Date(),
		updated_at: new Date()
	};

	if (phone) {
		userData.phone = phone;
	}

	if (birthday) {
		userData.birthday = birthday;
	}

	if (gender) {
		userData.gender = gender;
	}

	const result = await usersCollection.add(userData);

	const token = generateJWTToken(result._id);

	return {
		code: 0,
		message: '注册成功',
		data: {
			token,
			user: {
				_id: result._id,
				nickname: nickname,
				name: '',
				avatar_url: '',
				is_member: 0,
				email: email,
				phone: phone || '',
				birthday: birthday || '',
				gender: gender || '',
				wechat_openid: null
			}
		}
	};
}

/** 微信小程序授权登录（通过wx.login获取code换取openid，自动创建或查找用户） */
async function authWechatLogin(event, context) {
	const { code } = event;

	if (!code) {
		return { code: -1, message: '缺少登录凭证' };
	}

	try {
		const wxResult = await uniCloud.httpclient.request(
			"https://api.weixin.qq.com/sns/jscode2session",
			{
				method: "GET",
				data: {
					appid: "wxdb04f8f1e3fe00bb",
					secret: "",
					js_code: code,
					grant_type: "authorization_code"
				},
				dataType: "json"
			}
		);

		console.log("微信接口返回：", wxResult.data);

		if (!wxResult.data) {
			return { code: -1, message: "微信授权接口异常" };
		}

		// 微信返回错误
		if (wxResult.data.errcode) {
			return {
				code: -1,
				message: "授权失败：" + wxResult.data.errmsg
			};
		}

		const { openid, session_key } = wxResult.data;

		if (!openid) {
			return { code: -1, message: "获取 openid 失败" };
		}

		// 查询用户
		let userRes = await usersCollection.where({ wechat_openid: openid }).get();
		const token = generateRandomToken();

		// 已有用户
		if (userRes.data && userRes.data.length > 0) {
			const user = userRes.data[0];

			/* 检查封禁状态：被封禁则拒绝登录并返回封禁公告信息 */
			console.log('[login] 微信登录开始检查封禁状态, userId:', user._id);
			const banInfo = await checkUserBanStatus(user._id);
			console.log('[login] 微信登录封禁检查结果:', banInfo ? '被封禁' : '未封禁');
			if (banInfo) {
				return {
					code: -2,
					message: '账号已被封禁',
					data: { ban: banInfo }
				};
			}

			await usersCollection.doc(user._id).update({
				last_login_at: new Date()
			});

			return {
				code: 0,
				message: "登录成功",
				data: {
					token,
					user: {
						_id: user._id,
						nickname: user.nickname || "微信用户",
						avatar_url: user.avatar_url || "",
						phone: user.phone || "",
						email: user.email || "",
						gender: user.gender || "",
						birthday: user.birthday || "",
						name: user.name || ""
					}
				}
			};
		}

		// 新用户
		const newUser = await usersCollection.add({
			wechat_openid: openid,
			session_key: session_key,
			nickname: "微信用户",
			avatar_url: "",
			phone: "",
			email: "",
			gender: "",
			birthday: "",
			name: "",
			created_at: new Date(),
			last_login_at: new Date()
		});

		return {
			code: 0,
			message: "登录成功",
			data: {
				token,
				user: {
					_id: newUser.id,
					nickname: "微信用户",
					avatar_url: ""
				}
			}
		};

	} catch (error) {
		console.error("云函数崩溃：", error);
		return {
			code: -1,
			message: "服务器异常：" + (error.message || "未知错误")
		};
	}
}

/** 绑定第三方账号（邮箱/手机/微信）到现有用户账户 */
async function authBindAccount(event, context) {
	const { userId, bindType, bindValue, password } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	if (!bindType || !bindValue) {
		return { code: -1, message: '绑定类型和绑定值不能为空' };
	}

	let updateData = { updated_at: new Date() };

	if (bindType === 'email') {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindValue)) {
			return { code: -1, message: '请输入正确的邮箱格式' };
		}

		const existingUser = await usersCollection.where({
			email: bindValue,
			_id: _.neq(userId)
		}).get();

		if (existingUser.data.length > 0) {
			return { code: -1, message: '该邮箱已被其他账号绑定' };
		}

		updateData.email = bindValue;
		if (password) {
			updateData.email_password = bcrypt.hashSync(password, 10);
		}

	} else if (bindType === 'phone') {
		if (!/^1[3-9]\d{9}$/.test(bindValue)) {
			return { code: -1, message: '请输入正确的手机号格式' };
		}

		const existingUser = await usersCollection.where({
			phone: bindValue,
			_id: _.neq(userId)
		}).get();

		if (existingUser.data.length > 0) {
			return { code: -1, message: '该手机号已被其他账号绑定' };
		}

		updateData.phone = bindValue;

	} else if (bindType === 'wechat') {
		if (!bindValue || bindValue.length < 10) {
			return { code: -1, message: '请输入有效的微信OpenID' };
		}

		const existingUser = await usersCollection.where({
			wechat_openid: bindValue,
			_id: _.neq(userId)
		}).get();

		if (existingUser.data.length > 0) {
			return { code: -1, message: '该微信账号已被其他账号绑定' };
		}

		updateData.wechat_openid = bindValue;

	} else {
		return { code: -1, message: '不支持的绑定类型，支持：email、phone、wechat' };
	}

	const currentUser = await usersCollection.doc(userId).get();
	if (currentUser.data.length === 0) {
		return { code: -1, message: '用户不存在' };
	}

	await usersCollection.doc(userId).update(updateData);

	return {
		code: 0,
		message: '绑定成功',
		data: { bindType, bindValue }
	};
}

// ==================== sync 模块：批量同步 ====================
// action: batch

async function syncModule(event, context) {
	const { action } = event;

	switch (action) {
		case 'batch':
			return await syncBatch(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：batch' };
	}
}

/**
 * 批量同步（客户端累积一批操作后统一处理）
 * 支持的动作类型：view_article, like_article, unlike_article, share_article, favorite_article, unfavorite_article
 * 按 article_id 聚合增量，同一篇文章的同类操作合并为一次 update
 */
async function syncBatch(event) {
	const { actions } = event;

	if (!actions || !Array.isArray(actions) || actions.length === 0) {
		return { code: 0, message: '无待处理动作' };
	}

	console.log(`batch-sync 收到 ${actions.length} 条动作`);

	const startTime = Date.now();

	// 按 article_id 聚合增量，同一篇文章的同类操作合并为一次 update
	const articleBulks = {}; // { article_id: { view: N, like: N, share: N, favorite: N } }

	for (const action of actions) {
		if (action.type === 'view_article' && action.data?.article_id) {
			const id = action.data.article_id;
			if (!articleBulks[id]) articleBulks[id] = { view: 0, like: 0, share: 0, favorite: 0 };
			articleBulks[id].view += 1;
		} else if (action.type === 'like_article' && action.data?.article_id) {
			const id = action.data.article_id;
			if (!articleBulks[id]) articleBulks[id] = { view: 0, like: 0, share: 0, favorite: 0 };
			articleBulks[id].like += 1;
		} else if (action.type === 'unlike_article' && action.data?.article_id) {
			const id = action.data.article_id;
			if (!articleBulks[id]) articleBulks[id] = { view: 0, like: 0, share: 0, favorite: 0 };
			articleBulks[id].like -= 1;
		} else if (action.type === 'share_article' && action.data?.article_id) {
			const id = action.data.article_id;
			if (!articleBulks[id]) articleBulks[id] = { view: 0, like: 0, share: 0, favorite: 0 };
			articleBulks[id].share += 1;
		} else if (action.type === 'favorite_article' && action.data?.article_id) {
			const id = action.data.article_id;
			if (!articleBulks[id]) articleBulks[id] = { view: 0, like: 0, share: 0, favorite: 0 };
			articleBulks[id].favorite += 1;
		} else if (action.type === 'unfavorite_article' && action.data?.article_id) {
			const id = action.data.article_id;
			if (!articleBulks[id]) articleBulks[id] = { view: 0, like: 0, share: 0, favorite: 0 };
			articleBulks[id].favorite -= 1;
		}
	}

	// 批量更新 article 表
	const articleIds = Object.keys(articleBulks);
	let updatedCount = 0;

	for (const articleId of articleIds) {
		const bulk = articleBulks[articleId];
		const updateData = {};

		if (bulk.view !== 0) updateData.view_count = db.command.inc(bulk.view);
		if (bulk.like !== 0) updateData.like_count = db.command.inc(bulk.like);
		if (bulk.share !== 0) updateData.share_count = db.command.inc(bulk.share);
		if (bulk.favorite !== 0) updateData.favorite_count = db.command.inc(bulk.favorite);

		try {
			await articleCollection.doc(articleId).update(updateData);
			updatedCount++;
		} catch (error) {
			console.error(`更新文章 ${articleId} 失败:`, error);
		}
	}

	const elapsed = Date.now() - startTime;

	return {
		code: 0,
		message: `批量同步完成: ${actions.length}条动作, 更新${updatedCount}篇文章, 耗时${elapsed}ms`,
		data: {
			total: actions.length,
			updatedArticles: updatedCount
		}
	};
}

// ==================== ai 模块：AI肠道健康分析 ====================
// action: get, check, test

async function aiModule(event, context) {
	const { action = 'get' } = event;

	switch (action) {
		case 'get':
			return await aiGetReport(event);
		case 'chat':
			return await aiChat(event);
		case 'getTrend':
			return await aiGetTrend(event);
		case 'check':
			return await aiCheckReport(event);
		case 'test':
			return await aiTestConnection(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、chat、getTrend、check、test' };
	}
}

/**
 * AI 健康助手对话
 * 识别用户意图并返回 { reply, action }，由客户端执行记录、提醒、播报等动作
 * action.type: add_record | add_reminder | broadcast_analysis | open_report | none
 */
async function aiChat(event) {
	const { userId, message } = event;
	const history = Array.isArray(event.history) ? event.history.slice(-8) : [];

	if (!userId) return { code: -1, message: '用户ID不能为空' };
	if (!message) return { code: -1, message: '消息不能为空' };

	/* 1. 读取用户资料与绑定设备 */
	let user = {};
	try {
		const userRes = await usersCollection.doc(userId).get();
		user = (userRes.data && userRes.data[0]) || {};
	} catch (e) {
		console.warn('[ai-chat] 读取用户失败:', e.message);
	}
	const devices = user.devices || [];

	/* 读取华为运动健康同步数据 */
	let healthMetrics = null;
	try {
		const hm = await healthMetricsCollection
			.where({ user_id: userId, provider: 'huawei' })
			.orderBy('date', 'desc')
			.limit(1)
			.get();
		healthMetrics = (hm.data && hm.data[0]) || null;
	} catch (e) {
		console.warn('[ai-chat] 读取健康数据失败:', e.message);
	}
	const wearableDevices = healthMetrics
		? healthMetricsToDevices(healthMetrics).concat(devices)
		: devices;

	/* 2. 读取最近 14 天记录 */
	let records = [];
	try {
		const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
		const recordsRes = await recordsCollection
			.where({ user_id: userId, created_at: db.command.gte(since) })
			.orderBy('created_at', 'desc')
			.limit(30)
			.get();
		records = recordsRes.data || [];
	} catch (e) {
		console.warn('[ai-chat] 读取记录失败:', e.message);
	}

	/* 3. 读取今日已有报告（如已生成） */
	let todayReport = null;
	try {
		const reportRes = await reportsCollection
			.where({ user_id: userId, report_date: getBeijingDateStr() })
			.orderBy('created_at', 'desc')
			.limit(1)
			.get();
		todayReport = (reportRes.data && reportRes.data[0]) || null;
	} catch (e) {
		console.warn('[ai-chat] 读取报告失败:', e.message);
	}

	/* 4. 组装上下文 */
	const typeMap = { 1: '硬球状', 2: '凹凸肠状', 3: '裂纹肠状', 4: '光滑香肠状', 5: '柔软块状', 6: '糊状', 7: '水样' };
	const feelingMap = { smooth: '顺畅', effortful: '费力', diarrhea: '腹泻感' };
	const recordLines = records.slice(0, 15).map(r => {
		const d = new Date(r.created_at);
		let line = `${d.getMonth() + 1}月${d.getDate()}日 类型${typeMap[parseInt(r.type)] || r.type}`;
		if (r.feeling) line += ` ${feelingMap[r.feeling] || r.feeling}`;
		if (r.duration) line += ` 耗时${r.duration}秒`;
		if (r.water) line += ` 饮水${r.water}ml`;
		if (r.fiber) line += ` 纤维${r.fiber}g`;
		if (r.note) line += ` 备注:${r.note}`;
		return line;
	}).join('\n');

	const genderMap = { male: '男', female: '女' };
	const profileLine = [
		user.nickname ? `昵称:${user.nickname}` : '',
		user.gender ? `性别:${genderMap[user.gender] || user.gender}` : '',
		user.birthday ? `生日:${user.birthday}` : ''
	].filter(Boolean).join(' ');

	const deviceSummary = formatDeviceSummary(wearableDevices);
	const reportLine = todayReport
		? `今日评分:${todayReport.score || 0}/100，总结:${(todayReport.ai_summary || '').substring(0, 120)}`
		: '今日报告尚未生成';

	const contextPrompt = `【用户资料】${profileLine || '暂无'}\n【绑定设备】${deviceSummary || '未绑定'}\n【最近14天记录】\n${recordLines || '暂无记录'}\n【今日报告】${reportLine}`;

	/* 5. 调用大模型识别意图 */
	const systemPrompt = `你是「肠健康」小程序内的 AI 健康助手（Agent），可以用自然语言帮用户完成小程序操作。

请判断用户意图，返回严格 JSON（不要 markdown 标记）：
{
  "reply": "给用户的中文回复，简洁有温度，120字以内",
  "action": { "type": "动作类型", "payload": {} }
}

可用动作：
1. add_record —— 用户要记录排便。payload:
   {"type":1-7,"feeling":"smooth|effortful|diarrhea","duration":秒,"water":毫升,"fiber":克,"note":"","color":"棕色","isMenstruation":false}
   布里斯托类型：1硬球状 2凹凸肠状 3裂纹肠状 4光滑香肠状 5柔软块状 6糊状 7水样。
   用户没说类型时默认 4，没说感受时默认 smooth，没说时长默认 0；时长统一换算为秒。
2. add_reminder —— 用户要每日提醒。payload: {"time":"HH:mm"}（24小时制并补零）
3. broadcast_analysis —— 用户要查看/解读每日或本周分析。payload: {"period":"week"}（也可 day），客户端以文字展示分析内容。
4. open_report —— 用户要打开报告页。payload: {"period":"week|month|year"}
5. none —— 健康问答、闲聊或信息不足。payload: {}

规则：
- 只依据下方上下文回答，不要编造记录或设备数据。
- 有绑定设备数据时，结合心率、血氧、睡眠、步数、压力等指标解释对肠道的影响。
- reply 用口语化中文，不要罗列 JSON 字段。
- 只返回 JSON。`;

	const aiConfig = { ...(await getAIConfig()), api_key: DEFAULT_AI_CONFIG.api_key };
	const messages = [
		{ role: 'system', content: systemPrompt },
		{ role: 'system', content: contextPrompt }
	];
	history.forEach(h => {
		if (!h || !h.content) return;
		messages.push({
			role: h.role === 'assistant' ? 'assistant' : 'user',
			content: String(h.content).substring(0, 300)
		});
	});
	messages.push({ role: 'user', content: message });

	const response = await uniCloud.httpclient.request(aiConfig.api_url, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${aiConfig.api_key}`,
			'Content-Type': 'application/json'
		},
		data: {
			model: aiConfig.model,
			messages,
			response_format: { type: 'json_object' },
			temperature: 0.4,
			max_tokens: 800
		},
		timeout: 25000,
		dataType: 'json'
	});

	if (response.status !== 200 || !response.data || !response.data.choices) {
		console.error('[ai-chat] 模型返回异常:', response.status, JSON.stringify(response.data).substring(0, 200));
		return { code: -1, message: 'AI 助手暂时不可用，请稍后再试' };
	}

	const content = response.data.choices[0].message.content;
	let parsed;
	try {
		parsed = JSON.parse(content);
	} catch (e) {
		parsed = { reply: content, action: { type: 'none', payload: {} } };
	}

	return {
		code: 0,
		message: '对话成功',
		data: {
			reply: parsed.reply || content,
			action: parsed.action || { type: 'none', payload: {} },
			boundDevices: devices.length
		}
	};
}

/** 测试AI连接是否正常 */
async function aiTestConnection(event) {
	try {
		const aiConfig = await getAIConfig();
		console.log('[ai] 测试连接，模型:', aiConfig.model);

		const response = await uniCloud.httpclient.request(aiConfig.api_url, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${aiConfig.api_key}`,
				'Content-Type': 'application/json'
			},
			data: {
				model: aiConfig.model,
				messages: [
					{ role: 'user', content: '请回复"连接成功"' }
				],
				max_tokens: 50,
				temperature: 0
			},
			timeout: 15000,
			dataType: 'json'
		});

		if (response.status === 200 && response.data && response.data.choices) {
			const reply = response.data.choices[0].message.content;
			return {
				code: 0,
				message: '连接成功',
				data: { model: aiConfig.model, reply: reply.substring(0, 100) }
			};
		} else {
			return {
				code: -1,
				message: `API返回异常: ${response.status} ${JSON.stringify(response.data).substring(0, 200)}`
			};
		}
	} catch (e) {
		console.error('[ai] 测试连接失败:', e.message);
		return { code: -1, message: '连接失败: ' + e.message };
	}
}

/**
 * 获取或生成今日AI报告
 * 逻辑：
 * 1. 查 ai_reports 表中今日是否已有该用户指定周期的报告
 * 2. 有 → 直接返回（不重复生成）
 * 3. 无 → 拉取对应周期排便记录，调用 DeepSeek API 生成报告，存库后返回
 * @param {string} event.period - 分析周期：week(默认)/month/day/year
 */
async function aiGetReport(event) {
	const { userId } = event;
	const period = event.period || 'week';

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	const todayStr = getBeijingDateStr();
	console.log('[ai] 今日:', todayStr, 'userId:', userId, '周期:', period);

	// 1. 查今日是否已有该周期的报告
	try {
		console.log('[ai] 步骤1: 查询今日缓存报告, 周期:', period);
		const existing = await reportsCollection
			.where({ user_id: userId, report_date: todayStr, period: period })
			.orderBy('created_at', 'desc')
			.limit(1)
			.get();

		if (existing.data && existing.data.length > 0) {
			console.log('[ai] 今日该周期报告已存在，直接返回缓存');
			return {
				code: 0,
				message: '获取成功（缓存）',
				data: formatReport(existing.data[0])
			};
		}
	} catch (e) {
		console.warn('[ai] 查询现有报告失败:', e.message);
	}

	// 2. 根据周期获取时间范围并拉取记录
	const timeRange = getPeriodTimeRange(period);
	const rangeStart = timeRange.start;
	const rangeEnd = timeRange.end;
	console.log('[ai] 步骤2: 拉取记录, 周期:', period, rangeStart, rangeEnd);

	let periodRecords = [];
	try {
		const recordsRes = await recordsCollection
			.where({
				user_id: userId,
				created_at: db.command.gte(rangeStart).and(db.command.lte(rangeEnd))
			})
			.orderBy('created_at', 'asc')
			.get();
		periodRecords = recordsRes.data || [];
	} catch (e) {
		console.error('[ai] 查询记录失败:', e.message);
	}

	console.log('[ai] 本周期记录数:', periodRecords.length);

	// 3. 计算周期数据（非AI部分）
	const periodData = calculatePeriodData(periodRecords, period, timeRange);
	// 根据周期计算天数：周=7，月=当月天数，日=1
	const periodDays = getPeriodDays(period, timeRange);
	const averageFrequency = periodRecords.length > 0
		? Math.round((periodRecords.length / periodDays) * 100) / 100
		: 0;
	const qualifiedDays = periodData.filter(d => d.value >= 60).length;
	const score = calculateOverallScore(periodData);

	// 4. 计算趋势和排名
	const scoreTrend = await calculateTrend(userId, score, rangeStart);
	const userRanking = await calculateRanking(userId, score);

	// 5. 读取用户绑定的手环设备，让 AI 分析结合可穿戴数据
	let devices = [];
	try {
		const userRes = await usersCollection.doc(userId).get();
		devices = (userRes.data && userRes.data[0] && userRes.data[0].devices) || [];
	} catch (e) {
		console.warn('[ai] 读取绑定设备失败:', e.message);
	}

	// 5.1 读取华为运动健康最近一次同步数据
	let healthMetrics = null;
	try {
		const hm = await healthMetricsCollection
			.where({ user_id: userId, provider: 'huawei' })
			.orderBy('date', 'desc')
			.limit(1)
			.get();
		healthMetrics = (hm.data && hm.data[0]) || null;
	} catch (e) {
		console.warn('[ai] 读取华为健康数据失败:', e.message);
	}
	if (healthMetrics) {
		devices = healthMetricsToDevices(healthMetrics).concat(devices);
	}

	// 6. 调用 DeepSeek API 生成 AI 部分
	let aiResult;
	if (periodRecords.length === 0) {
		// 无数据时使用默认报告
		console.log('[ai] 步骤5: 无记录，使用默认报告');
		aiResult = getDefaultAIResult();
	} else {
		try {
			console.log('[ai] 步骤5: 调用 DeepSeek 生成报告');
			aiResult = await callDeepSeek(periodRecords, periodData, score, period, rangeStart, rangeEnd, averageFrequency, qualifiedDays, periodDays, devices);
		} catch (e) {
			console.error('[ai] DeepSeek调用失败:', e.message);
			aiResult = getDefaultAIResult();
		}
	}

	// 6. 组装报告
	const report = {
		user_id: userId,
		report_date: todayStr,
		period: period,
		week_start: formatDateStr(rangeStart),
		week_end: formatDateStr(rangeEnd),
		score: score,
		weekly_data: periodData,
		average_frequency: averageFrequency,
		qualified_days: qualifiedDays,
		score_trend: scoreTrend,
		user_ranking: userRanking,
		ai_summary: aiResult.aiSummary,
		ai_summary_tags: aiResult.aiSummaryTags,
		metrics: aiResult.metrics,
		tips: aiResult.tips,
		created_at: new Date()
	};

	// 7. 存库
	try {
		await reportsCollection.add(report);
		console.log('[ai] 报告已存库, 周期:', period);
	} catch (e) {
		console.error('[ai] 存库失败:', e.message);
	}

	return {
		code: 0,
		message: '报告生成成功',
		data: formatReport(report)
	};
}

/** 检查今日是否已有报告 */
async function aiCheckReport(event) {
	const { userId } = event;
	if (!userId) return { code: -1, message: '用户ID不能为空' };

	const todayStr = getBeijingDateStr();
	try {
		const existing = await reportsCollection
			.where({ user_id: userId, report_date: todayStr })
			.count();
		return {
			code: 0,
			data: { hasReport: existing.total > 0 }
		};
	} catch (e) {
		return { code: 0, data: { hasReport: false } };
	}
}

/**
 * 获取趋势分析数据（支持周/月/年周期）
 * @param {string} event.period - 周期：week(默认)/month/year
 * @returns {{code: number, data: {weeklyData: Array}}}
 */
async function aiGetTrend(event) {
	const { userId } = event;
	const period = event.period || 'week';

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	// 根据周期获取时间范围
	const timeRange = getPeriodTimeRange(period);
	console.log('[ai-trend] 周期:', period, '范围:', timeRange.start, '~', timeRange.end);

	// 拉取记录
	let records = [];
	try {
		const recordsRes = await recordsCollection
			.where({
				user_id: userId,
				created_at: db.command.gte(timeRange.start).and(db.command.lte(timeRange.end))
			})
			.orderBy('created_at', 'asc')
			.get();
		records = recordsRes.data || [];
	} catch (e) {
		console.error('[ai-trend] 查询记录失败:', e.message);
	}

	console.log('[ai-trend] 记录数:', records.length);

	// 按周期分组统计
	let trendData = [];
	if (period === 'week') {
		trendData = calculateWeeklyData(records);
	} else if (period === 'month') {
		trendData = calculateMonthlyTrend(records, timeRange);
	} else if (period === 'year') {
		trendData = calculateYearlyTrend(records, timeRange);
	}

	return { code: 0, data: { weeklyData: trendData } };
}

// ==================== AI 周数据计算 ====================

/** 计算每日健康评分（基于布里斯托分类和排便感受） */
function calculateWeeklyData(records) {
	const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
	const { weekStart } = getWeekRange();
	const result = [];

	for (let i = 0; i < 7; i++) {
		const dayDate = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
		const dayStr = formatDateStr(dayDate);
		const dayRecords = records.filter(r => {
			const recordDate = new Date(r.created_at);
			return formatDateStr(recordDate) === dayStr;
		});

		const dayValue = dayRecords.length > 0
			? Math.round(dayRecords.reduce((sum, r) => sum + getRecordScore(r), 0) / dayRecords.length)
			: 0;

		result.push({
			day: dayNames[i],
			value: dayValue,
			fullDate: `${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`
		});
	}

	return result;
}

/**
 * 根据周期类型计算数据（AI报告使用，支持 week/month/day）
 * @param {Array} records - 排便记录
 * @param {string} period - 周期
 * @param {{start: Date, end: Date}} timeRange - 时间范围
 * @returns {Array<{day: string, value: number, fullDate: string}>}
 */
function calculatePeriodData(records, period, timeRange) {
	if (period === 'month') {
		return calculateMonthlyTrend(records, timeRange);
	} else if (period === 'year') {
		// 年度：按月分组，从1月到昨天所在月
		return calculateYearlyTrend(records, timeRange);
	} else if (period === 'day') {
		// 日度：仅返回昨天单条数据
		const dayValue = records.length > 0
			? Math.round(records.reduce((sum, r) => sum + getRecordScore(r), 0) / records.length)
			: 0;
		const d = timeRange.start;
		return [{
			day: '昨日',
			value: dayValue,
			fullDate: `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
		}];
	}
	// 默认 week
	return calculateWeeklyData(records);
}

/**
 * 计算月度趋势数据（按天分组，从月初到昨天）
 * @param {Array} records - 排便记录
 * @param {{start: Date, end: Date}} timeRange - 时间范围
 * @returns {Array<{day: string, value: number, fullDate: string}>}
 */
function calculateMonthlyTrend(records, timeRange) {
	const result = [];
	const cursor = new Date(timeRange.start);
	const end = new Date(timeRange.end);

	while (cursor.getTime() <= end.getTime()) {
		const dayStr = formatDateStr(cursor);
		const dayRecords = records.filter(r => {
			const recordDate = new Date(r.created_at);
			return formatDateStr(recordDate) === dayStr;
		});

		const dayValue = dayRecords.length > 0
			? Math.round(dayRecords.reduce((sum, r) => sum + getRecordScore(r), 0) / dayRecords.length)
			: 0;

		result.push({
			day: String(cursor.getUTCDate()),
			value: dayValue,
			fullDate: `${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`
		});

		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}

	return result;
}

/**
 * 计算年度趋势数据（按月分组，12个月）
 * @param {Array} records - 排便记录
 * @param {{start: Date, end: Date}} timeRange - 时间范围
 * @returns {Array<{day: string, value: number, fullDate: string}>}
 */
function calculateYearlyTrend(records, timeRange) {
	const result = [];
	const year = timeRange.start.getUTCFullYear();
	const endMonth = timeRange.end.getUTCMonth();

	for (let m = 0; m <= endMonth; m++) {
		// 筛选该月的记录
		const monthRecords = records.filter(r => {
			const recordDate = new Date(r.created_at);
			return recordDate.getUTCFullYear() === year && recordDate.getUTCMonth() === m;
		});

		const monthValue = monthRecords.length > 0
			? Math.round(monthRecords.reduce((sum, r) => sum + getRecordScore(r), 0) / monthRecords.length)
			: 0;

		result.push({
			day: `${m + 1}月`,
			value: monthValue,
			fullDate: `${year}-${String(m + 1).padStart(2, '0')}`
		});
	}

	return result;
}

/** 获取单条记录的评分（类型分+感受分的平均值） */
function getRecordScore(record) {
	const typeScores = { 1: 40, 2: 60, 3: 80, 4: 100, 5: 80, 6: 60, 7: 40 };
	const feelingScores = { smooth: 100, effortful: 60, diarrhea: 40 };
	const typeScore = typeScores[parseInt(record.type)] || 50;
	const feelingScore = feelingScores[record.feeling] || 50;
	return Math.round((typeScore + feelingScore) / 2);
}

/** 计算综合健康评分（有数据的天数平均分） */
function calculateOverallScore(weeklyData) {
	const daysWithData = weeklyData.filter(d => d.value > 0);
	if (daysWithData.length === 0) return 0;
	const avg = daysWithData.reduce((sum, d) => sum + d.value, 0) / daysWithData.length;
	return Math.round(avg);
}

/** 计算与上周评分的趋势对比 */
async function calculateTrend(userId, currentScore, weekStart) {
	const lastWeekEnd = new Date(weekStart.getTime() - 1);
	const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
	try {
		const lastWeekRes = await reportsCollection
			.where({
				user_id: userId,
				created_at: db.command.gte(lastWeekStart).and(db.command.lte(lastWeekEnd))
			})
			.orderBy('created_at', 'desc')
			.limit(1)
			.get();

		if (lastWeekRes.data && lastWeekRes.data.length > 0) {
			const lastScore = lastWeekRes.data[0].score || 0;
			const diff = currentScore - lastScore;
			if (diff > 0) return `较上期 +${diff}%`;
			if (diff < 0) return `较上期 ${diff}%`;
			return '与上期持平';
		}
	} catch (e) {
		// 忽略
	}
	return '首次分析';
}

/** 计算用户在今日所有报告中的排名百分位 */
async function calculateRanking(userId, currentScore) {
	try {
		const todayStr = getBeijingDateStr();
		const todayReportsRes = await reportsCollection
			.where({ report_date: todayStr })
			.get();

		if (todayReportsRes.data && todayReportsRes.data.length > 0) {
			const allScores = todayReportsRes.data.map(r => r.score || 0);
			const belowCount = allScores.filter(s => s < currentScore).length;
			const total = allScores.length;
			const percentile = total > 1 ? Math.round((belowCount / total) * 100) : 50;
			return `超越 ${percentile}% 用户`;
		}
	} catch (e) {
		// 忽略
	}
	return '暂无排名数据';
}

// ==================== DeepSeek API 调用 ====================

/**
 * 调用 DeepSeek API 生成AI分析报告
 * @param {Array} records - 排便记录
 * @param {Array} weeklyData - 每日评分数据
 * @param {number} score - 综合评分
 * @param {string} period - 分析周期：week/month/day/year
 * @param {Date} rangeStart - 时间范围起始
 * @param {Date} rangeEnd - 时间范围结束
 * @param {number} averageFrequency - 平均频率
 * @param {number} qualifiedDays - 合格天数
 * @param {number} periodDays - 周期总天数
 * @returns {{aiSummary, aiSummaryTags, metrics, tips}}
 */
/**
 * 将用户绑定的手环数据格式化为 AI 提示词片段
 * @param {Array} devices - 用户 devices 字段
 * @returns {string} 例如「小米 手环9：静息心率62bpm、血氧98%」
 */
function formatDeviceSummary(devices) {
	if (!devices || devices.length === 0) return '';
	return devices.map(d => {
		const m = d.metrics || {};
		const parts = [];
		if (m.heartRate) parts.push(`静息心率${m.heartRate}bpm`);
		if (m.spo2) parts.push(`血氧${m.spo2}%`);
		if (m.sleepHours) parts.push(`睡眠${m.sleepHours}小时`);
		if (m.steps) parts.push(`日均步数${m.steps}`);
		if (m.stress) parts.push(`压力指数${m.stress}`);
		if (m.hrv) parts.push(`HRV${m.hrv}ms`);
		if (m.temperature) parts.push(`体温${m.temperature}℃`);
		const name = `${d.brand || ''}${d.model || d.name || ''}`.trim();
		return `${name}${parts.length ? '：' + parts.join('、') : ''}`;
	}).filter(Boolean).join('；');
}

async function callDeepSeek(records, weeklyData, score, period, rangeStart, rangeEnd, averageFrequency, qualifiedDays, periodDays, devices = []) {
	const recordsSummary = records.map(r => {
		const typeMap = { 1: '硬球状', 2: '凹凸肠状', 3: '裂纹肠状', 4: '光滑香肠状', 5: '柔软块状', 6: '糊状', 7: '水样' };
		const feelingMap = { smooth: '顺畅', effortful: '费力', diarrhea: '腹泻感' };
		const colorMap = { brown: '棕色', dark_brown: '深棕色', yellow: '黄色', green: '绿色', black: '黑色', red: '红色' };
		const date = new Date(r.created_at);
		let summary = `${date.getMonth() + 1}月${date.getDate()}日: 类型${typeMap[parseInt(r.type || r.bristol_type)] || r.type || r.bristol_type}`;
		if (r.feeling) summary += `, 感受${feelingMap[r.feeling] || r.feeling}`;
		if (r.duration) summary += `, 耗时${r.duration}秒`;
		if (r.color) summary += `, 颜色${colorMap[r.color] || r.color}`;
		if (r.water_intake || r.water) summary += `, 饮水${r.water_intake || r.water}ml`;
		if (r.fiber_intake || r.fiber) summary += `, 膳食纤维${r.fiber_intake || r.fiber}g`;
		if (r.note) summary += `, 备注:${r.note}`;
		return summary;
	}).join('\n');

	const weekSummary = weeklyData.map(d => `${d.day}(${d.fullDate}): 评分${d.value}`).join(', ');

	// 周期标签：用于 prompt 中的时间描述
	const periodLabelMap = { week: '本周', month: '本月', day: '昨日', year: '本年' };
	const periodLabel = periodLabelMap[period] || '本周';
	const rangeStartStr = formatDateStr(rangeStart);
	const rangeEndStr = formatDateStr(rangeEnd);

	/* 用户绑定的手环数据（心率/血氧/睡眠等），用于让分析更准确 */
	const deviceSummary = formatDeviceSummary(devices);
	const devicePrompt = deviceSummary
		? `\n6. 用户绑定的可穿戴设备数据：${deviceSummary}。请结合这些设备指标分析睡眠、压力、心率对肠道健康的可能影响，不要编造设备未提供的指标。`
		: '';

	const systemPrompt = `你是一位专业的肠道健康分析师。请根据用户${periodLabel}的排便记录，给出专业的分析报告。

要求：
1. 返回严格的 JSON 格式（不要markdown标记），包含以下字段：
   - aiSummary: 一段100-150字的总结分析，要具体、有数据支撑，结合排便类型、颜色、饮水、膳食纤维、感受、备注等所有数据进行综合分析，不要空话套话
   - aiSummaryTags: 3-5个关键词标签
   - metrics: 数组，包含4项健康指标评价，每项格式为 {"icon":"emoji","value":"10-30字评价","label":"指标名","percent":0-100整数,"color":"#颜色"}：
     * 排便频率（icon:"📊"）
     * 粪便质量（icon:"💩"）
     * 排便规律性（icon:"🕐"）
     * 水分摄入（icon:"💧"）
   - tips: 数组，必须包含恰好4个个性化建议，每个建议格式为 {"title":"标题","desc":"20-40字具体可执行建议","emoji":"emoji","color":"#8d4b00","action":"setReminder"/"viewArticle"/"none"}

2. 评分要严谨：根据实际数据计算，不要刻意凑整到5的倍数。例如数据一般可以是62分、73分、68分等。

3. 分析要严谨：即使只有1天记录也要进行分析，但可在aiSummary中说明"数据量较少，分析仅供参考"。结合饮水、膳食纤维、颜色、备注等数据给出更有针对性的建议。

4. 只返回JSON，不要任何其他文字。${devicePrompt}`;

	const userPrompt = `用户${periodLabel}（${rangeStartStr} 至 ${rangeEndStr}）排便记录如下：
${recordsSummary}

${periodLabel}每日健康评分：
${weekSummary}

${periodLabel}评分：${score}/100
排便频率：平均每天${averageFrequency}次
合格天数：${qualifiedDays}/${periodDays}天

请给出专业分析报告。`;

	console.log('[ai] 调用 AI API...');

	// 从数据库读取AI配置
	const aiConfig = await getAIConfig();
	console.log('[ai] 使用模型:', aiConfig.model, 'API:', aiConfig.api_url.substring(0, 40) + '...');

	const requestStart = Date.now();
	const response = await uniCloud.httpclient.request(aiConfig.api_url, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${aiConfig.api_key}`,
			'Content-Type': 'application/json'
		},
		data: {
			model: aiConfig.model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0.7,
			max_tokens: 1200
		},
		timeout: 25000,
		dataType: 'json'
	});

	const elapsed = Date.now() - requestStart;
	console.log('[ai] DeepSeek 返回状态:', response.status, '耗时:', elapsed + 'ms');

	if (response.status !== 200) {
		console.error('[ai] DeepSeek 错误响应:', JSON.stringify(response.data));
		throw new Error(`DeepSeek API 返回错误: ${response.status}`);
	}

	const content = response.data.choices[0].message.content;
	console.log('[ai] AI 返回内容(前300字):', content.substring(0, 300));

	// Bug修复：原 ai_analysis 中此处有重复声明 const parsed，已合并为一次
	const parsed = JSON.parse(content);
	console.log('[ai] AI 解析成功，字段:', Object.keys(parsed));

	return {
		aiSummary: parsed.aiSummary || '暂无分析',
		aiSummaryTags: parsed.aiSummaryTags || ['健康监测'],
		metrics: parsed.metrics || [],
		tips: parsed.tips || []
	};
}

/** 获取默认AI分析结果（无数据时使用） */
function getDefaultAIResult() {
	return {
		aiSummary: '本周暂无足够的排便记录数据，建议您每天记录排便情况，AI将为您提供更精准的健康分析报告。保持良好的排便习惯是肠道健康的重要指标。',
		aiSummaryTags: ['数据不足', '待记录', '健康监测', '肠道关怀'],
		metrics: [
			{ icon: '💩', value: '待记录', label: '排便规律', percent: 0, color: '#887364' },
			{ icon: '🟢', value: '待记录', label: '粪便形态', percent: 0, color: '#887364' }
		],
		tips: [
			{ title: '开始记录', desc: '每天记录排便情况，获取AI健康分析', emoji: '📝', color: '#8d4b00', action: 'setReminder' },
			{ title: '了解布里斯托分类', desc: '学习判断粪便类型的方法', emoji: '📚', color: '#8d4b00', action: 'viewArticle' }
		]
	};
}

// ==================== device 模块：可穿戴设备与健康数据 ====================
// action: config, bindHuawei, syncHuawei, status, unbind

async function deviceModule(event, context) {
	const { action, userId } = event;

	if (action === 'config') {
		return await deviceHuaweiConfig();
	}

	if (!userId) return { code: -1, message: '用户ID不能为空' };

	switch (action) {
		case 'bindHuawei':
			return await deviceHuaweiBind(event);
		case 'syncHuawei':
			return await deviceHuaweiSync(event);
		case 'status':
			return await deviceStatus(event);
		case 'unbind':
			return await deviceUnbind(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：config、bindHuawei、syncHuawei、status、unbind' };
	}
}

/** 读取华为 Health Kit 应用凭证（在后台 app_config.sync_config 中配置） */
async function getHuaweiConfig() {
	try {
		const res = await configCollection.doc('sync_config').get();
		const cfg = (res.data && res.data[0]) || {};
		return {
			clientId: cfg.huawei_client_id || '',
			clientSecret: cfg.huawei_client_secret || '',
			scopes: cfg.huawei_scopes || HUAWEI_DEFAULT_SCOPES
		};
	} catch (e) {
		console.warn('[device] 读取华为配置失败:', e.message);
		return { clientId: '', clientSecret: '', scopes: HUAWEI_DEFAULT_SCOPES };
	}
}

/** 返回小程序授权所需配置（不包含 client_secret） */
async function deviceHuaweiConfig() {
	const cfg = await getHuaweiConfig();
	return {
		code: 0,
		data: {
			provider: 'huawei',
			client_id: cfg.clientId,
			scopes: cfg.scopes,
			appid: HUAWEI_HEALTH.miniProgramAppId,
			path: HUAWEI_HEALTH.miniProgramPath,
			redirect_uri: HUAWEI_HEALTH.redirectUri,
			configured: !!cfg.clientId && !!cfg.clientSecret
		}
	};
}

/** 华为 OAuth Token 请求（authorization_code / refresh_token） */
async function requestHuaweiToken(params) {
	const body = Object.keys(params)
		.filter(k => params[k] !== undefined && params[k] !== '')
		.map(k => `${k}=${encodeURIComponent(params[k])}`)
		.join('&');

	const res = await uniCloud.httpclient.request(HUAWEI_HEALTH.tokenUrl, {
		method: 'POST',
		contentType: 'application/x-www-form-urlencoded',
		data: body,
		dataType: 'json',
		timeout: 15000
	});

	if (res.status !== 200 || !res.data || !res.data.access_token) {
		console.error('[device] 华为 token 请求失败:', res.status, JSON.stringify(res.data || {}).substring(0, 200));
		throw new Error((res.data && res.data.error_description) || '华为授权失败');
	}
	return res.data;
}

/** 保存/更新华为设备授权 */
async function saveHuaweiDevice(userId, token, state) {
	const now = Date.now();
	await healthDevicesCollection.doc(`${userId}_huawei`).set({
		user_id: userId,
		provider: 'huawei',
		provider_name: '华为运动健康',
		device_name: '华为手环/手表',
		access_token: token.access_token,
		refresh_token: token.refresh_token || '',
		expires_at: now + (token.expires_in || 3600) * 1000,
		scope: token.scope || '',
		status: 'connected',
		auth_state: state || '',
		bound_at: now,
		last_sync_at: now
	});
}

/** 授权码换 Token 并完成绑定 */
async function deviceHuaweiBind(event) {
	const { userId, code, state } = event;
	if (!code) return { code: -1, message: '缺少华为授权码' };

	const cfg = await getHuaweiConfig();
	if (!cfg.clientId || !cfg.clientSecret) {
		return { code: -1, message: '华为 Health Kit 应用凭证未配置，请先在后台配置 client_id 和 client_secret' };
	}

	try {
		const token = await requestHuaweiToken({
			grant_type: 'authorization_code',
			code,
			client_id: cfg.clientId,
			client_secret: cfg.clientSecret,
			redirect_uri: HUAWEI_HEALTH.redirectUri
		});
		await saveHuaweiDevice(userId, token, state);
		const metrics = await syncHuaweiHealth(userId, token.access_token, cfg);
		return {
			code: 0,
			message: '华为运动健康授权成功',
			data: { provider: 'huawei', metrics }
		};
	} catch (e) {
		console.error('[device] 华为绑定失败:', e.message);
		return { code: -1, message: e.message || '华为授权失败' };
	}
}

/** 获取可用 Access Token（过期自动刷新） */
async function getHuaweiAccessToken(userId, cfg) {
	const res = await healthDevicesCollection.doc(`${userId}_huawei`).get();
	const device = res.data && res.data[0];
	if (!device) throw new Error('尚未绑定华为运动健康');

	if (device.expires_at && device.expires_at > Date.now() + 60000) {
		return device.access_token;
	}

	const token = await requestHuaweiToken({
		grant_type: 'refresh_token',
		refresh_token: device.refresh_token,
		client_id: cfg.clientId,
		client_secret: cfg.clientSecret
	});

	await healthDevicesCollection.doc(`${userId}_huawei`).update({
		access_token: token.access_token,
		expires_at: Date.now() + (token.expires_in || 3600) * 1000,
		updated_at: new Date()
	});
	return token.access_token;
}

/** 手动同步华为健康数据 */
async function deviceHuaweiSync(event) {
	const { userId } = event;
	const cfg = await getHuaweiConfig();
	if (!cfg.clientId || !cfg.clientSecret) {
		return { code: -1, message: '华为 Health Kit 应用凭证未配置' };
	}
	try {
		const accessToken = await getHuaweiAccessToken(userId, cfg);
		const metrics = await syncHuaweiHealth(userId, accessToken, cfg);
		return { code: 0, message: '同步成功', data: { provider: 'huawei', metrics } };
	} catch (e) {
		console.error('[device] 同步失败:', e.message);
		return { code: -1, message: e.message || '同步失败' };
	}
}

/** 调用华为 REST 接口拉取健康数据并入库 */
async function syncHuaweiHealth(userId, accessToken, cfg) {
	const headers = {
		'Authorization': `Bearer ${accessToken}`,
		'x-client-id': cfg.clientId,
		'Content-Type': 'application/json'
	};

	const latest = await fetchHuaweiLatest(headers);
	const steps = await fetchHuaweiSteps(headers);
	const metrics = {
		heart_rate: latest.heart_rate || 0,
		resting_heart_rate: latest.resting_heart_rate || 0,
		spo2: latest.spo2 || 0,
		stress: latest.stress || 0,
		body_temperature: latest.body_temperature || 0,
		steps,
		sleep_hours: 0,
		synced_at: Date.now()
	};

	const date = getBeijingDateStr();
	await healthMetricsCollection.doc(`${userId}_huawei_${date}`).set({
		user_id: userId,
		provider: 'huawei',
		date,
		...metrics
	});

	await healthDevicesCollection.doc(`${userId}_huawei`).update({
		last_sync_at: Date.now(),
		status: 'connected'
	});

	return metrics;
}

/** 查询最新采样点（心率、静息心率、血氧、压力、体温） */
async function fetchHuaweiLatest(headers) {
	const types = [
		'com.huawei.instantaneous.heart_rate',
		'com.huawei.instantaneous.resting_heart_rate',
		'com.huawei.instantaneous.spo2',
		'com.huawei.instantaneous.stress',
		'com.huawei.instantaneous.body_temperature'
	];
	const query = types.map(t => 'dataType=' + encodeURIComponent(t)).join('&');

	const res = await uniCloud.httpclient.request(`${HUAWEI_HEALTH.apiBase}/sampleSets/latestSamplePoint?${query}`, {
		method: 'GET',
		headers,
		dataType: 'json',
		timeout: 15000
	});
	if (res.status !== 200) {
		console.warn('[device] 最新采样查询失败:', res.status, JSON.stringify(res.data || {}).substring(0, 200));
		return {};
	}

	const points = (res.data && res.data.samplePoints) || {};
	const pick = (type, field) => {
		const point = points[type];
		if (!point) return 0;
		const list = point.value || [];
		const item = list.find(v => v.fieldName === field) || list[0] || {};
		return item.floatValue !== undefined ? item.floatValue : (item.integerValue !== undefined ? item.integerValue : 0);
	};

	return {
		heart_rate: pick('com.huawei.instantaneous.heart_rate', 'heart_rate'),
		resting_heart_rate: pick('com.huawei.instantaneous.resting_heart_rate', 'resting_heart_rate'),
		spo2: pick('com.huawei.instantaneous.spo2', 'saturation'),
		stress: pick('com.huawei.instantaneous.stress', 'stress'),
		body_temperature: pick('com.huawei.instantaneous.body_temperature', 'body_temperature')
	};
}

/** 聚合查询最近 7 天步数 */
async function fetchHuaweiSteps(headers) {
	const endTime = Date.now();
	const startTime = endTime - 7 * 24 * 60 * 60 * 1000;

	const res = await uniCloud.httpclient.request(`${HUAWEI_HEALTH.apiBase}/sampleSet:polymerize`, {
		method: 'POST',
		headers,
		contentType: 'json',
		data: {
			polymerizeWith: [{ dataTypeName: 'com.huawei.continuous.steps.delta' }],
			startTime,
			endTime
		},
		dataType: 'json',
		timeout: 15000
	});

	if (res.status !== 200) {
		console.warn('[device] 步数查询失败:', res.status, JSON.stringify(res.data || {}).substring(0, 200));
		return 0;
	}

	const sets = res.data.sampleSets || [];
	let total = 0;
	for (const set of sets) {
		for (const point of set.samplePoints || []) {
			for (const value of point.value || []) {
				if (value.fieldName === 'steps_delta') {
					total += value.integerValue || value.floatValue || 0;
				}
			}
		}
	}
	return total;
}

/** 设备绑定状态 + 最新健康数据 */
async function deviceStatus(event) {
	const { userId } = event;
	let device = null;
	try {
		const res = await healthDevicesCollection.doc(`${userId}_huawei`).get();
		device = (res.data && res.data[0]) || null;
	} catch (e) {
		console.warn('[device] 读取设备失败:', e.message);
	}

	let metrics = null;
	try {
		const res = await healthMetricsCollection
			.where({ user_id: userId, provider: 'huawei' })
			.orderBy('date', 'desc')
			.limit(1)
			.get();
		metrics = (res.data && res.data[0]) || null;
	} catch (e) {
		console.warn('[device] 读取健康数据失败:', e.message);
	}

	return {
		code: 0,
		data: {
			huawei: device ? {
				status: device.status,
				bound_at: device.bound_at,
				last_sync_at: device.last_sync_at,
				scope: device.scope
			} : null,
			metrics
		}
	};
}

/** 解绑华为设备 */
async function deviceUnbind(event) {
	const { userId } = event;
	await healthDevicesCollection.doc(`${userId}_huawei`).remove();
	return { code: 0, message: '已解绑华为运动健康' };
}

/** 将华为健康数据转换为 AI 提示词可用的设备数据结构 */
function healthMetricsToDevices(metrics) {
	if (!metrics) return [];
	return [{
		brand: '华为运动健康',
		model: '华为手环/手表',
		metrics: {
			heartRate: metrics.resting_heart_rate || metrics.heart_rate || 0,
			spo2: metrics.spo2 || 0,
			steps: metrics.steps || 0,
			stress: metrics.stress || 0,
			temperature: metrics.body_temperature || 0,
			sleepHours: metrics.sleep_hours || 0
		}
	}];
}

// ==================== announcement 模块：公告管理 ====================
// action: get      - 获取启用的公告（普通公告列表 + 封禁公告）
// action: checkBan - 检查用户封禁状态

/**
 * 检查用户封禁状态（含过期自动解封）
 * @param {string} userId - 用户ID
 * @returns {Promise<object|null>} 封禁公告信息；未封禁或已自动解封时返回 null
 */
async function checkUserBanStatus(userId) {
	if (!userId) {
		console.log('[ban] checkUserBanStatus: userId 为空，跳过');
		return null;
	}

	try {
		// 查询用户的封禁状态和账号状态
		const userRes = await usersCollection
			.where({ _id: userId })
			.field({ ban_status: true, status: true })
			.get();

		if (userRes.data.length === 0) {
			console.log('[ban] 用户不存在:', userId);
			return null;
		}

		const userData = userRes.data[0];
		const banStatus = userData.ban_status;
		const userStatus = userData.status;

		console.log('[ban] 用户封禁检查:', {
			userId: userId,
			status: userStatus,
			ban_status: banStatus
		});

		// 情况1：有封禁公告关联的封禁
		if (banStatus && banStatus.is_banned) {
			// 判断是否过期：非永久封禁且过期时间已到
			const now = Date.now();
			const isExpired = !banStatus.is_permanent &&
				banStatus.expires_at &&
				new Date(banStatus.expires_at).getTime() < now;

			if (isExpired) {
				console.log('[ban] 封禁已过期，自动解封');
				await usersCollection
					.where({ _id: userId })
					.update({
						ban_status: { is_banned: false },
						status: 1
					});
				return null;
			}

			// 未过期 → 查询对应的封禁公告
			if (!banStatus.announcement_id) {
				console.log('[ban] 被封禁但没有关联公告ID，返回默认封禁');
				let expiresAtTs = 0;
				if (banStatus.expires_at) expiresAtTs = new Date(banStatus.expires_at).getTime();
				return {
					id: '',
					title: '账号已被封禁',
					rich_content: '您的账号已被封禁，如有疑问请联系客服。',
					ban_image: '',
					expires_at: expiresAtTs,
					is_permanent: banStatus.is_permanent || false
				};
			}

			const annRes = await db.collection('announcements')
				.where({ _id: banStatus.announcement_id })
				.get();

			if (annRes.data.length === 0) {
				console.log('[ban] 关联的封禁公告不存在:', banStatus.announcement_id, '，返回默认封禁');
				let expiresAtTs = 0;
				if (banStatus.expires_at) expiresAtTs = new Date(banStatus.expires_at).getTime();
				return {
					id: '',
					title: '账号已被封禁',
					rich_content: '您的账号已被封禁，如有疑问请联系客服。',
					ban_image: '',
					expires_at: expiresAtTs,
					is_permanent: banStatus.is_permanent || false
				};
			}

			const ann = annRes.data[0];
		console.log('[ban] 封禁公告匹配成功:', ann.title);

		/* 将 expires_at 统一转为时间戳（毫秒） */
		let expiresAtTs = 0;
		if (banStatus.expires_at) {
			expiresAtTs = new Date(banStatus.expires_at).getTime();
		}

		return {
			id: ann._id,
			title: ann.title || '',
			rich_content: ann.rich_content || '',
			ban_image: ann.ban_image || '',
			expires_at: expiresAtTs,
			is_permanent: banStatus.is_permanent || false
		};
		}

		// 情况2：status=0 但没有 ban_status（通过旧版 toggleStatus 禁用的用户）
		if (userStatus !== undefined && userStatus !== 1) {
			console.log('[ban] 用户 status !== 1 (旧版禁用)，返回默认封禁');
			return {
				id: '',
				title: '账号已被禁用',
				rich_content: '您的账号已被禁用，如有疑问请联系客服。',
				expires_at: null,
				is_permanent: true
			};
		}

		console.log('[ban] 未被封禁 (ban_status 为空且 status=1)');
		return null;
	} catch (error) {
		console.error('[ban] 检查封禁状态失败:', error.message);
		return null;
	}
}

/* 公告模块 - 供用户端获取启用的公告 */
async function announcementModule(event, context) {
	const { action } = event;

	if (action === 'get') {
		try {
			// 查询所有启用的公告
			const result = await db.collection('announcements')
				.where({ is_active: true })
				.orderBy('sort', 'asc')
				.orderBy('created_at', 'desc')
				.limit(10)
				.get();

			// 筛选普通公告（type='normal'）
			const normal = result.data
				.filter(item => item.type === 'normal')
				.map(item => ({
					id: item._id,
					title: item.title || '',
					content: item.content || '',
					rich_content: item.rich_content || '',
					trigger_frequency: item.trigger_frequency || 'once',
					created_at: item.created_at
				}));

			// 检查封禁状态（传入 userId 时才检查）
			const { userId } = event;
			const ban = await checkUserBanStatus(userId);

			return { code: 0, data: { normal, ban } };
		} catch (error) {
			return { code: -1, message: '获取公告失败' };
		}
	}

	if (action === 'checkBan') {
		try {
			const { userId } = event;
			const banInfo = await checkUserBanStatus(userId);

			if (banInfo) {
				return { code: 0, data: { is_banned: true, announcement: banInfo } };
			}
			return { code: 0, data: { is_banned: false } };
		} catch (error) {
			return { code: -1, message: '检查封禁状态失败' };
		}
	}

	return { code: -1, message: '不支持的操作' };
}

// ==================== reminder 模块：每日提醒订阅（微信订阅消息） ====================

/* 微信小程序订阅消息模板ID —— 需在微信公众平台→功能→订阅消息中创建后替换 */
const REMINDER_TEMPLATE_ID = 'REPLACE_WITH_YOUR_TEMPLATE_ID';

/* 微信小程序凭据（与 auth 模块共用） */
const WX_APPID = 'wxdb04f8f1e3fe00bb';
const WX_APPSECRET = '';

async function reminderModule(event, context) {
	const { action } = event;
	switch (action) {
		case 'subscribe': return await handleSubscribeReminder(event);
		case 'unsubscribe': return await handleUnsubscribeReminder(event);
		case 'getStatus': return await handleGetReminderStatus(event);
		case 'sendReminders': return await sendDailyReminders();
		default: return { code: -1, message: '未知操作' };
	}
}

/**
 * 记录用户订阅提醒
 * 前端调用 wx.requestSubscribeMessage 用户授权后，将授权结果同步到后端
 * 每次授权 remaining_count +1（微信一次性订阅：1次授权=1次发送配额）
 * 以 user_id + reminder_time 作为复合键，支持同一用户多个提醒时间
 */
async function handleSubscribeReminder(event) {
	const { userId, reminderTime, templateId } = event;
	if (!userId) return { code: -1, message: '未登录' };
	if (!reminderTime) return { code: -1, message: '缺少提醒时间' };

	try {
		/* 查询用户openid，发送订阅消息时需要 */
		const userRes = await usersCollection.doc(userId).get();
		const openid = (userRes.data && userRes.data[0] && userRes.data[0].wechat_openid) || '';
		if (!openid) {
			return { code: -1, message: '无法获取用户openid，请重新登录' };
		}

		/* 以 user_id + reminder_time 查找已有记录 */
		const existing = await db.collection('reminder_subscriptions')
			.where({ user_id: userId, reminder_time: reminderTime })
			.get();

		if (existing.data && existing.data.length > 0) {
			/* 已有记录：累加剩余次数，重新激活 */
			const current = existing.data[0];
			await db.collection('reminder_subscriptions')
				.where({ _id: current._id })
				.update({
					template_id: templateId || REMINDER_TEMPLATE_ID,
					is_active: true,
					openid: openid,
					remaining_count: (current.remaining_count || 0) + 1,
					updated_at: new Date()
				});
		} else {
			/* 新建订阅记录 */
			await db.collection('reminder_subscriptions').add({
				user_id: userId,
				reminder_time: reminderTime,
				template_id: templateId || REMINDER_TEMPLATE_ID,
				is_active: true,
				openid: openid,
				remaining_count: 1,
				subscribed_at: new Date(),
				updated_at: new Date()
			});
		}
		return { code: 0, message: '订阅成功' };
	} catch (error) {
		console.error('[reminder] 订阅失败:', error.message);
		return { code: -1, message: '订阅失败' };
	}
}

/** 取消订阅：将指定时间的提醒设为关闭，保留剩余次数 */
async function handleUnsubscribeReminder(event) {
	const { userId, reminderTime } = event;
	if (!userId) return { code: -1, message: '未登录' };
	if (!reminderTime) return { code: -1, message: '缺少提醒时间' };

	try {
		await db.collection('reminder_subscriptions')
			.where({ user_id: userId, reminder_time: reminderTime })
			.update({
				is_active: false,
				updated_at: new Date()
			});
		return { code: 0, message: '已取消订阅' };
	} catch (error) {
		console.error('[reminder] 取消订阅失败:', error.message);
		return { code: -1, message: '取消失败' };
	}
}

/** 获取用户所有提醒订阅状态（返回数组，每条对应一个提醒时间） */
async function handleGetReminderStatus(event) {
	const { userId } = event;
	if (!userId) return { code: -1, message: '未登录' };

	try {
		const result = await db.collection('reminder_subscriptions')
			.where({ user_id: userId })
			.get();

		/* 将数据库记录转为前端需要的格式 */
		const subscriptions = (result.data || []).map(sub => ({
			reminderTime: sub.reminder_time || '08:30',
			isActive: sub.is_active || false,
			remainingCount: sub.remaining_count || 0,
			templateId: sub.template_id || REMINDER_TEMPLATE_ID
		}));

		return { code: 0, data: { subscriptions } };
	} catch (error) {
		console.error('[reminder] 获取状态失败:', error.message);
		return { code: -1, message: '获取状态失败' };
	}
}

/** 定时触发器入口：根据当前时间匹配需要发送的提醒 */
async function handleTimerTrigger(event) {
	console.log('[timer] 触发器执行:', event.TriggerName);
	if (event.TriggerName === 'dailyReminderTrigger') {
		return await sendDailyReminders();
	}
	return { code: 0, message: '未知触发器，跳过' };
}

/**
 * 发送每日提醒消息
 * 查询所有 is_active=true 且 remaining_count>0 的订阅
 * 对比 reminder_time 与当前时间，匹配则发送
 */
async function sendDailyReminders() {
	try {
		/* 获取北京时间当前的 HH:mm */
		const now = new Date();
		const beijingOffset = 8 * 60 * 60 * 1000;
		const beijingTime = new Date(now.getTime() + beijingOffset + now.getTimezoneOffset() * 60000);
		const currentHH = beijingTime.getHours().toString().padStart(2, '0');
		const currentMM = beijingTime.getMinutes().toString().padStart(2, '0');
		const currentTime = `${currentHH}:${currentMM}`;

		console.log(`[reminder] 当前北京时间: ${currentTime}，开始查找匹配订阅`);

		/* 查询所有活跃且有剩余次数的订阅 */
		const result = await db.collection('reminder_subscriptions')
			.where({
				is_active: true,
				remaining_count: db.command.gt(0)
			})
			.get();

		if (!result.data || result.data.length === 0) {
			console.log('[reminder] 无活跃订阅');
			return { code: 0, message: '无活跃订阅', sent: 0 };
		}

		/* 筛选 reminder_time 匹配当前时间的订阅 */
		const matched = result.data.filter(sub => sub.reminder_time === currentTime);
		if (matched.length === 0) {
			console.log(`[reminder] 当前时间 ${currentTime} 无匹配订阅`);
			return { code: 0, message: '当前时间无匹配', sent: 0 };
		}

		console.log(`[reminder] 找到 ${matched.length} 条匹配订阅，开始发送`);

		/* 获取 access_token */
		const accessToken = await getWxAccessToken();
		if (!accessToken) {
			console.error('[reminder] 获取 access_token 失败');
			return { code: -1, message: '获取 access_token 失败' };
		}

		/* 逐条发送订阅消息 */
		let sentCount = 0;
		for (const sub of matched) {
			if (!sub.openid) {
				console.warn(`[reminder] 用户 ${sub.user_id} 无 openid，跳过`);
				continue;
			}

			const templateId = sub.template_id || REMINDER_TEMPLATE_ID;
			if (templateId === 'REPLACE_WITH_YOUR_TEMPLATE_ID') {
				console.warn('[reminder] 模板ID未配置，跳过发送');
				continue;
			}

			const sendResult = await sendWxSubscribeMessage(accessToken, sub.openid, templateId, sub.reminder_time);

			if (sendResult.errcode === 0) {
				sentCount++;
				/* 发送成功，剩余次数 -1；若次数归零则自动关闭订阅 */
				const newCount = (sub.remaining_count || 1) - 1;
				const updateData = {
					remaining_count: db.command.inc(-1),
					updated_at: new Date()
				};
				if (newCount <= 0) {
					updateData.is_active = false;
				}
				await db.collection('reminder_subscriptions').where({ _id: sub._id }).update(updateData);
				console.log(`[reminder] 用户 ${sub.user_id} 发送成功，剩余 ${newCount} 次`);
			} else {
				console.error(`[reminder] 用户 ${sub.user_id} 发送失败:`, sendResult.errmsg);
			}
		}

		console.log(`[reminder] 发送完成，成功 ${sentCount}/${matched.length}`);
		return { code: 0, message: '发送完成', sent: sentCount, total: matched.length };
	} catch (error) {
		console.error('[reminder] 发送每日提醒异常:', error.message);
		return { code: -1, message: '发送异常: ' + error.message };
	}
}

/**
 * 获取微信 access_token
 * 文档: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/access-token/auth.getAccessToken.html
 */
async function getWxAccessToken() {
	try {
		const res = await uniCloud.httpclient.request(
			'https://api.weixin.qq.com/cgi-bin/token',
			{
				method: 'GET',
				data: {
					grant_type: 'client_credential',
					appid: WX_APPID,
					secret: WX_APPSECRET
				},
				dataType: 'json'
			}
		);

		if (res.data && res.data.access_token) {
			return res.data.access_token;
		}
		console.error('[wx] 获取 access_token 失败:', res.data);
		return null;
	} catch (error) {
		console.error('[wx] 获取 access_token 异常:', error.message);
		return null;
	}
}

/**
 * 发送微信订阅消息
 * 文档: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/subscribe-message/subscribeMessage.send.html
 * @param {string} accessToken - 接口调用凭据
 * @param {string} openid - 接收消息的用户openid
 * @param {string} templateId - 订阅消息模板ID
 * @param {string} reminderTime - 提醒时间（用于消息内容）
 */
async function sendWxSubscribeMessage(accessToken, openid, templateId, reminderTime) {
	try {
		const res = await uniCloud.httpclient.request(
			'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
			{
				method: 'POST',
				data: {
					touser: openid,
					template_id: templateId,
					/* 跳转到小程序首页 */
					page: 'pages/index/index',
					/* 模板数据：需与微信公众平台配置的模板字段一致 */
					data: {
						/* thing1: 提醒内容（20字以内） */
						thing1: { value: '该记录排便情况了' },
						/* time2: 提醒时间 */
						time2: { value: reminderTime }
					},
					miniprogram_state: 'formal'
				},
				dataType: 'json',
				headers: { 'Content-Type': 'application/json' }
			}
		);

		return res.data || { errcode: -1, errmsg: '无返回数据' };
	} catch (error) {
		console.error('[wx] 发送订阅消息异常:', error.message);
		return { errcode: -1, errmsg: error.message };
	}
}

// ==================== bristol 模块：布里斯托大便分类图 ====================

/**
 * 布里斯托图片模块
 * @action get - 获取布里斯托分类图片列表
 * 尝试从 bristol_images 集合读取，如果集合不存在则返回空列表
 */
async function bristolModule(event, context) {
	const { action } = event;
	if (action === 'get') {
		try {
			const result = await db.collection('bristol_images')
				.orderBy('sort', 'asc')
				.limit(10)
				.get();
			const images = result.data.map(item => ({
				id: item._id,
				url: item.url || '',
				sort: item.sort || 0
			}));
			return { code: 0, images };
		} catch (error) {
			/* 集合不存在时返回空列表，不报错 */
			console.warn('[bristol] 读取bristol_images集合失败:', error.message);
			return { code: 0, images: [] };
		}
	}
	return { code: -1, message: '不支持的操作' };
}
