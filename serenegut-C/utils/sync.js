/**
 * 本地累积批量同步模块
 *
 * 作用：将阅读量、点赞量等轻量操作暂存在本地队列，达到时间间隔后
 *       一次性调用 batch-sync 云函数处理，大幅减少云函数调用次数。
 *
 * 使用方式：
 *   import sync from '@/utils/sync.js'
 *
 *   // 在 App.onLaunch 中初始化
 *   sync.init()
 *
 *   // 在任何页面记录操作
 *   sync.push('view_article', { article_id: 'xxx' })
 *   sync.push('like_article', { article_id: 'yyy' })
 *
 * 后台管理间隔：在 app_config 集合中修改 sync_config 文档的 batch_interval 字段
 */

import { configApi, syncApi } from '@/js_sdk/sg-client/api.js'

const queue = []
let timer = null
let interval = 900 // 默认15分钟（与数据库配置保持一致）

/**
 * 初始化同步模块
 * 从服务端获取配置，启动定时器
 */
async function init() {
  try {
    /* 使用 API 服务层获取应用配置 */
    const res = await configApi.get()

    if (res && res.code === 0 && res.data) {
      const config = res.data
      interval = config.batch_interval || 300

      if (config.batch_enabled === false) {
        console.log('批量同步已关闭，不会自动提交')
        return
      }
    }
  } catch (err) {
    console.error('获取同步配置失败，使用默认间隔:', err)
    interval = 300
  }

  startTimer()
  console.log(`批量同步已启动，间隔 ${interval} 秒`)
}

/**
 * 启动定时器
 */
function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(flush, interval * 1000)
}

/**
 * 停止定时器（页面销毁或用户退出时调用）
 */
function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/**
 * 向累积队列推送一条操作
 *
 * @param {string} type  操作类型（view_article / like_article / share_article / favorite_article 等）
 * @param {object} data  附带数据，至少包含目标ID，如 { article_id: 'xxx' }
 */
function push(type, data) {
  queue.push({
    type,
    data,
    time: Date.now()
  })
}

/**
 * 立即将队列中的操作批量提交到云函数
 * 外部也可主动调用（如 App.onHide 时确保不丢数据）
 */
async function flush() {
  if (queue.length === 0) return

  const batch = queue.splice(0)

  try {
    /* 使用 API 服务层批量同步操作 */
    const res = await syncApi.batch(batch)
    console.log(`批量同步提交 ${batch.length} 条:`, res?.message)
  } catch (err) {
    console.error('批量同步失败，放回队列:', err)
    // 失败时放回队列，下次 flush 重试
    queue.unshift(...batch)
  }
}

/**
 * 获取当前队列长度
 */
function getQueueLength() {
  return queue.length
}

export default {
  init,
  stop,
  push,
  flush,
  getQueueLength
}
