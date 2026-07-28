/* ============================================================
 * API 服务层 · Serene Gut 后台管理系统
 * 统一通过 admin-api 云函数访问数据，使用 module + action 双层路由
 * 含：数据缓存 + 超时处理 + 错误提示
 * ============================================================ */

/* 统一云函数名 */
const CLOUD_FUNCTION = 'admin-api'

/* ===================== 缓存层 ===================== */
/* 缓存策略：
 * - 查询操作（list/get）缓存数据，避免重复调用云函数
 * - 写操作（create/update/delete/toggle）自动清除对应模块缓存
 * - 缓存在页面刷新或关闭应用时自动清除（内存级缓存）
 * - TTL 按模块区分：dashboard 5分钟，业务数据 1 小时
 */
const cache = new Map()
const CACHE_TTL_DEFAULT = 60 * 60 * 1000 // 1 小时
const CACHE_TTL_SHORT = 5 * 60 * 1000    // 5 分钟（统计数据等时效性高的）

/* 按模块获取 TTL */
function getTTL(mod) {
	/* dashboard 等统计类数据缓存 5 分钟 */
	if (mod === 'dashboard') return CACHE_TTL_SHORT
	return CACHE_TTL_DEFAULT
}

/* 获取缓存 */
function getCache(key) {
	const item = cache.get(key)
	if (item && Date.now() - item.time < item.ttl) {
		return item.data
	}
	cache.delete(key)
	return null
}

/* 写入缓存 */
function setCache(key, data, ttl) {
	cache.set(key, { data, time: Date.now(), ttl: ttl || CACHE_TTL_DEFAULT })
}

/* 清除指定模块的缓存 */
function clearCache(mod) {
	for (const key of cache.keys()) {
		if (key.startsWith(mod)) {
			cache.delete(key)
		}
	}
}

/* 清除全部缓存 */
function clearAllCache() {
	cache.clear()
}

/* ===================== 参数清洗 ===================== */
/* 过滤掉空字符串、null、undefined 参数，避免云函数收到无效值 */
function cleanParams(params) {
	const cleaned = {}
	for (const [k, v] of Object.entries(params)) {
		if (v !== '' && v !== null && v !== undefined) {
			cleaned[k] = v
		}
	}
	return cleaned
}

/* ===================== 云函数调用 ===================== */

/* 带超时的云函数调用（统一走 admin-api，通过 module 区分业务模块） */
async function callCloud(mod, data = {}, options = {}) {
	const { silent = false, timeout = 10000 } = options

	/* 将 module 注入到 data 中 */
	const payload = { module: mod, ...data }

	try {
		const res = await Promise.race([
			uniCloud.callFunction({ name: CLOUD_FUNCTION, data: payload }),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('网络请求超时，请检查网络后重试')), timeout)
			)
		])
		console.log(`[API] ${mod} 调用成功, result:`, JSON.stringify(res.result, null, 2))
		return res.result
	} catch (err) {
		console.error(`[API] ${mod} 调用失败:`, err)
		throw err
	}
}

/* 带缓存的云函数调用（用于查询类操作） */
/* options.force = true 时跳过缓存，强制请求云函数 */
async function callCloudCached(mod, data = {}, options = {}) {
	const cacheKey = `${mod}_${JSON.stringify(data)}`
	if (!options.force) {
		const cached = getCache(cacheKey)
		if (cached) {
			return cached
		}
	}
	const res = await callCloud(mod, data, options)
	if (res && res.code === 0) {
		setCache(cacheKey, res, getTTL(mod))
	}
	return res
}

/* ===================== 统一的请求封装 ===================== */
async function request(fn, options = {}) {
	try {
		const res = await fn()
		return res
	} catch (err) {
		throw err
	}
}

/* ============================================================
 * Dashboard 数据总览
 * ============================================================ */
export const dashboardApi = {
	getStats(force = false) {
		return request(() => callCloudCached('dashboard', { action: 'stats' }, { force }))
	}
}

/* ============================================================
 * 可穿戴设备与健康数据（health_devices / health_metrics）
 * ============================================================ */
export const deviceApi = {
	getList(params = {}, force = false) {
		return request(() => callCloudCached('device', { action: 'list', ...cleanParams(params) }, { force }))
	}
}

/* ============================================================
 * 用户管理（users 表）
 * ============================================================ */
export const userApi = {
	getList(params = {}, force = false) {
		return request(() => callCloudCached('user', { action: 'list', ...cleanParams(params) }, { force }))
	},
	getDetail(userId) {
		return request(() => callCloudCached('user', { action: 'get', userId }))
	},
	update(userId, data) {
		clearCache('user')
		return request(() => callCloud('user', { action: 'update', userId, ...data }), { showTimeout: false })
	},
	toggleStatus(userId, status) {
		clearCache('user')
		return request(() => callCloud('user', { action: 'toggleStatus', userId, status }), { showTimeout: false })
	},
	/* 封禁用户（banDuration: '1h'|'1d'|'1m'|'custom'|'permanent'，custom 时需传 customHours） */
	ban(userId, announcementId, banDuration, customHours) {
		clearCache('user')
		return request(() => callCloud('user', { action: 'ban', userId, announcementId, banDuration, ...cleanParams({ customHours }) }), { showTimeout: false })
	},
	/* 解封用户 */
	unban(userId) {
		clearCache('user')
		return request(() => callCloud('user', { action: 'unban', userId }), { showTimeout: false })
	}
}

/* ============================================================
 * 健康记录（records 表）
 * ============================================================ */
export const recordApi = {
	getList(params = {}, force = false) {
		return request(() => callCloudCached('records', { action: 'list', ...cleanParams(params) }, { force }))
	},
	getDetail(recordId) {
		return request(() => callCloudCached('records', { action: 'getDetail', recordId }))
	},
	delete(recordId) {
		clearCache('records')
		return request(() => callCloud('records', { action: 'delete', recordId }), { showTimeout: false })
	},
	update(recordId, data) {
		clearCache('records')
		return request(() => callCloud('records', { action: 'update', recordId, ...data }), { showTimeout: false })
	}
}

/* ============================================================
 * 文章管理（article 表）
 * ============================================================ */
export const articleApi = {
	getList(params = {}, force = false) {
		return request(() => callCloudCached('article', { action: 'list', ...cleanParams(params) }, { force }))
	},
	getDetail(articleId) {
		return request(() => callCloudCached('article', { action: 'get', article_id: articleId, include_all: true }))
	},
	create(data) {
		clearCache('article')
		return request(() => callCloud('article', { action: 'create', ...data }), { showTimeout: false })
	},
	update(articleId, data) {
		clearCache('article')
		return request(() => callCloud('article', { action: 'update', article_id: articleId, ...data }), { showTimeout: false })
	},
	/* 统一切换接口：field='publish' 发布/下架，field='top' 首页推流 */
	togglePublish(articleId) {
		clearCache('article')
		return request(() => callCloud('article', { action: 'toggle', article_id: articleId, field: 'publish' }), { showTimeout: false })
	},
	toggleTop(articleId) {
		clearCache('article')
		return request(() => callCloud('article', { action: 'toggle', article_id: articleId, field: 'top' }), { showTimeout: false })
	},
	delete(articleId) {
		clearCache('article')
		return request(() => callCloud('article', { action: 'delete', article_id: articleId }), { showTimeout: false })
	}
}

/* ============================================================
 * 排行榜管理
 * ============================================================ */
export const rankingApi = {
	getList(params = {}, force = false) {
		return request(() => callCloudCached('ranking', { action: 'list', ...cleanParams(params) }, { force }))
	},
	disable(userId) {
		clearCache('ranking')
		return request(() => callCloud('ranking', { action: 'disable', userId }), { showTimeout: false })
	},
	enable(userId) {
		clearCache('ranking')
		return request(() => callCloud('ranking', { action: 'enable', userId }), { showTimeout: false })
	},
	delete(userId) {
		clearCache('ranking')
		clearCache('records')
		return request(() => callCloud('ranking', { action: 'delete', userId }), { showTimeout: false })
	}
}

/* ============================================================
 * 系统设置（app_config 表）
 * ============================================================ */
export const configApi = {
	get(force = false) {
		return request(() => callCloudCached('config', { action: 'get' }, { force }))
	},
	update(data) {
		clearCache('config')
		return request(() => callCloud('config', { action: 'update', ...data }), { showTimeout: false })
	}
}

/* ============================================================
 * AI 模型管理（ai_models 表）
 * 支持多模型配置，同一时间仅一个模型为启用状态
 * ============================================================ */
export const aiModelApi = {
	/* 获取所有 AI 模型列表 */
	getList(force = false) {
		return request(() => callCloudCached('ai_model', { action: 'list' }, { force }))
	},
	/* 新建 AI 模型 */
	create(data) {
		clearCache('ai_model')
		return request(() => callCloud('ai_model', { action: 'create', ...data }), { showTimeout: false })
	},
	/* 更新 AI 模型 */
	update(id, data) {
		clearCache('ai_model')
		return request(() => callCloud('ai_model', { action: 'update', id, ...data }), { showTimeout: false })
	},
	/* 删除 AI 模型 */
	delete(id) {
		clearCache('ai_model')
		return request(() => callCloud('ai_model', { action: 'delete', id }), { showTimeout: false })
	},
	/* 启用某个模型（同时自动禁用其他所有模型） */
	toggle(id) {
		clearCache('ai_model')
		return request(() => callCloud('ai_model', { action: 'toggle', id }), { showTimeout: false })
	},
	/* 测试 AI 模型连接（通过 client-api 的 ai.test 接口） */
	testConnection() {
		return request(() => callCloud('ai_model', { action: 'test' }), { showTimeout: false, timeout: 20000 })
	}
}

/* ============================================================
 * 系统公告管理（announcements 表）
 * ============================================================ */
export const announcementApi = {
	/* 获取公告列表（可选 type 筛选：normal / ban） */
	getList(force = false, type) {
		return request(() => callCloudCached('announcement', { action: 'list', ...cleanParams({ type }) }, { force }))
	},
	/* 新建公告（data 含 title, content, type, rich_content, ban_duration, ban_custom_hours 等字段） */
	create(data) {
		clearCache('announcement')
		return request(() => callCloud('announcement', { action: 'create', ...data }), { showTimeout: false })
	},
	/* 更新公告（data 含 type, rich_content, ban_duration, ban_custom_hours, ban_is_permanent 等字段） */
	update(id, data) {
		clearCache('announcement')
		return request(() => callCloud('announcement', { action: 'update', id, ...data }), { showTimeout: false })
	},
	/* 删除公告 */
	delete(id) {
		clearCache('announcement')
		return request(() => callCloud('announcement', { action: 'delete', id }), { showTimeout: false })
	},
	/* 启用/禁用公告 */
	toggle(id) {
		clearCache('announcement')
		return request(() => callCloud('announcement', { action: 'toggle', id }), { showTimeout: false })
	}
}

/* ============================================================
 * 菜单管理（opendb-admin-menus 表）
 * ============================================================ */
export const menuApi = {
	/* 获取菜单列表 */
	getList(force = false) {
		return request(() => callCloudCached('menu', { action: 'list' }, { force }))
	},
	/* 新建菜单 */
	create(data) {
		clearCache('menu')
		return request(() => callCloud('menu', { action: 'create', ...data }), { showTimeout: false })
	},
	/* 更新菜单 */
	update(id, data) {
		clearCache('menu')
		return request(() => callCloud('menu', { action: 'update', id, ...data }), { showTimeout: false })
	},
	/* 删除菜单（含子菜单） */
	delete(id) {
		clearCache('menu')
		return request(() => callCloud('menu', { action: 'delete', id }), { showTimeout: false })
	},
	/* 启用/禁用菜单 */
	toggle(id) {
		clearCache('menu')
		return request(() => callCloud('menu', { action: 'toggle', id }), { showTimeout: false })
	}
}

/* ============================================================
 * 初始化工具（init 模块）
 * ============================================================ */
export const initApi = {
	/* 初始化菜单数据（一键写入完整菜单结构到数据库） */
	initMenus() {
		clearCache('menu')
		return request(() => callCloud('init', { action: 'menus' }), { showTimeout: false, timeout: 20000 })
	}
}

/* 导出缓存管理方法（供页面手动刷新使用） */
export { clearAllCache, clearCache }
