'use strict';
/**
 * @name admin-api
 * @description 管理端统一API云函数
 *              采用 module + action 双层路由，合并原8个独立云函数
 *
 * @路由结构：
 *   module: 'dashboard' - 首页统计
 *   module: 'user'      - 用户管理
 *   module: 'records'   - 记录管理
 *   module: 'article'   - 文章管理
 *   module: 'ranking'   - 排行榜
 *   module: 'config'    - 应用配置
 *   module: 'ai_model'  - AI模型管理（新增）
 *   module: 'init'      - 数据初始化
 *
 * @调用示例：
 *   uniCloud.callFunction({
 *     name: 'admin-api',
 *     data: { module: 'user', action: 'list', page: 1, size: 10 }
 *   })
 */

// ==================== 共享数据库连接 ====================
const db = uniCloud.database();
const dbCmd = db.command;
const usersCollection = db.collection('users');
const recordsCollection = db.collection('records');
const articleCollection = db.collection('article');
const aiModelsCollection = db.collection('ai_models');
const healthDevicesCollection = db.collection('health_devices');
const healthMetricsCollection = db.collection('health_metrics');

// ==================== 共享工具函数 ====================

/**
 * 日期格式化为可读字符串（YYYY-MM-DD HH:mm）
 * 多个模块共用的格式化函数，统一声明避免重复
 */
function formatDate(date) {
	if (!date) return '';
	const d = new Date(date);
	if (isNaN(d.getTime())) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 富文本 XSS 过滤函数
 * 对用户提交的 HTML 内容进行清洗，移除危险标签与属性，返回安全 HTML
 * @param {string} html - 原始 HTML 字符串
 * @returns {string} 过滤后的安全 HTML
 */
function sanitizeRichText(html) {
	if (!html || typeof html !== 'string') return '';

	let safe = html;

	// 1. 移除 <script>...</script> 标签及其内容（含大小写、跨行）
	safe = safe.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

	// 2. 移除 <iframe>、<object>、<embed>、<form> 等危险标签（含成对标签与自闭合）
	safe = safe.replace(/<\/?(iframe|object|embed|form)\b[^>]*>/gi, '');

	// 3. 移除所有 on* 事件属性（如 onclick、onload、onerror 等）
	safe = safe.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

	// 4. 移除 javascript: 协议（出现在 href、src 等属性值中）
	safe = safe.replace(/(javascript)\s*:/gi, '');

	return safe;
}

// ==================== 主入口：双层路由 ====================

/**
 * 根据 event.module 路由到对应模块处理函数
 * 每个模块内部再根据 event.action 分发到具体业务逻辑
 */
exports.main = async (event, context) => {
	const { module: mod, action } = event;

	if (!mod) {
		return { code: -1, message: '缺少模块名(module)' };
	}

	switch (mod) {
		case 'dashboard':
			return await dashboardModule(event, context);
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
		case 'ai_model':
			return await aiModelModule(event, context);
		case 'announcement':
			return await announcementModule(event, context);
		case 'device':
			return await deviceModule(event, context);
		case 'menu':
			return await menuModule(event, context);
		case 'init':
			return await initModule(event, context);
		default:
			return { code: -1, message: `不支持的模块: ${mod}，支持：dashboard、user、records、article、ranking、config、ai_model、announcement、menu、init` };
	}
};

// ==================== dashboard 模块：首页统计 ====================

/**
 * 管理端首页统计数据模块
 * @action stats - 获取总用户数、活跃用户、记录数、文章数、月增长趋势
 */
async function dashboardModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'stats':
			return await handleGetStats(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：stats' };
	}
}

/**
 * 获取首页统计数据
 * 优化：用 Promise.all 并行查询，减少串行等待时间
 * 优化：6 次月增长查询改为 1 次查询 + 内存分组
 */
async function handleGetStats(event) {
	try {
		const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
		sixMonthsAgo.setDate(1);
		sixMonthsAgo.setHours(0, 0, 0, 0);

		// 并行查询所有统计指标
		const [
			totalUsersResult,
			activeUsersResult,
			todayRecordsResult,
			totalRecordsResult,
			totalArticlesResult,
			publishedArticlesResult,
			recentUsersResult
		] = await Promise.all([
			// 1. 总用户数
			db.collection('users').count(),
			// 2. 活跃用户数
			db.collection('users').where({ status: 1 }).count(),
			// 3. 今日记录数
			db.collection('records').where({ created_at: dbCmd.gte(todayStart) }).count(),
			// 4. 总记录数
			db.collection('records').count(),
			// 5. 未删除文章数
			db.collection('article').where({ status: dbCmd.neq(2) }).count(),
			// 6. 已发布文章数
			db.collection('article').where({ status: 1 }).count(),
			// 7. 最近6个月注册的用户（一次查询，内存分组）
			db.collection('users')
				.where({ created_at: dbCmd.gte(sixMonthsAgo) })
				.field({ created_at: true })
				.limit(10000)
				.get()
		]);

		// 内存分组计算每月新增用户数
		const userGrowth = computeUserGrowth(recentUsersResult.data);

		return {
			code: 0,
			data: {
				totalUsers: totalUsersResult.total,
				activeUsers: activeUsersResult.total,
				todayRecords: todayRecordsResult.total,
				totalRecords: totalRecordsResult.total,
				totalArticles: totalArticlesResult.total,
				publishedArticles: publishedArticlesResult.total,
				userGrowth
			}
		};
	} catch (error) {
		console.error('获取统计数据失败:', error);
		return { code: -1, message: '获取统计数据失败' };
	}
}

/**
 * 从用户列表中按月分组统计新增用户数
 * 返回最近6个月的数组：[{ month: '3月', count: N }, ...]
 */
function computeUserGrowth(users) {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth();

	// 初始化6个月的数据结构
	const months = [];
	for (let i = 5; i >= 0; i--) {
		const month = currentMonth - i;
		const actualYear = currentYear + Math.floor(month / 12);
		const actualMonth = ((month % 12) + 12) % 12;
		months.push({
			year: actualYear,
			month: actualMonth,
			label: `${actualMonth + 1}月`,
			count: 0
		});
	}

	// 遍历用户数据，按月分组
	for (const user of users) {
		const createdAt = new Date(user.created_at);
		if (isNaN(createdAt.getTime())) continue;
		const year = createdAt.getFullYear();
		const month = createdAt.getMonth();

		for (const m of months) {
			if (m.year === year && m.month === month) {
				m.count++;
				break;
			}
		}
	}

	return months.map(m => ({ month: m.label, count: m.count }));
}

// ==================== user 模块：用户管理 ====================

/**
 * 用户管理模块（合并原 get-account + updateUserProfile + 管理端用户管理）
 * @action get          - 获取用户信息
 * @action update       - 更新用户资料
 * @action delete       - 注销账户
 * @action list         - 分页查询所有用户（管理端）
 * @action toggleStatus - 启用/禁用用户（管理端）
 */
async function userModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'get':
			return await handleGetUser(event, context);
		case 'update':
			return await handleUpdateUser(event, context);
		case 'delete':
			return await handleDeleteUser(event, context);
		case 'list':
			return await handleListUsers(event, context);
		case 'toggleStatus':
			return await handleToggleStatus(event, context);
		case 'ban':
			return await handleBanUser(event, context);
		case 'unban':
			return await handleUnbanUser(event, context);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、update、delete、list、toggleStatus、ban、unban' };
	}
}

/** 获取用户信息 */
async function handleGetUser(event, context) {
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
async function handleUpdateUser(event, context) {
	const { userId, avatarUrl, nickName, name, phone, email, gender, birthday } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		const userRes = await usersCollection.where({ _id: userId }).get();

		if (userRes.data.length === 0) {
			return { code: -1, message: '用户不存在' };
		}

		/* 手机号唯一性校验 */
		if (phone !== undefined && phone !== null && phone !== '') {
			const existingUser = await usersCollection.where({
				phone: phone,
				_id: dbCmd.neq(userId)
			}).get();
			if (existingUser.data && existingUser.data.length > 0) {
				return { code: -1, message: '该手机号已被其他用户使用' };
			}
		}

		const updateData = {};
		if (avatarUrl !== undefined && avatarUrl !== null) updateData.avatar_url = avatarUrl;
		if (nickName !== undefined && nickName !== null) updateData.nickname = nickName;
		if (name !== undefined && name !== null) updateData.name = name;
		if (phone !== undefined && phone !== null) updateData.phone = phone;
		if (email !== undefined && email !== null) updateData.email = email;
		if (gender !== undefined && gender !== null) updateData.gender = gender;
		if (birthday !== undefined && birthday !== null) updateData.birthday = birthday;

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

/** 注销账户 */
async function handleDeleteUser(event, context) {
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

/** 性别转换 */
function formatGender(gender) {
	if (gender === 'male') return '男';
	if (gender === 'female') return '女';
	return '保密';
}

/** status 转换：0→'disabled'，其他→'active' */
function formatStatus(status) {
	return status === 0 ? 'disabled' : 'active';
}

/**
 * list action：分页查询所有用户
 * 参数：page(默认1), size(默认10), keyword(搜索昵称/邮箱/手机号), status(筛选)
 */
async function handleListUsers(event, context) {
	const { page = 1, size = 10, keyword, status } = event;

	// 构建最终查询条件
	let query = {};
	if (keyword) {
		const reg = new RegExp(keyword, 'i');
		query = dbCmd.or([
			{ nickname: dbCmd.regexp(reg) },
			{ email: dbCmd.regexp(reg) },
			{ phone: dbCmd.regexp(reg) }
		]);
	}

	// status 参数转换
	if (status === 'active' || status === 'disabled') {
		const statusValue = status === 'active' ? 1 : 0;
		if (keyword) {
			query = dbCmd.and([query, { status: statusValue }]);
		} else {
			query.status = statusValue;
		}
	}

	try {
		const skip = (page - 1) * size;

		// 查询列表
		const listRes = await usersCollection
			.where(query)
			.orderBy('created_at', 'desc')
			.skip(skip)
			.limit(size)
			.get();

		// 查询总数
		const countRes = await usersCollection.where(query).count();

		// 批量查询每个用户的记录数（避免 N+1 查询）
		const userIds = listRes.data.map(u => u._id);
		const recordCountMap = {};
		if (userIds.length > 0) {
			const recordsRes = await recordsCollection
				.where({ user_id: dbCmd.in(userIds) })
				.field({ user_id: true })
				.limit(1000)
				.get();
			recordsRes.data.forEach(r => {
				recordCountMap[r.user_id] = (recordCountMap[r.user_id] || 0) + 1;
			});
		}

		// 格式化列表数据
		const list = [];
		for (const user of listRes.data) {
			// 检查封禁是否已过期，如过期则自动解封
			if (user.ban_status && user.ban_status.is_banned && !user.ban_status.is_permanent) {
				if (user.ban_status.expires_at) {
					const expiresAt = new Date(user.ban_status.expires_at).getTime();
					if (expiresAt < Date.now()) {
						// 封禁已过期，自动恢复
						await usersCollection.where({ _id: user._id }).update({
							ban_status: { is_banned: false, announcement_id: '', expires_at: null, is_permanent: false, banned_at: null },
							status: 1,
							updated_at: new Date()
						});
						user.status = 1;
						user.ban_status = { is_banned: false };
					}
				}
			}
			list.push({
				id: user._id,
				nickname: user.nickname || '',
				name: user.name || '',
				avatar_url: user.avatar_url || '',
				phone: user.phone || '',
				email: user.email || '',
				gender: formatGender(user.gender),
				birthday: user.birthday || '',
				is_member: user.is_member || 0,
				member_since: user.member_since || null,
				status: formatStatus(user.status),
				registerTime: formatDate(user.created_at),
				records: recordCountMap[user._id] || 0
			});
		}

		return {
			code: 0,
			data: {
				list,
				total: countRes.total,
				page: parseInt(page),
				size: parseInt(size)
			}
		};
	} catch (error) {
		console.error('查询用户列表失败:', error);
		return { code: -1, message: '查询失败，请重试' };
	}
}

/**
 * toggleStatus action：启用/禁用用户
 * 参数：userId, status('active'或'disabled')
 */
async function handleToggleStatus(event, context) {
	const { userId, status } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	if (status !== 'active' && status !== 'disabled') {
		return { code: -1, message: 'status 参数无效，应为 active 或 disabled' };
	}

	const statusValue = status === 'active' ? 1 : 0;

	try {
		// 直接更新，不做前置查询
		const updateRes = await usersCollection.where({ _id: userId }).update({
			status: statusValue,
			updated_at: new Date()
		});

		if (updateRes.updated === 0) {
			return { code: -1, message: '用户不存在' };
		}

		return {
			code: 0,
			message: '操作成功'
		};
	} catch (error) {
		console.error('修改用户状态失败:', error);
		return { code: -1, message: '操作失败，请重试' };
	}
}

/**
 * ban action：封禁用户
 * 参数：userId, announcementId, banDuration('1h'|'1d'|'1m'|'custom'|'permanent'), customHours(自定义小时数)
 */
async function handleBanUser(event, context) {
	const { userId, announcementId, banDuration, customHours } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}
	if (!announcementId) {
		return { code: -1, message: '封禁公告ID不能为空' };
	}

	const validDurations = ['1h', '1d', '1m', 'custom', 'permanent'];
	if (!validDurations.includes(banDuration)) {
		return { code: -1, message: '封禁时长档位无效，应为 1h/1d/1m/custom/permanent' };
	}

	try {
		const now = new Date();
		let expires_at = null;
		let is_permanent = false;

		// 根据封禁档位计算到期时间
		switch (banDuration) {
			case '1h':
				expires_at = new Date(now.getTime() + 1 * 60 * 60 * 1000);
				break;
			case '1d':
				expires_at = new Date(now.getTime() + 24 * 60 * 60 * 1000);
				break;
			case '1m':
				expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
				break;
			case 'custom':
				if (!customHours || customHours <= 0) {
					return { code: -1, message: '自定义封禁时长(customHours)必须为正数' };
				}
				expires_at = new Date(now.getTime() + parseInt(customHours) * 60 * 60 * 1000);
				break;
			case 'permanent':
				// 永久封禁：无到期时间
				is_permanent = true;
				break;
		}

		// 更新用户封禁状态和账号状态
		const updateRes = await usersCollection.where({ _id: userId }).update({
			ban_status: {
				is_banned: true,
				announcement_id: announcementId,
				expires_at: expires_at,
				is_permanent: is_permanent,
				banned_at: now
			},
			status: 0,
			updated_at: now
		});

		if (updateRes.updated === 0) {
			return { code: -1, message: '用户不存在' };
		}

		return {
			code: 0,
			message: '封禁成功',
			data: { expires_at }
		};
	} catch (error) {
		console.error('封禁用户失败:', error);
		return { code: -1, message: '封禁失败，请重试' };
	}
}

/**
 * unban action：解封用户
 * 参数：userId
 */
async function handleUnbanUser(event, context) {
	const { userId } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		// 清除用户封禁状态和恢复账号状态
		const updateRes = await usersCollection.where({ _id: userId }).update({
			ban_status: {
				is_banned: false,
				announcement_id: '',
				expires_at: null,
				is_permanent: false,
				banned_at: null
			},
			status: 1,
			updated_at: new Date()
		});

		if (updateRes.updated === 0) {
			return { code: -1, message: '用户不存在' };
		}

		return { code: 0, message: '已解封' };
	} catch (error) {
		console.error('解封用户失败:', error);
		return { code: -1, message: '解封失败，请重试' };
	}
}

// ==================== records 模块：记录管理 ====================

/**
 * 排便记录管理模块（合并原 get-records + save-record + 管理端记录管理）
 * @action get       - 获取用户记录列表（按年月筛选）
 * @action add       - 保存新记录
 * @action list      - 分页查询所有记录（管理端）
 * @action getDetail - 查询单条记录详情
 * @action delete    - 删除记录
 */

/** 布里斯托类型中文映射 */
const bristolTypeMap = {
	1: '一型', 2: '二型', 3: '三型', 4: '四型',
	5: '五型', 6: '六型', 7: '七型'
};

/** 布里斯托类型描述映射 */
const bristolDescMap = {
	1: '硬球状，排便困难',
	2: '肠状但凹凸不平',
	3: '肠状但有裂纹',
	4: '光滑柔软香肠状',
	5: '柔软块状，边缘清晰',
	6: '糊状，边缘模糊',
	7: '水样，无固体'
};

/** 布里斯托类型配色映射 */
const bristolColorMap = {
	1: '#2C2C2C', 2: '#8D4B00', 3: '#D4A373', 4: '#6B8E23',
	5: '#D4A373', 6: '#A52A2A', 7: '#A52A2A'
};

/** 布里斯托类型健康评分映射 */
const bristolScoreMap = {
	1: 2, 2: 3, 3: 4, 4: 5, 5: 4, 6: 3, 7: 1
};

/** 中文类型转数字（'一型'→1 ... '七型'→7） */
function parseType(type) {
	if (type === undefined || type === null || type === '') return null;
	const num = parseInt(type);
	if (!isNaN(num) && num >= 1 && num <= 7) return num;
	const chineseMap = { '一型': 1, '二型': 2, '三型': 3, '四型': 4, '五型': 5, '六型': 6, '七型': 7 };
	if (typeof type === 'string' && chineseMap[type] !== undefined) return chineseMap[type];
	return null;
}

/** feeling 映射为中文 mood */
function formatMood(feeling) {
	const map = { smooth: '顺畅', effortful: '费力', diarrhea: '腹泻感' };
	return map[feeling] || feeling || '';
}

async function recordsModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'get':
			return await handleGetRecords(event);
		case 'add':
			return await handleSaveRecord(event);
		case 'list':
			return await handleListRecords(event);
		case 'getDetail':
			return await handleGetRecordDetail(event);
		case 'delete':
			return await handleDeleteRecord(event);
		case 'update':
			return await handleUpdateRecord(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、add、list、getDetail、delete、update' };
	}
}

/** 获取用户记录列表（按年月筛选） */
async function handleGetRecords(event) {
	const { userId, year, month } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	let condition = { user_id: userId };

	if (year && month) {
		const startDate = new Date(Date.UTC(year, month - 1, 1));
		const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
		condition.created_at = dbCmd.gte(startDate).and(dbCmd.lte(endDate));
	}

	const result = await recordsCollection.where(condition).orderBy('created_at', 'desc').get();

	return {
		code: 0,
		message: '获取成功',
		data: result.data
	};
}

/** 保存新记录 */
async function handleSaveRecord(event) {
	const { userId, type, color, feeling, note, duration, isMenstruation, date, water, fiber } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

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

/**
 * 批量格式化记录列表（避免 N+1 查询）
 * @param {Array} records - 原始记录数组
 * @returns {Array} - 格式化后的记录数组
 */
async function formatRecordsBatch(records) {
	if (!records || records.length === 0) return [];

	// 1. 收集所有 user_id，去重
	const userIdSet = new Set();
	for (const r of records) {
		if (r.user_id) userIdSet.add(r.user_id);
	}
	const userIds = [...userIdSet];

	// 2. 一次性查询所有相关用户（取 _id、nickname、avatar_url、email）
	let userMap = {};
	if (userIds.length > 0) {
		try {
			const userRes = await usersCollection
				.where({ _id: dbCmd.in(userIds) })
				.field({ _id: true, nickname: true, avatar_url: true, email: true })
				.get();
			for (const u of userRes.data) {
				// 存储用户对象，供记录格式化时关联头像与邮箱
				userMap[u._id] = {
					nickname: u.nickname || '',
					avatar_url: u.avatar_url || '',
					email: u.email || ''
				};
			}
		} catch (e) {
			// 忽略用户查询失败
		}
	}

	// 3. 格式化每条记录
	return records.map((record) => {
		const type = parseInt(record.type) || 0;
		// 关联当前记录对应的用户信息（昵称、头像、邮箱）
		const userInfo = userMap[record.user_id] || {};
		return {
			id: record._id,
			userId: record.user_id || '',
			userName: userInfo.nickname || '',
			avatar_url: userInfo.avatar_url || '',
			email: userInfo.email || '',
			bristolType: bristolTypeMap[type] || '',
			bristolDesc: bristolDescMap[type] || '',
			color: bristolColorMap[type] || '',
			healthScore: bristolScoreMap[type] || 0,
			feeling: record.feeling || '',
			mood: formatMood(record.feeling),
			note: record.note || '',
			duration: record.duration ? parseInt(record.duration / 60) : 0,
			water: record.water || 0,
			fiber: record.fiber || 0,
			is_menstruation: record.is_menstruation || false,
			recordTime: formatDate(record.created_at)
		};
	});
}

/**
 * list action：分页查询所有记录
 * 参数：page(默认1), size(默认10), keyword(搜索用户名), type(布里斯托类型筛选)
 */
async function handleListRecords(event, context) {
	const { page = 1, size = 10, keyword, type } = event;

	// 构建查询条件
	let query = {};

	// type 参数：如果是中文（'一型'~'七型'）转为数字 1-7
	if (type !== undefined && type !== null && type !== '') {
		const typeNum = parseType(type);
		if (typeNum !== null) {
			query.type = typeNum;
		}
	}

	// keyword：先查 users 表匹配 nickname，得到 userId 列表
	if (keyword) {
		try {
			const reg = new RegExp(keyword, 'i');
			const userRes = await usersCollection
				.where({ nickname: dbCmd.regexp(reg) })
				.field({ _id: true })
				.get();
			const userIds = userRes.data.map((u) => u._id);

			if (userIds.length === 0) {
				// 没有匹配的用户，直接返回空列表
				return {
					code: 0,
					data: {
						list: [],
						total: 0,
						page: parseInt(page),
						size: parseInt(size)
					}
				};
			}

			const user_id_in = dbCmd.in(userIds);
			if (query.type !== undefined) {
				query = dbCmd.and([query, { user_id: user_id_in }]);
			} else {
				query.user_id = user_id_in;
			}
		} catch (e) {
			console.error('查询用户失败:', e);
			return { code: -1, message: '查询失败，请重试' };
		}
	}

	try {
		const skip = (page - 1) * size;

		// 并行查询列表和总数
		const [listRes, countRes] = await Promise.all([
			recordsCollection
				.where(query)
				.orderBy('created_at', 'desc')
				.skip(skip)
				.limit(size)
				.get(),
			recordsCollection.where(query).count()
		]);

		// 批量格式化（1 次查询用户名，替代 N 次）
		const list = await formatRecordsBatch(listRes.data);

		return {
			code: 0,
			data: {
				list,
				total: countRes.total,
				page: parseInt(page),
				size: parseInt(size)
			}
		};
	} catch (error) {
		console.error('查询记录列表失败:', error);
		return { code: -1, message: '查询失败，请重试' };
	}
}

/**
 * getDetail action：查询单条记录详情
 * 参数：recordId
 */
async function handleGetRecordDetail(event, context) {
	const { recordId } = event;

	if (!recordId) {
		return { code: -1, message: '记录ID不能为空' };
	}

	try {
		const res = await recordsCollection.where({ _id: recordId }).get();

		if (res.data.length === 0) {
			return { code: -1, message: '记录不存在' };
		}

		const record = (await formatRecordsBatch(res.data))[0];

		return {
			code: 0,
			data: record
		};
	} catch (error) {
		console.error('查询记录详情失败:', error);
		return { code: -1, message: '查询失败，请重试' };
	}
}

/**
 * delete action：删除记录
 * 参数：recordId
 */
async function handleDeleteRecord(event, context) {
	const { recordId } = event;

	if (!recordId) {
		return { code: -1, message: '记录ID不能为空' };
	}

	try {
		// 直接删除，不做前置查询
		const removeRes = await recordsCollection.where({ _id: recordId }).remove();

		if (removeRes.deleted === 0) {
			return { code: -1, message: '记录不存在' };
		}

		return {
			code: 0,
			message: '删除成功'
		};
	} catch (error) {
		console.error('删除记录失败:', error);
		return { code: -1, message: '删除失败，请重试' };
	}
}

/** 修改健康记录 */
async function handleUpdateRecord(event, context) {
	const { recordId, bristol_type, score, feeling, duration, water_intake, fiber_intake } = event;

	if (!recordId) {
		return { code: -1, message: '记录ID不能为空' };
	}

	try {
		const updateData = {};
		// 仅更新实际传入的字段，未传字段保持原值
		if (bristol_type !== undefined && bristol_type !== null) updateData.bristol_type = Number(bristol_type);
		if (score !== undefined && score !== null) updateData.score = Number(score);
		if (feeling !== undefined && feeling !== null) updateData.feeling = feeling;
		if (duration !== undefined && duration !== null) updateData.duration = Number(duration);
		if (water_intake !== undefined && water_intake !== null) updateData.water_intake = Number(water_intake);
		if (fiber_intake !== undefined && fiber_intake !== null) updateData.fiber_intake = Number(fiber_intake);
		updateData.updated_at = new Date();

		await recordsCollection.where({ _id: recordId }).update(updateData);

		return { code: 0, message: '修改成功' };
	} catch (error) {
		console.error('修改记录失败:', error);
		return { code: -1, message: '修改失败，请重试' };
	}
}

// ==================== article 模块：文章管理 ====================

/**
 * 文章管理模块
 * @action list      - 获取文章列表（分页、筛选）
 * @action get       - 获取单篇文章详情
 * @action increment - 增加统计数（view/like/share/comment/favorite）
 * @action decrement - 减少统计数（like/favorite）
 * @action like      - 点赞/取消点赞
 * @action favorite  - 收藏/取消收藏
 * @action check     - 检查用户是否已点赞/收藏
 * @action create    - 新建文章
 * @action update    - 更新文章
 * @action toggle    - 发布/下架、置顶切换
 * @action delete    - 删除文章（软删除）
 */

/**
 * 从 HTML content 中提取所有 img 标签信息
 * @param {string} content - HTML 正文
 * @returns {Array} - [{url, alt, sort}]
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

async function articleModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'list':
			return await handleGetArticleList(event);
		case 'get':
			return await handleGetArticle(event);
		case 'increment':
			return await handleIncrementStats(event);
		case 'decrement':
			return await handleDecrementStats(event);
		case 'like':
			return await handleToggleLike(event);
		case 'favorite':
			return await handleToggleFavorite(event);
		case 'check':
			return await handleCheckUserStatus(event);
		case 'create':
			return await handleCreateArticle(event);
		case 'update':
			return await handleUpdateArticle(event);
		case 'toggle':
			return await handleToggle(event);
		case 'delete':
			return await handleDeleteArticle(event);
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
async function handleGetArticleList(event) {
	const { page = 1, size = 10, category_id, category, keyword, status, tag } = event;

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
		whereCondition.status = dbCmd.neq(2);
	}

	// category 兼容处理：category_id 优先，否则用 category 匹配 category_name
	if (category_id) {
		whereCondition.category_id = category_id;
	} else if (category) {
		whereCondition.category_name = category;
	}

	if (tag) {
		whereCondition.tags = dbCmd.in([tag]);
	}

	// keyword 同时匹配标题和作者名
	if (keyword) {
		const reg = dbCmd.regexp({ regexp: keyword, options: 'i' });
		const keywordOr = dbCmd.or([
			{ title: reg },
			{ author_name: reg }
		]);
		if (Object.keys(whereCondition).length > 0) {
			whereCondition = dbCmd.and([whereCondition, keywordOr]);
		} else {
			whereCondition = keywordOr;
		}
	}

	const skip = (page - 1) * size;

	try {
		// 不使用 .field()，避免 SDK 内部 bug（Cannot assign to read only property）
		const result = await articleCollection
			.where(whereCondition)
			.orderBy('is_top', 'desc')
			.orderBy('top_level', 'desc')
			.orderBy('is_recommend', 'desc')
			.orderBy('recommend_level', 'desc')
			.orderBy('publish_time', 'desc')
			.skip(skip)
			.limit(size)
			.get();

		const countResult = await articleCollection
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
async function handleGetArticle(event) {
	const { article_id } = event;

	if (!article_id) {
		return { code: -1, message: '文章ID不能为空' };
	}

	// 管理端不限制 status，客户端传 include_all=true 时也不限制
	const query = event.include_all
		? { _id: article_id }
		: { _id: article_id, status: dbCmd.neq(2) };
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
async function handleIncrementStats(event) {
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
			[field]: dbCmd.inc(1),
			update_time: new Date()
		});

		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新统计失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/** 减少统计数（取消点赞、取消收藏） */
async function handleDecrementStats(event) {
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
			[field]: dbCmd.inc(-1),
			update_time: new Date()
		});

		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新统计失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/** 点赞/取消点赞（带用户去重） */
async function handleToggleLike(event) {
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
				like_count: dbCmd.inc(-1),
				like_user_ids: dbCmd.pull(user_id),
				update_time: new Date()
			});
			return { code: 0, message: '已取消点赞', data: { isLiked: false } };
		} else {
			// 点赞
			await articleCollection.where({ _id: article_id }).update({
				like_count: dbCmd.inc(1),
				like_user_ids: dbCmd.push(user_id),
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
async function handleToggleFavorite(event) {
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
				favorite_count: dbCmd.inc(-1),
				favorite_user_ids: dbCmd.pull(user_id),
				update_time: new Date()
			});
			return { code: 0, message: '已取消收藏', data: { isFavorited: false } };
		} else {
			// 收藏
			await articleCollection.where({ _id: article_id }).update({
				favorite_count: dbCmd.inc(1),
				favorite_user_ids: dbCmd.push(user_id),
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
async function handleCheckUserStatus(event) {
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
async function handleCreateArticle(event) {
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
async function handleUpdateArticle(event) {
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
async function handleToggle(event) {
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
async function handleDeleteArticle(event) {
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

// ==================== ranking 模块：排行榜 ====================

/** 默认头像 URL */
const DEFAULT_AVATAR = 'https://mp-f42efd9e-c609-4a2c-b2be-ac4ef0aadc6e.cdn.bspapp.com/serenegut_images/user-avatar/default.jpg';

/**
 * 排行榜模块（当日蹲坑排行榜）
 * @action get     - 获取当日排行榜（客户端使用）
 * @action list    - 获取排行榜列表（管理端使用）
 * @action disable - 禁用某用户的排行展示
 * @action enable  - 启用某用户的排行展示
 * @action delete  - 从排行榜删除用户并清除其健康记录
 */

/** 获取今日时间范围（北京时间） */
function getTodayRange() {
	const now = new Date();
	const beijingOffset = 8 * 60 * 60 * 1000;
	const beijingTime = new Date(now.getTime() + beijingOffset);
	const todayStart = new Date(Date.UTC(beijingTime.getUTCFullYear(), beijingTime.getUTCMonth(), beijingTime.getUTCDate()));
	const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
	return { todayStart, todayEnd };
}

/** 将秒数格式化为 mm:ss */
function formatDuration(seconds) {
	if (!seconds || seconds <= 0) return '00:00';
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function rankingModule(event, context) {
	const { action = 'get' } = event;

	switch (action) {
		case 'get':
			return await handleGetRanking(event);
		case 'list':
			return await handleRankingList(event);
		case 'disable':
			return await handleRankingDisable(event);
		case 'enable':
			return await handleRankingEnable(event);
		case 'delete':
			return await handleRankingDelete(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、list、disable、enable、delete' };
	}
}

/** 客户端接口：获取当日排行榜 */
async function handleGetRanking(event) {
	const { userId, size = 10 } = event;

	const { todayStart, todayEnd } = getTodayRange();

	try {
		let rankedList = [];
		try {
			const aggregateRes = await recordsCollection
				.aggregate()
				.match({
					created_at: { $gte: todayStart, $lte: todayEnd },
					duration: { $gt: 0 }
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

			const todayRecords = await recordsCollection
				.where({
					created_at: dbCmd.gte(todayStart).and(dbCmd.lte(todayEnd)),
					duration: dbCmd.gt(0)
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

		const topUserIds = rankedList.slice(0, size).map(item => item._id);

		const usersRes = await usersCollection
			.where({ _id: dbCmd.in(topUserIds) })
			.get();

		const userMap = {};
		usersRes.data.forEach(u => {
			userMap[u._id] = {
				name: u.nickname || '匿名用户',
				avatar: u.avatar_url || DEFAULT_AVATAR
			};
		});

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

/** 管理端接口：获取排行榜列表 */
async function handleRankingList(event) {
	const { keyword, searchType = 'nickname', size = 100 } = event;

	const { todayStart, todayEnd } = getTodayRange();

	try {
		// 1. 查询所有用户（不限 status，兼容无 status 字段的旧数据）
		const userRes = await usersCollection.limit(1000).get();
		let users = userRes.data;

		// 2. keyword 筛选（根据 searchType 按昵称 / 手机号 / 用户ID 搜索）
		if (keyword) {
			users = users.filter((u) => {
				// 按用户ID搜索
				if (searchType === 'id') {
					return (u._id || '').includes(keyword);
				} else if (searchType === 'phone') {
					// 按手机号搜索，兼容 phone / mobile 两种字段
					return (u.phone || u.mobile || '').includes(keyword);
				}
				// 默认按昵称搜索
				return (u.nickname || '').includes(keyword);
			});
		}

		if (users.length === 0) {
			return { code: 0, data: { list: [], totalUsers: 0 } };
		}

		// 3. 分离未禁用和已禁用排行的用户
		const activeUsers = users.filter((u) => u.ranking_disabled !== true);
		const disabledUsers = users.filter((u) => u.ranking_disabled === true);

		// 4. 聚合查询当日记录
		let rankedList = [];
		const activeUserIds = activeUsers.map((u) => u._id);

		if (activeUserIds.length > 0) {
			try {
				const aggregateRes = await recordsCollection
					.aggregate()
					.match({
						user_id: dbCmd.in(activeUserIds),
						created_at: { $gte: todayStart, $lte: todayEnd },
						duration: { $gt: 0 }
					})
					.group({
						_id: '$user_id',
						total_duration: { $sum: '$duration' },
						record_count: { $sum: 1 }
					})
					.sort({ total_duration: -1 })
					.limit(size)
					.end();

				rankedList = aggregateRes.data || [];
			} catch (aggError) {
				console.warn('聚合查询失败，降级为普通查询:', aggError.message);

				const todayRecords = await recordsCollection
					.where({
						user_id: dbCmd.in(activeUserIds),
						created_at: dbCmd.gte(todayStart).and(dbCmd.lte(todayEnd)),
						duration: dbCmd.gt(0)
					})
					.limit(1000)
					.get();

				const groupMap = {};
				todayRecords.data.forEach((record) => {
					const uid = record.user_id;
					if (!groupMap[uid]) {
						groupMap[uid] = { _id: uid, total_duration: 0, record_count: 0 };
					}
					groupMap[uid].total_duration += record.duration || 0;
					groupMap[uid].record_count += 1;
				});

				rankedList = Object.values(groupMap).sort((a, b) => b.total_duration - a.total_duration);
			}
		}

		// 5. 构建用户信息映射
		const userMap = {};
		users.forEach((u) => {
			userMap[u._id] = {
				name: u.nickname || '匿名用户',
				avatar: u.avatar_url || DEFAULT_AVATAR,
				disabled: u.ranking_disabled === true
			};
		});

		// 6. 构建排行榜（有记录的活跃用户）
		const medalMap = { 1: 'gold', 2: 'silver', 3: 'bronze' };
		const list = rankedList.slice(0, size).map((item, index) => {
			const rank = index + 1;
			const userInfo = userMap[item._id] || { name: '匿名用户', avatar: DEFAULT_AVATAR, disabled: false };
			return {
				rank,
				userId: item._id,
				name: userInfo.name,
				avatar: userInfo.avatar,
				time: formatDuration(item.total_duration),
				totalDuration: item.total_duration || 0,
				recordCount: item.record_count || 0,
				disabled: false,
				medal: medalMap[rank] || ''
			};
		});

		// 7. 追加今日无记录的活跃用户
		const rankedIds = new Set(rankedList.map((item) => item._id));
		activeUsers.forEach((u) => {
			if (!rankedIds.has(u._id)) {
				const userInfo = userMap[u._id] || { name: '匿名用户', avatar: DEFAULT_AVATAR };
				list.push({
					rank: 0,
					userId: u._id,
					name: userInfo.name,
					avatar: userInfo.avatar,
					time: '00:00',
					totalDuration: 0,
					recordCount: 0,
					disabled: false,
					medal: ''
				});
			}
		});

		// 8. 追加被禁用排行的用户
		disabledUsers.forEach((u) => {
			const userInfo = userMap[u._id] || { name: '匿名用户', avatar: DEFAULT_AVATAR };
			list.push({
				rank: 0,
				userId: u._id,
				name: userInfo.name,
				avatar: userInfo.avatar,
				time: '00:00',
				totalDuration: 0,
				recordCount: 0,
				disabled: true,
				medal: ''
			});
		});

		return {
			code: 0,
			data: {
				list,
				totalUsers: rankedList.length
			}
		};
	} catch (error) {
		console.error('获取排行榜失败:', error);
		return { code: -1, message: '获取排行榜失败，请重试' };
	}
}

/** 管理端接口：禁用某用户的排行展示 */
async function handleRankingDisable(event) {
	const { userId } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		const updateRes = await usersCollection.where({ _id: userId }).update({
			ranking_disabled: true,
			updated_at: new Date()
		});

		if (updateRes.updated === 0) {
			return { code: -1, message: '用户不存在' };
		}

		return { code: 0, message: '已禁用该用户的排行展示' };
	} catch (error) {
		console.error('禁用排行展示失败:', error);
		return { code: -1, message: '禁用失败，请重试' };
	}
}

/** 管理端接口：启用某用户的排行展示 */
async function handleRankingEnable(event) {
	const { userId } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		const updateRes = await usersCollection.where({ _id: userId }).update({
			ranking_disabled: false,
			updated_at: new Date()
		});

		if (updateRes.updated === 0) {
			return { code: -1, message: '用户不存在' };
		}

		return { code: 0, message: '已启用该用户的排行展示' };
	} catch (error) {
		console.error('启用排行展示失败:', error);
		return { code: -1, message: '启用失败，请重试' };
	}
}

/** 管理端接口：从排行榜删除用户并清除其健康记录 */
async function handleRankingDelete(event) {
	const { userId } = event;

	if (!userId) {
		return { code: -1, message: '用户ID不能为空' };
	}

	try {
		await Promise.all([
			recordsCollection.where({ user_id: userId }).remove(),
			usersCollection.where({ _id: userId }).update({
				ranking_disabled: true,
				updated_at: new Date()
			})
		]);

		return { code: 0, message: '已从排行榜删除该用户及其健康记录' };
	} catch (error) {
		console.error('删除排行榜用户失败:', error);
		return { code: -1, message: '删除失败，请重试' };
	}
}

// ==================== config 模块：应用配置 ====================

/**
 * 应用配置模块（合并原 get-app-config + update-app-config）
 * @action get    - 获取全局应用配置
 * @action update - 更新应用配置（支持批量同步参数和AI相关参数）
 */
async function configModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'get':
			return await handleGetConfig(event);
		case 'update':
			return await handleUpdateConfig(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：get、update' };
	}
}

/**
 * 获取全局应用配置
 * 客户端启动时调用，读取 batch_interval 等参数
 */
// 应用配置默认值（无配置或读取异常时返回前端所需的完整字段）
function getDefaultAppConfig() {
	return {
		batch_interval: 600,
		batch_enabled: true,
		aiReportEnabled: true,
		registrationEnabled: true,
		rankingEnabled: true,
		maintenanceMode: false,
		maintenanceAnnouncement: '',
		appName: '肠道健康管家',
		appVersion: '1.0.0',
		contactEmail: '',
		hotline: '',
		rankingMarqueeText: '',
		cooperationTitle: '',
		cooperationDesc: '',
		wechatService: '',
		contactPhone: '',
		companyPhilosophy: ''
	};
}

async function handleGetConfig(event) {
	try {
		const res = await db.collection('app_config').doc('sync_config').get();

		if (res.data && res.data.length > 0) {
			// 规范化配置：保留原字段并补充前端使用的字段，缺失时回退到默认值
			const config = res.data[0];
			return {
				code: 0,
				data: {
					...config,
					registrationEnabled: config.registrationEnabled ?? true,
					aiReportEnabled: config.aiReportEnabled ?? config.ai_report_enabled ?? true,
					rankingEnabled: config.rankingEnabled ?? true,
					maintenanceMode: config.maintenanceMode ?? false,
					maintenanceAnnouncement: config.maintenanceAnnouncement || '',
					appName: config.appName || '肠道健康管家',
					appVersion: config.appVersion || '1.0.0',
					contactEmail: config.contactEmail || '',
					hotline: config.hotline || '',
					rankingMarqueeText: config.rankingMarqueeText || '',
					cooperationTitle: config.cooperationTitle || '',
					cooperationDesc: config.cooperationDesc || '',
					wechatService: config.wechatService || '',
					contactPhone: config.contactPhone || '',
					companyPhilosophy: config.companyPhilosophy || ''
				}
			};
		}

		// 没有配置文档则返回默认值
		return {
			code: 0,
			data: getDefaultAppConfig()
		};
	} catch (error) {
		console.error('获取配置失败:', error);
		return {
			code: -1,
			message: '获取配置失败',
			data: getDefaultAppConfig()
		};
	}
}

/**
 * 更新应用配置（增强版）
 * 同时支持批量同步参数和AI相关参数
 *
 * @参数：
 *   batch_interval - 批量同步间隔（秒），最小30
 *   batch_enabled  - 是否启用批量同步
 *   ai_provider    - AI服务商
 *   ai_api_url     - AI接口地址
 *   ai_api_key     - AI密钥
 *   ai_model       - AI模型名称
 *   aiReportEnabled - 是否启用AI报告功能
 */
async function handleUpdateConfig(event) {
	const { batch_interval, batch_enabled, ai_provider, ai_api_url, ai_api_key, ai_model, aiReportEnabled,
		registrationEnabled, rankingEnabled, maintenanceMode, maintenanceAnnouncement,
		appName, appVersion, contactEmail, hotline,
		rankingMarqueeText, cooperationTitle, cooperationDesc,
		wechatService, contactPhone, companyPhilosophy,
		huawei_client_id, huawei_client_secret, huawei_scopes } = event;

	// 验证 batch_interval
	if (batch_interval !== undefined && (typeof batch_interval !== 'number' || batch_interval < 30)) {
		return { code: -1, message: '同步间隔不能少于 30 秒' };
	}

	try {
		const updateData = { updated_at: new Date() };

		// 批量同步参数
		if (batch_interval !== undefined) updateData.batch_interval = batch_interval;
		if (batch_enabled !== undefined) updateData.batch_enabled = batch_enabled;

		// AI 相关参数
		if (ai_provider !== undefined) updateData.ai_provider = ai_provider;
		if (ai_api_url !== undefined) updateData.ai_api_url = ai_api_url;
		if (ai_api_key !== undefined) updateData.ai_api_key = ai_api_key;
		if (ai_model !== undefined) updateData.ai_model = ai_model;
		if (aiReportEnabled !== undefined) updateData.aiReportEnabled = aiReportEnabled;

		// 功能开关及应用信息参数
		if (registrationEnabled !== undefined) updateData.registrationEnabled = registrationEnabled;
		if (rankingEnabled !== undefined) updateData.rankingEnabled = rankingEnabled;
		if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode;
		if (maintenanceAnnouncement !== undefined) updateData.maintenanceAnnouncement = maintenanceAnnouncement;
		if (appName !== undefined) updateData.appName = appName;
		if (appVersion !== undefined) updateData.appVersion = appVersion;
		if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
		if (hotline !== undefined) updateData.hotline = hotline;
		if (rankingMarqueeText !== undefined) updateData.rankingMarqueeText = rankingMarqueeText;
		if (cooperationTitle !== undefined) updateData.cooperationTitle = cooperationTitle;
		if (cooperationDesc !== undefined) updateData.cooperationDesc = cooperationDesc;
		if (wechatService !== undefined) updateData.wechatService = wechatService;
		if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
		if (companyPhilosophy !== undefined) updateData.companyPhilosophy = companyPhilosophy;

		// 华为运动健康接入参数
		if (huawei_client_id !== undefined) updateData.huawei_client_id = huawei_client_id;
		if (huawei_client_secret !== undefined) updateData.huawei_client_secret = huawei_client_secret;
		if (huawei_scopes !== undefined) updateData.huawei_scopes = huawei_scopes;

		await db.collection('app_config').doc('sync_config').set(updateData);

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

// ==================== ai_model 模块：AI模型管理（新增） ====================

/**
 * AI模型管理模块
 * 操作 ai_models 数据库表
 * @action list   - 获取所有AI模型列表（按sort排序，is_active优先）
 * @action create - 新建AI模型
 * @action update - 更新AI模型
 * @action delete - 删除AI模型
 * @action toggle - 启用某模型（同时禁用其他所有模型）
 *
 * ai_models 表字段：_id, name, provider, api_url, api_key, model, is_active(bool), sort(int), created_at, updated_at
 */
async function aiModelModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'list':
			return await handleListAiModels(event);
		case 'create':
			return await handleCreateAiModel(event);
		case 'update':
			return await handleUpdateAiModel(event);
		case 'delete':
			return await handleDeleteAiModel(event);
		case 'toggle':
			return await handleToggleAiModel(event);
		case 'test':
			return await handleTestAiModel(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：list、create、update、delete、toggle、test' };
	}
}

/**
 * 获取所有AI模型列表
 * 按 sort 升序排列，is_active=true 的模型排在最前面
 */
async function handleListAiModels(event) {
	try {
		// 先按 is_active 降序（true在前），再按 sort 升序
		const result = await aiModelsCollection
			.orderBy('is_active', 'desc')
			.orderBy('sort', 'asc')
			.limit(100)
			.get();

		const list = result.data.map(item => ({
			id: item._id,
			name: item.name || '',
			provider: item.provider || '',
			api_url: item.api_url || '',
			api_key: item.api_key || '',
			model: item.model || '',
			is_active: item.is_active || false,
			sort: item.sort || 0,
			created_at: formatDate(item.created_at),
			updated_at: formatDate(item.updated_at)
		}));

		return {
			code: 0,
			data: { list }
		};
	} catch (error) {
		console.error('获取AI模型列表失败:', error);
		return { code: -1, message: '获取列表失败' };
	}
}

/**
 * 新建AI模型
 * 参数：name, provider, api_url, api_key, model, sort
 */
async function handleCreateAiModel(event) {
	const { name, provider, api_url, api_key, model, sort } = event;

	if (!name) {
		return { code: -1, message: '模型名称不能为空' };
	}

	try {
		const now = new Date();
		const result = await aiModelsCollection.add({
			name,
			provider: provider || '',
			api_url: api_url || '',
			api_key: api_key || '',
			model: model || '',
			is_active: false,
			sort: parseInt(sort) || 0,
			created_at: now,
			updated_at: now
		});

		return {
			code: 0,
			message: '创建成功',
			data: { id: result.id }
		};
	} catch (error) {
		console.error('创建AI模型失败:', error);
		return { code: -1, message: '创建失败' };
	}
}

/**
 * 更新AI模型
 * 参数：id, 以及需要更新的字段（name, provider, api_url, api_key, model, sort）
 */
async function handleUpdateAiModel(event) {
	const { id, name, provider, api_url, api_key, model, sort } = event;

	if (!id) {
		return { code: -1, message: '模型ID不能为空' };
	}

	const updateData = { updated_at: new Date() };

	if (name !== undefined) updateData.name = name;
	if (provider !== undefined) updateData.provider = provider;
	if (api_url !== undefined) updateData.api_url = api_url;
	if (api_key !== undefined) updateData.api_key = api_key;
	if (model !== undefined) updateData.model = model;
	if (sort !== undefined) updateData.sort = parseInt(sort);

	try {
		const updateRes = await aiModelsCollection.where({ _id: id }).update(updateData);

		if (updateRes.updated === 0) {
			return { code: -1, message: '模型不存在' };
		}

		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新AI模型失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/**
 * 删除AI模型
 * 参数：id
 */
async function handleDeleteAiModel(event) {
	const { id } = event;

	if (!id) {
		return { code: -1, message: '模型ID不能为空' };
	}

	try {
		const removeRes = await aiModelsCollection.where({ _id: id }).remove();

		if (removeRes.deleted === 0) {
			return { code: -1, message: '模型不存在' };
		}

		return { code: 0, message: '删除成功' };
	} catch (error) {
		console.error('删除AI模型失败:', error);
		return { code: -1, message: '删除失败' };
	}
}

/**
 * 启用某模型
 * 将该模型设为 is_active=true，同时将其他所有模型设为 is_active=false
 * 参数：id
 */
async function handleToggleAiModel(event) {
	const { id } = event;

	if (!id) {
		return { code: -1, message: '模型ID不能为空' };
	}

	try {
		/* 查询当前模型的启用状态 */
		const curRes = await aiModelsCollection.where({ _id: id }).limit(1).get();
		if (!curRes.data || curRes.data.length === 0) {
			return { code: -1, message: '模型不存在' };
		}

		const isCurrentlyActive = curRes.data[0].is_active === true;
		const now = new Date();

		if (isCurrentlyActive) {
			/* 当前已启用 → 取消启用 */
			await aiModelsCollection.where({ _id: id }).update({
				is_active: false,
				updated_at: now
			});
			return { code: 0, message: '已取消启用', data: { is_active: false } };
		} else {
			/* 当前未启用 → 先将所有模型设为未启用，再启用指定模型 */
			await aiModelsCollection.where({ is_active: true }).update({
				is_active: false,
				updated_at: now
			});
			await aiModelsCollection.where({ _id: id }).update({
				is_active: true,
				updated_at: now
			});
			return { code: 0, message: '已启用该模型', data: { is_active: true } };
		}
	} catch (error) {
		console.error('切换AI模型状态失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

/**
 * 测试AI模型连接
 * 优先使用启用的模型配置，降级到 app_config 中的 AI 配置
 * 参数：id（可选，指定测试某个模型；不传则测试当前启用的模型）
 */
async function handleTestAiModel(event) {
	const { id } = event;

	let apiKey, apiUrl, modelName;

	try {
		// 如果指定了 id，测试该模型；否则测试当前启用的模型
		let modelData = null;
		if (id) {
			const res = await aiModelsCollection.where({ _id: id }).limit(1).get();
			modelData = res.data && res.data[0];
		} else {
			const res = await aiModelsCollection.where({ is_active: true }).limit(1).get();
			modelData = res.data && res.data[0];
		}

		if (modelData) {
			apiKey = modelData.api_key;
			apiUrl = modelData.api_url;
			modelName = modelData.model;
		}
	} catch (e) {
		console.warn('[ai_model] 读取模型配置失败:', e.message);
	}

	// 降级到 app_config 表
	if (!apiKey || !apiUrl) {
		try {
			const cfgRes = await db.collection('app_config').doc('sync_config').get();
			if (cfgRes.data && cfgRes.data.length > 0) {
				const cfg = cfgRes.data[0];
				apiKey = apiKey || cfg.ai_api_key;
				apiUrl = apiUrl || cfg.ai_api_url;
				modelName = modelName || cfg.ai_model;
			}
		} catch (e) {
			console.warn('[ai_model] 读取app_config失败:', e.message);
		}
	}

	if (!apiKey || !apiUrl || !modelName) {
		return { code: -1, message: '未找到AI模型配置，请先添加并启用模型' };
	}

	// 发送测试请求
	const response = await uniCloud.httpclient.request(apiUrl, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		data: {
			model: modelName,
			messages: [{ role: 'user', content: '请回复"连接成功"' }],
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
			data: { model: modelName, reply: reply.substring(0, 100) }
		};
	} else {
		return {
			code: -1,
			message: `API返回异常: ${response.status} ${JSON.stringify(response.data).substring(0, 200)}`
		};
	}
}

// ==================== device 模块：用户设备与健康数据 ====================
// action: list

async function deviceModule(event, context) {
	const { action } = event;
	switch (action) {
		case 'list':
			return await deviceList(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：list' };
	}
}

/** 设备列表：绑定信息 + 最近一次健康数据（不返回 token） */
async function deviceList(event) {
	const { page = 1, size = 20 } = event;
	const skip = (page - 1) * size;

	const result = await healthDevicesCollection
		.orderBy('last_sync_at', 'desc')
		.skip(skip)
		.limit(size)
		.get();
	const total = await healthDevicesCollection.count();

	const userIds = result.data.map(d => d.user_id);
	const userMap = {};
	const metricsMap = {};

	if (userIds.length > 0) {
		const users = await usersCollection.where({ _id: dbCmd.in(userIds) }).get();
		users.data.forEach(u => {
			userMap[u._id] = u.nickname || u.name || u.phone || u.email || '用户';
		});

		const metrics = await healthMetricsCollection
			.where({ user_id: dbCmd.in(userIds) })
			.orderBy('date', 'desc')
			.get();
		metrics.data.forEach(m => {
			if (!metricsMap[m.user_id]) metricsMap[m.user_id] = m;
		});
	}

	const list = result.data.map(d => {
		const { access_token, refresh_token, auth_state, ...safe } = d;
		return {
			...safe,
			nickname: userMap[d.user_id] || '用户',
			metrics: metricsMap[d.user_id] || null
		};
	});

	return {
		code: 0,
		data: {
			list,
			total: total.total,
			page: Number(page),
			size: Number(size)
		}
	};
}

// ==================== announcement 模块：系统公告管理 ====================

/**
 * 系统公告管理模块
 * 操作 announcements 数据库表
 * @action list   - 获取公告列表
 * @action create - 新建公告
 * @action update - 更新公告
 * @action delete - 删除公告
 * @action toggle - 启用/禁用公告
 * announcements 表字段：_id, title, content, is_active(bool), sort(int), created_at, updated_at
 */
async function announcementModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'list':
			return await handleListAnnouncements(event);
		case 'create':
			return await handleCreateAnnouncement(event);
		case 'update':
			return await handleUpdateAnnouncement(event);
		case 'delete':
			return await handleDeleteAnnouncement(event);
		case 'toggle':
			return await handleToggleAnnouncement(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：list、create、update、delete、toggle' };
	}
}

/* 获取公告列表（支持按 type 筛选：normal / ban） */
async function handleListAnnouncements(event) {
	try {
		const { type } = event;
		// 构建查询：传了合法 type 才过滤，否则返回全部
		let query = {};
		if (type === 'normal') {
			/* 普通公告：匹配 type='normal' 或 type 字段不存在/为空（兼容旧数据） */
			query.type = dbCmd.in(['normal', null, '']);
		} else if (type === 'ban') {
			query.type = 'ban';
		}

		const result = await db.collection('announcements')
			.where(query)
			.orderBy('is_active', 'desc')
			.orderBy('sort', 'asc')
			.orderBy('created_at', 'desc')
			.limit(100)
			.get();

		const list = result.data.map(item => ({
			id: item._id,
			title: item.title || '',
			content: item.content || '',
			rich_content: item.rich_content || '',
			type: item.type || 'normal',
			is_active: item.is_active || false,
			sort: item.sort || 0,
			ban_duration: item.ban_duration || '',
			ban_custom_hours: item.ban_custom_hours || 0,
			ban_is_permanent: item.ban_is_permanent || false,
			trigger_frequency: item.trigger_frequency || 'once',
			ban_image: item.ban_image || '',
			created_at: formatDate(item.created_at),
			updated_at: formatDate(item.updated_at)
		}));

		return { code: 0, data: { list } };
	} catch (error) {
		console.error('获取公告列表失败:', error);
		return { code: -1, message: '获取列表失败' };
	}
}

/* 新建公告（支持 type、rich_content 及封禁相关字段） */
async function handleCreateAnnouncement(event) {
	const { title, content, sort, type, rich_content, ban_duration, ban_custom_hours, trigger_frequency, ban_image } = event;

	if (!title) {
		return { code: -1, message: '公告标题不能为空' };
	}

	try {
		const now = new Date();
		// 公告类型：默认普通公告
		const annType = type === 'ban' ? 'ban' : 'normal';
		// 对富文本进行 XSS 过滤
		const safeRichContent = sanitizeRichText(rich_content);
		// 封禁公告且档位为 permanent 时，标记为永久封禁
		const isPermanent = (annType === 'ban' && ban_duration === 'permanent');

		const result = await db.collection('announcements').add({
			title,
			content: content || '',
			rich_content: safeRichContent,
			type: annType,
			is_active: false,
			sort: parseInt(sort) || 0,
			ban_duration: ban_duration || '',
			ban_custom_hours: parseInt(ban_custom_hours) || 0,
			ban_is_permanent: isPermanent,
			trigger_frequency: trigger_frequency || 'once',
			ban_image: ban_image || '',
			created_at: now,
			updated_at: now
		});

		return { code: 0, message: '创建成功', data: { id: result.id } };
	} catch (error) {
		console.error('创建公告失败:', error);
		return { code: -1, message: '创建失败' };
	}
}

/* 更新公告（支持 type、rich_content 及封禁相关字段） */
async function handleUpdateAnnouncement(event) {
	const { id, title, content, sort, type, rich_content, ban_duration, ban_custom_hours, ban_is_permanent, trigger_frequency, ban_image } = event;

	if (!id) {
		return { code: -1, message: '公告ID不能为空' };
	}

	const updateData = { updated_at: new Date() };
	if (title !== undefined) updateData.title = title;
	if (content !== undefined) updateData.content = content;
	if (sort !== undefined) updateData.sort = parseInt(sort);
	// 公告类型：仅接受 normal / ban
	if (type !== undefined) updateData.type = (type === 'ban' ? 'ban' : 'normal');
	// 富文本：先 XSS 过滤再存储
	if (rich_content !== undefined) updateData.rich_content = sanitizeRichText(rich_content);
	if (ban_duration !== undefined) updateData.ban_duration = ban_duration;
	if (ban_custom_hours !== undefined) updateData.ban_custom_hours = parseInt(ban_custom_hours);
	if (ban_is_permanent !== undefined) updateData.ban_is_permanent = ban_is_permanent;
	if (trigger_frequency !== undefined) updateData.trigger_frequency = trigger_frequency;
	if (ban_image !== undefined) updateData.ban_image = ban_image;

	try {
		const updateRes = await db.collection('announcements').where({ _id: id }).update(updateData);
		if (updateRes.updated === 0) {
			return { code: -1, message: '公告不存在' };
		}
		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新公告失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/* 删除公告 */
async function handleDeleteAnnouncement(event) {
	const { id } = event;

	if (!id) {
		return { code: -1, message: '公告ID不能为空' };
	}

	try {
		const removeRes = await db.collection('announcements').where({ _id: id }).remove();
		if (removeRes.deleted === 0) {
			return { code: -1, message: '公告不存在' };
		}
		return { code: 0, message: '删除成功' };
	} catch (error) {
		console.error('删除公告失败:', error);
		return { code: -1, message: '删除失败' };
	}
}

/* 启用/禁用公告（normal 类型启用时排他，ban 类型独立切换） */
async function handleToggleAnnouncement(event) {
	const { id } = event;

	if (!id) {
		return { code: -1, message: '公告ID不能为空' };
	}

	try {
		// 查询当前公告，获取 type 与 is_active
		const res = await db.collection('announcements').where({ _id: id }).limit(1).get();
		if (!res.data || res.data.length === 0) {
			return { code: -1, message: '公告不存在' };
		}

		const current = res.data[0];
		const annType = current.type || 'normal';
		const currentActive = !!current.is_active;
		const newStatus = !currentActive;

		if (annType === 'normal' && newStatus) {
			// 普通公告启用：先把所有 normal 且已启用的公告停用（排他），再启用当前
			await db.collection('announcements')
				.where({ type: 'normal', is_active: true })
				.update({ is_active: false, updated_at: new Date() });
			await db.collection('announcements').where({ _id: id }).update({
				is_active: true,
				updated_at: new Date()
			});
		} else {
			// 普通公告停用，或封禁公告独立切换
			await db.collection('announcements').where({ _id: id }).update({
				is_active: newStatus,
				updated_at: new Date()
			});
		}

		return { code: 0, message: '操作成功', data: { is_active: newStatus } };
	} catch (error) {
		console.error('切换公告状态失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

// ==================== menu 模块：菜单管理 ====================

/**
 * 菜单管理模块
 * 操作 opendb-admin-menus 数据库表
 * @action list   - 获取菜单列表（树形结构）
 * @action create - 新建菜单
 * @action update - 更新菜单
 * @action delete - 删除菜单（含子菜单）
 * @action toggle - 启用/禁用菜单
 * 表字段：_id, menu_id, name, icon, url, sort, parent_id, permission, enable, create_date
 */
async function menuModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'list':
			return await handleListMenus(event);
		case 'create':
			return await handleCreateMenu(event);
		case 'update':
			return await handleUpdateMenu(event);
		case 'delete':
			return await handleDeleteMenu(event);
		case 'toggle':
			return await handleToggleMenu(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：list、create、update、delete、toggle' };
	}
}

/* 获取菜单列表（扁平结构，前端自行构建树） */
async function handleListMenus(event) {
	try {
		const result = await db.collection('opendb-admin-menus')
			.orderBy('sort', 'asc')
			.orderBy('create_date', 'asc')
			.limit(500)
			.get();

		const list = result.data.map(item => ({
			id: item._id,
			menu_id: item.menu_id || '',
			name: item.name || '',
			icon: item.icon || '',
			url: item.url || '',
			sort: item.sort || 0,
			parent_id: item.parent_id || '',
			permission: item.permission || [],
			enable: item.enable !== false,
			create_date: formatDate(item.create_date)
		}));

		return { code: 0, data: { list } };
	} catch (error) {
		console.error('获取菜单列表失败:', error);
		return { code: -1, message: '获取列表失败' };
	}
}

/* 新建菜单 */
async function handleCreateMenu(event) {
	const { menu_id, name, icon, url, sort, parent_id, permission, enable } = event;

	if (!menu_id) {
		return { code: -1, message: '菜单标识不能为空' };
	}
	if (!name) {
		return { code: -1, message: '菜单名称不能为空' };
	}

	try {
		/* 检查 menu_id 是否重复 */
		const existing = await db.collection('opendb-admin-menus').where({ menu_id }).limit(1).get();
		if (existing.data && existing.data.length > 0) {
			return { code: -1, message: '菜单标识已存在' };
		}

		const result = await db.collection('opendb-admin-menus').add({
			menu_id,
			name,
			icon: icon || '',
			url: url || '',
			sort: parseInt(sort) || 0,
			parent_id: parent_id || '',
			permission: permission || [],
			enable: enable !== false,
			create_date: new Date()
		});

		return { code: 0, message: '创建成功', data: { id: result.id } };
	} catch (error) {
		console.error('创建菜单失败:', error);
		return { code: -1, message: '创建失败' };
	}
}

/* 更新菜单 */
async function handleUpdateMenu(event) {
	const { id, menu_id, name, icon, url, sort, parent_id, permission, enable } = event;

	if (!id) {
		return { code: -1, message: '菜单ID不能为空' };
	}

	const updateData = {};
	if (menu_id !== undefined) updateData.menu_id = menu_id;
	if (name !== undefined) updateData.name = name;
	if (icon !== undefined) updateData.icon = icon;
	if (url !== undefined) updateData.url = url;
	if (sort !== undefined) updateData.sort = parseInt(sort);
	if (parent_id !== undefined) updateData.parent_id = parent_id;
	if (permission !== undefined) updateData.permission = permission;
	if (enable !== undefined) updateData.enable = enable;

	try {
		const updateRes = await db.collection('opendb-admin-menus').where({ _id: id }).update(updateData);
		if (updateRes.updated === 0) {
			return { code: -1, message: '菜单不存在' };
		}
		return { code: 0, message: '更新成功' };
	} catch (error) {
		console.error('更新菜单失败:', error);
		return { code: -1, message: '更新失败' };
	}
}

/* 删除菜单（含子菜单） */
async function handleDeleteMenu(event) {
	const { id } = event;

	if (!id) {
		return { code: -1, message: '菜单ID不能为空' };
	}

	try {
		/* 先查询该菜单，获取 menu_id */
		const menuRes = await db.collection('opendb-admin-menus').where({ _id: id }).limit(1).get();
		if (!menuRes.data || menuRes.data.length === 0) {
			return { code: -1, message: '菜单不存在' };
		}

		const menuId = menuRes.data[0].menu_id;

		/* 递归查找所有子菜单 ID */
		const idsToDelete = [id];
		await collectChildMenus(menuId, idsToDelete);

		/* 批量删除 */
		const dbCmd = db.command;
		await db.collection('opendb-admin-menus').where({
			_id: dbCmd.in(idsToDelete)
		}).remove();

		return { code: 0, message: '删除成功', data: { deleted: idsToDelete.length } };
	} catch (error) {
		console.error('删除菜单失败:', error);
		return { code: -1, message: '删除失败' };
	}
}

/* 递归收集子菜单 ID */
async function collectChildMenus(parentMenuId, ids) {
	const children = await db.collection('opendb-admin-menus')
		.where({ parent_id: parentMenuId })
		.get();

	if (children.data && children.data.length > 0) {
		for (const child of children.data) {
			ids.push(child._id);
			await collectChildMenus(child.menu_id, ids);
		}
	}
}

/* 启用/禁用菜单 */
async function handleToggleMenu(event) {
	const { id } = event;

	if (!id) {
		return { code: -1, message: '菜单ID不能为空' };
	}

	try {
		const res = await db.collection('opendb-admin-menus').where({ _id: id }).limit(1).get();
		if (!res.data || res.data.length === 0) {
			return { code: -1, message: '菜单不存在' };
		}

		const newStatus = res.data[0].enable === false;
		await db.collection('opendb-admin-menus').where({ _id: id }).update({
			enable: newStatus
		});

		return { code: 0, message: newStatus ? '已启用' : '已禁用' };
	} catch (error) {
		console.error('切换菜单状态失败:', error);
		return { code: -1, message: '操作失败' };
	}
}

// ==================== init 模块：数据初始化 ====================

/**
 * 数据初始化模块
 * @action articles - 批量插入测试文章
 */

/** 测试文章数据（6篇健康科普文章） */
const testArticles = [
	{
		title: '布里斯托大便分类法：一文看懂你的便便健康',
		category_name: '肠道健康',
		summary: '通过布里斯托分类法，快速判断你的排便是否健康，了解不同形态背后的健康信号。',
		content: `<h2>什么是布里斯托大便分类法？</h2><p>布里斯托大便分类法（Bristol Stool Scale）是1997年由英国布里斯托大学的Heaton和Lewis博士提出的，将人类粪便分为7种类型，是医学上常用的粪便分类标准。</p><h2>七种类型详解</h2><p><strong>第一型：硬球状</strong> — 像坚果一样硬，排出困难。说明肠道蠕动过慢，水分被过度吸收，属于严重便秘。</p><p><strong>第二型：凹凸香肠状</strong> — 表面凹凸不平，成块状。同样属于便秘表现。</p><p><strong>第三型：裂纹香肠状</strong> — 表面有裂纹，但质地较软。属于较正常的排便。</p><p><strong>第四型：光滑香肠状</strong> — 像香肠或蛇一样，表面光滑柔软。这是最理想的健康排便状态！</p><p><strong>第五型：柔软块状</strong> — 边缘清晰，柔软易排出。略偏软，但仍在正常范围。</p><p><strong>第六型：糊状便</strong> — 边缘模糊，呈糊状。可能是轻度腹泻的表现。</p><p><strong>第七型：水样便</strong> — 完全液体，无固体块。严重腹泻，需及时就医。</p><h2>如何改善？</h2><p>1. 多喝水：每日1.5-2升</p><p>2. 增加膳食纤维：蔬菜、水果、全谷物</p><p>3. 规律运动：促进肠道蠕动</p><p>4. 养成定时排便习惯</p>`,
		author_name: '健康编辑部',
		status: 1,
		is_top: true,
		top_level: 1,
		tags: ['便秘', '腹泻', '健康指南']
	},
	{
		title: '膳食纤维：肠道的天然清道夫',
		category_name: '饮食指导',
		summary: '膳食纤维不仅缓解便秘，还能调节肠道菌群。每天该吃多少？哪些食物含量最高？',
		content: `<h2>膳食纤维的作用</h2><p>膳食纤维被称为"第七大营养素"，它虽然不能被人体消化吸收，但对肠道健康至关重要：</p><p>• 促进肠道蠕动，预防便秘</p><p>• 为肠道有益菌提供食物，维持菌群平衡</p><p>• 增加饱腹感，有助于控制体重</p><p>• 延缓血糖上升，对糖尿病友好</p><h2>每天该吃多少？</h2><p>中国营养学会建议成人每日摄入 <strong>25-30克</strong> 膳食纤维。但调查显示，大多数中国人日均摄入量仅为10-15克，远未达标。</p><h2>高纤维食物排行榜</h2><p>1. <strong>燕麦</strong>（每100g含10.6g纤维）</p><p>2. <strong>红薯</strong>（每100g含3.0g纤维）</p><p>3. <strong>西兰花</strong>（每100g含2.6g纤维）</p><p>4. <strong>苹果</strong>（带皮每100g含2.4g纤维）</p><p>5. <strong>糙米</strong>（每100g含3.4g纤维）</p><p>6. <strong>黑豆</strong>（每100g含16.0g纤维）</p><h2>小贴士</h2><p>增加纤维摄入要循序渐进，突然大量摄入可能引起腹胀。同时记得多喝水，纤维需要水分才能发挥作用。</p>`,
		author_name: '营养师小王',
		status: 1,
		is_top: false,
		top_level: 0,
		tags: ['膳食纤维', '饮食', '营养']
	},
	{
		title: '每天喝多少水才够？科学饮水指南',
		category_name: '饮食指导',
		summary: '饮水不足是便秘的常见原因。本文告诉你每天该喝多少水，以及最佳饮水时间表。',
		content: `<h2>每日饮水量建议</h2><p>根据《中国居民膳食指南》，成年人每日建议饮水量为 <strong>1500-1700ml</strong>（约7-8杯）。如果有运动或天气炎热，需适当增加。</p><h2>饮水与排便的关系</h2><p>大肠的主要功能之一是吸收水分。当身体缺水时，大肠会从粪便中吸收更多水分，导致粪便变硬、干燥，形成便秘。</p><p>充足的水分能保持粪便柔软，使其更容易通过肠道。</p><h2>最佳饮水时间表</h2><p>• <strong>晨起一杯水</strong>（7:00）：唤醒肠胃，促进排便反射</p><p>• <strong>上午补水</strong>（9:00, 11:00）：工作间隙</p><p>• <strong>午后饮水</strong>（13:00, 15:00）：帮助消化和代谢</p><p>• <strong>傍晚饮水</strong>（17:00, 19:00）：补充白天流失</p><p>• <strong>睡前少量</strong>（21:00）：不宜过多，以免夜起</p><h2>喝什么水最好？</h2><p>白开水是最佳选择。避免用含糖饮料代替饮水，咖啡和茶可以适量饮用但有利尿作用。</p>`,
		author_name: '健康编辑部',
		status: 1,
		is_top: false,
		top_level: 0,
		tags: ['饮水', '便秘', '健康习惯']
	},
	{
		title: '规律运动如何改善肠道健康？',
		category_name: '运动建议',
		summary: '久坐不动是肠道健康的大敌。这些简单运动能促进肠道蠕动，告别便秘烦恼。',
		content: `<h2>运动与肠道健康</h2><p>研究表明，规律运动可以将便秘发生率降低40%。运动通过以下机制改善肠道功能：</p><p>• 加速肠道蠕动，缩短粪便在结肠中的停留时间</p><p>• 改善腹壁肌肉力量，有助于排便发力</p><p>• 减轻压力和焦虑，改善肠脑轴功能</p><p>• 促进血液循环，增强肠道黏膜修复</p><h2>推荐运动类型</h2><p><strong>1. 快走/慢跑（30分钟/次，3-4次/周）</strong></p><p>最简单有效的肠道运动，适合所有人。饭后30分钟后进行效果最佳。</p><p><strong>2. 瑜伽扭转体式</strong></p><p>如仰卧扭转、脊柱扭转等，直接按摩腹部器官，促进消化。</p><p><strong>3. 腹部按摩</strong></p><p>顺时针方向按摩腹部，每天早晚各5分钟，模拟肠道走向。</p><p><strong>4. 深蹲练习</strong></p><p>深蹲是天然的排便姿势训练，每天10-15个。</p><h2>注意事项</h2><p>• 避免饭后立即剧烈运动</p><p>• 运动前后注意补水</p><p>• 有肠道疾病的患者请咨询医生</p>`,
		author_name: '运动指导员',
		status: 1,
		is_top: false,
		top_level: 0,
		tags: ['运动', '便秘', '肠道蠕动']
	},
	{
		title: '了解你的肠道菌群：便便里的微观世界',
		category_name: '肠道健康',
		summary: '肠道内有万亿微生物，它们影响着你的消化、免疫甚至情绪。如何养好你的肠道菌群？',
		content: `<h2>肠道菌群是什么？</h2><p>人体肠道内栖息着约 <strong>100万亿</strong> 个微生物，是人体细胞总数的10倍。这些微生物被称为"肠道菌群"，它们包括细菌、真菌、病毒等，其中绝大多数是有益的。</p><h2>菌群失衡的表现</h2><p>当有害菌过度繁殖时，可能出现：</p><p>• 腹胀、排气增多</p><p>• 便秘或腹泻交替</p><p>• 免疫力下降，容易感冒</p><p>• 皮肤问题（痤疮、湿疹）</p><p>• 情绪波动、焦虑</p><h2>如何养护肠道菌群？</h2><p><strong>1. 多吃益生菌食物</strong></p><p>酸奶、泡菜、纳豆等发酵食品含有活性益生菌。</p><p><strong>2. 补充益生元</strong></p><p>益生元是益生菌的"食物"，主要来源于膳食纤维：洋葱、大蒜、香蕉、燕麦等。</p><p><strong>3. 减少抗生素滥用</strong></p><p>抗生素会杀死有益菌，使用后注意补充益生菌。</p><p><strong>4. 减少高糖高脂饮食</strong></p><p>高糖高脂饮食会促进有害菌生长。</p><p><strong>5. 规律作息</strong></p><p>肠道菌群也有生物钟，熬夜会打乱菌群节律。</p>`,
		author_name: '微生物研究员',
		status: 1,
		is_top: false,
		top_level: 0,
		tags: ['肠道菌群', '益生菌', '免疫力']
	},
	{
		title: '便秘了怎么办？6个方法帮你自然缓解',
		category_name: '肠道健康',
		summary: '不用急着吃药，试试这些自然方法缓解便秘。如果持续超过两周建议就医。',
		content: `<h2>便秘的常见原因</h2><p>• 饮水不足</p><p>• 膳食纤维摄入不够</p><p>• 久坐不动</p><p>• 压力过大</p><p>• 忽视排便信号</p><p>• 某些药物副作用</p><h2>6个自然缓解方法</h2><p><strong>1. 晨起空腹喝温水</strong></p><p>一杯温水能刺激胃结肠反射，促进排便。可以加几滴柠檬汁。</p><p><strong>2. 蹲姿排便</strong></p><p>蹲姿比坐姿更符合人体工学，可以使用脚凳模拟蹲姿。</p><p><strong>3. 顺时针腹部按摩</strong></p><p>以肚脐为中心，顺时针方向按摩5-10分钟，每天2次。</p><p><strong>4. 增加纤维摄入</strong></p><p>多吃水果（火龙果、猕猴桃效果尤佳）、蔬菜和全谷物。</p><p><strong>5. 培养定时习惯</strong></p><p>每天固定时间上厕所，即使没有便意也尝试5分钟。晨起或饭后30分钟是最佳时间。</p><p><strong>6. 适度运动</strong></p><p>快走、慢跑、瑜伽都能促进肠道蠕动。</p><h2>何时就医？</h2><p>• 便秘持续超过2周</p><p>• 伴有便血、剧烈腹痛</p><p>• 体重无明显原因下降</p><p>• 排便习惯突然改变</p>`,
		author_name: '消化科医生',
		status: 1,
		is_top: false,
		top_level: 0,
		tags: ['便秘', '自然疗法', '健康习惯']
	}
];

async function initModule(event, context) {
	const { action } = event;

	if (!action) {
		return { code: -1, message: '缺少操作类型(action)' };
	}

	switch (action) {
		case 'articles':
			return await handleInitArticles(event);
		case 'menus':
			return await handleInitMenus(event);
		default:
			return { code: -1, message: '不支持的操作类型，支持：articles、menus' };
	}
}

/**
 * 初始化菜单数据
 * 将完整的管理端菜单结构写入 opendb-admin-menus 表
 * 已存在的 menu_id 会更新，不在列表中的旧菜单会被删除
 */
async function handleInitMenus(event) {
	/* 完整的菜单数据 */
	const menuData = [
		/* 主页分组 */
		{ menu_id: 'home', name: '主页', icon: 'home', url: '', sort: 0, parent_id: '', enable: true },
		{ menu_id: 'ad', name: '广告管理', icon: 'sound', url: '/pages/business/ad/list', sort: 1, parent_id: 'home', enable: true },
		{ menu_id: 'ai_model', name: 'AI报告管理', icon: 'chat', url: '/pages/system/ai-report/list', sort: 2, parent_id: 'home', enable: true },
		/* 用户管理分组 */
		{ menu_id: 'user_mgmt', name: '用户管理', icon: 'contact', url: '', sort: 1, parent_id: '', enable: true },
		{ menu_id: 'user', name: '用户信息', icon: 'person', url: '/pages/business/users/list', sort: 1, parent_id: 'user_mgmt', enable: true },
		{ menu_id: 'records', name: '健康记录', icon: 'list', url: '/pages/business/records/list', sort: 2, parent_id: 'user_mgmt', enable: true },
		/* 科普页面分组 */
		{ menu_id: 'science', name: '科普页面', icon: 'images', url: '', sort: 2, parent_id: '', enable: true },
		{ menu_id: 'article', name: '科普文章', icon: 'images', url: '/pages/business/articles/list', sort: 1, parent_id: 'science', enable: true },
		{ menu_id: 'cooperation', name: '合作信息', icon: 'link', url: '/pages/business/cooperation/list', sort: 2, parent_id: 'science', enable: true },
		/* 排行分组 */
		{ menu_id: 'rank', name: '排行', icon: 'flag', url: '', sort: 3, parent_id: '', enable: true },
		{ menu_id: 'ranking_notice', name: '跑马灯公告', icon: 'notification', url: '/pages/business/ranking-notice/list', sort: 1, parent_id: 'rank', enable: true },
		{ menu_id: 'ranking', name: '排行榜管理', icon: 'flag', url: '/pages/business/rankings/list', sort: 2, parent_id: 'rank', enable: true },
		/* 系统管理分组 */
		{ menu_id: 'system', name: '系统管理', icon: 'gear-filled', url: '', sort: 4, parent_id: '', enable: true },
		{ menu_id: 'announcement', name: '公告管理', icon: 'notification', url: '/pages/system/announcement/list', sort: 1, parent_id: 'system', enable: true },
		{ menu_id: 'settings', name: '系统设置', icon: 'gear', url: '/pages/business/settings/list', sort: 2, parent_id: 'system', enable: true },
		{ menu_id: 'menu_mgr', name: '菜单管理', icon: 'list', url: '/pages/system/menu/list', sort: 3, parent_id: 'system', enable: true },
		{ menu_id: 'role', name: '角色管理', icon: 'staff', url: '/pages/system/role/list', sort: 4, parent_id: 'system', enable: true },
		{ menu_id: 'admin_user', name: '管理员用户', icon: 'person', url: '/pages/system/user/list', sort: 5, parent_id: 'system', enable: true },
	];

	/* 新菜单的 menu_id 集合，用于清理旧数据 */
	const validMenuIds = menuData.map(m => m.menu_id);
	const dbCmd = db.command;

	let inserted = 0;
	let updated = 0;
	let deleted = 0;

	/* 1. 先删除不在新列表中的旧菜单 */
	try {
		const delRes = await db.collection('opendb-admin-menus')
			.where({ menu_id: dbCmd.nin(validMenuIds) })
			.remove();
		deleted = delRes.deleted || 0;
	} catch (e) {
		console.error('[init-menus] 清理旧菜单失败:', e.message);
	}

	/* 2. 插入或更新菜单 */
	for (const menu of menuData) {
		try {
			const existing = await db.collection('opendb-admin-menus').where({ menu_id: menu.menu_id }).limit(1).get();
			if (existing.data && existing.data.length > 0) {
				/* 已存在则更新 */
				await db.collection('opendb-admin-menus').where({ menu_id: menu.menu_id }).update({
					name: menu.name,
					icon: menu.icon,
					url: menu.url,
					sort: menu.sort,
					parent_id: menu.parent_id,
					enable: menu.enable
				});
				updated++;
			} else {
				/* 不存在则插入 */
				await db.collection('opendb-admin-menus').add({
					...menu,
					permission: [],
					create_date: new Date()
				});
				inserted++;
			}
		} catch (e) {
			console.error('[init-menus] 插入菜单失败:', menu.menu_id, e.message);
		}
	}

	return {
		code: 0,
		message: `菜单初始化完成，新增 ${inserted} 条，更新 ${updated} 条，删除旧菜单 ${deleted} 条`,
		data: { inserted, updated, deleted, total: menuData.length }
	};
}

/**
 * 批量插入测试文章
 * 一次性调用即可，会自动跳过已存在的同名文章
 */
async function handleInitArticles(event) {
	let successCount = 0;
	let failCount = 0;
	const errors = [];

	for (const article of testArticles) {
		try {
			// 检查是否已存在同名文章
			const existing = await articleCollection.where({ title: article.title }).count();
			if (existing.total > 0) {
				console.log('[init-articles] 文章已存在，跳过:', article.title);
				continue;
			}

			const now = Date.now();
			const plainText = article.content.replace(/<[^>]+>/g, '');
			const wordCount = plainText.length;
			const readingTime = Math.ceil(wordCount / 300) || 1;

			await articleCollection.add({
				title: article.title,
				content: article.content,
				summary: article.summary,
				content_images: [],
				cover_image: '',
				category_name: article.category_name,
				author_name: article.author_name,
				author_id: 'admin',
				status: article.status,
				is_top: article.is_top,
				top_level: article.top_level,
				is_recommend: false,
				recommend_level: 0,
				view_count: Math.floor(Math.random() * 500) + 50,
				like_count: Math.floor(Math.random() * 50) + 5,
				comment_count: Math.floor(Math.random() * 10),
				share_count: Math.floor(Math.random() * 20),
				favorite_count: Math.floor(Math.random() * 30) + 3,
				like_user_ids: [],
				favorite_user_ids: [],
				tags: article.tags || [],
				word_count: wordCount,
				reading_time: readingTime,
				create_time: now,
				update_time: now,
				publish_time: now
			});
			successCount++;
			console.log('[init-articles] 添加成功:', article.title);
		} catch (e) {
			failCount++;
			errors.push({ title: article.title, error: e.message });
			console.error('[init-articles] 添加失败:', article.title, e.message);
		}
	}

	return {
		code: 0,
		message: `初始化完成：成功 ${successCount} 篇，失败 ${failCount} 篇`,
		data: { successCount, failCount, errors }
	};
}
