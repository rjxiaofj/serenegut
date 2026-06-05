import App from './App.vue'
import { createSSRApp } from 'vue'
import { announcementApi } from '@/js_sdk/sg-client/api.js'
import toastPlugin from '@/plugins/toast.js'

export function createApp() {
  const app = createSSRApp(App)
  // 注册自定义 Toast 插件：劫持 uni.showToast/showLoading/hideLoading，全局生效
  app.use(toastPlugin)
  /* 延迟检查公告，确保首页已挂载并监听事件 */
  setTimeout(() => {
    checkAnnouncements()
  }, 500)
  return { app }
}

/* 检查全局公告：获取公告数据，分别处理封禁公告和普通公告 */
async function checkAnnouncements() {
  try {
    const userId = uni.getStorageSync('userId')
    console.log('[main] checkAnnouncements 开始, userId:', userId)
    /* userId 为空时传 undefined，由后端按匿名用户处理 */
    const result = await announcementApi.get(userId || undefined)
    console.log('[main] 公告API返回:', JSON.stringify(result).substring(0, 200))

    if (!result || result.code !== 0 || !result.data) {
      console.log('[main] 公告API返回无效，退出')
      return
    }

    /* 封禁公告处理：用户被封禁时存储信息并发射全局事件 */
    if (result.data.ban) {
      console.log('[main] 检测到封禁公告:', result.data.ban.title)
      uni.setStorageSync('banInfo', result.data.ban)
      uni.$emit('showBanModal', result.data.ban)
    } else {
      console.log('[main] 无封禁公告')
    }

    /* 普通公告处理：根据 trigger_frequency 过滤是否需要弹出 */
    if (result.data.normal && result.data.normal.length > 0) {
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const thisWeek = getWeekKey() // YYYY-Www

      const viewedOnce = uni.getStorageSync('viewedAnnouncements') || []
      const viewedDaily = uni.getStorageSync('viewedDailyAnnouncements') || {}
      const viewedWeekly = uni.getStorageSync('viewedWeeklyAnnouncements') || {}

      const newAnnouncements = result.data.normal.filter(item => {
        const freq = item.trigger_frequency || 'once'
        switch (freq) {
          case 'every_time':
            // 每次进入都弹出，无需判断查看记录
            return true
          case 'daily':
            // 今天还没看过才弹出
            return !(viewedDaily[item.id] === today)
          case 'weekly':
            // 本周还没看过才弹出
            return !(viewedWeekly[item.id] === thisWeek)
          case 'once':
          default:
            // 终生只看一次
            return !viewedOnce.includes(item.id)
        }
      })

      if (newAnnouncements.length > 0) {
        console.log('[main] 有新普通公告:', newAnnouncements.length, '条')
        uni.setStorageSync('newAnnouncements', newAnnouncements)
        uni.$emit('showAnnouncements', newAnnouncements)
      }
    }
  } catch (err) {
    console.error('[main] 获取公告失败:', err)
  }
}

/* 获取周标识（年份-第几周） */
function getWeekKey() {
  const now = new Date()
  const year = now.getFullYear()
  const start = new Date(year, 0, 1)
  const diff = (now - start) / (1000 * 60 * 60 * 24)
  const weekNum = Math.ceil((diff + start.getDay() + 1) / 7)
  return `${year}-W${weekNum}`
}
