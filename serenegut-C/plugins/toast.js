/**
 * 自定义 Toast 插件
 *
 * 设计说明（uni-app 小程序环境）：
 * 1. 小程序中 App.vue 不能包含 template，无法在 App.vue 挂载全局组件；
 *    因此采用「每个页面挂载 <CustomToast ref="customToast" /> + 劫持 uni API」方案。
 * 2. 通过 getCurrentPages() 拿到当前页面实例的 $refs.customToast 调用组件方法，
 *    只操作「当前页面」的 Toast 实例，避免多页面同时弹出。
 * 3. 若当前页面未挂载 CustomToast 组件，则降级到原生 uni.showToast，保证可用性。
 */

// 保存原生 API 引用，用于降级场景，避免劫持后递归调用
const originalShowToast = uni.showToast.bind(uni)
const originalShowLoading = uni.showLoading.bind(uni)
const originalHideLoading = uni.hideLoading.bind(uni)

/**
 * 获取当前页面栈顶页面的 CustomToast 组件实例
 * @returns {Object|null} 组件实例，没有则返回 null
 */
function getToastComp() {
    try {
        const pages = getCurrentPages()
        const current = pages[pages.length - 1]
        // current.$vm 为页面 Vue 实例，$refs.customToast 为模板中 ref="customToast" 的组件
        if (current && current.$vm && current.$vm.$refs && current.$vm.$refs.customToast) {
            return current.$vm.$refs.customToast
        }
    } catch (e) {
        // 忽略异常，走降级逻辑
    }
    return null
}

/** 统一参数格式：字符串 -> { title } */
function normalizeOptions(options) {
    if (typeof options === 'string') {
        return { title: options }
    }
    return options || {}
}

/** 显示 Toast（替代 uni.showToast） */
function showToast(options = {}) {
    options = normalizeOptions(options)
    const comp = getToastComp()
    if (comp) {
        comp.show(options)
    } else {
        // 降级：当前页面未挂载组件时使用原生 toast
        originalShowToast(options)
    }
}

/** 显示加载中（替代 uni.showLoading） */
function showLoading(options = {}) {
    options = normalizeOptions(options)
    const comp = getToastComp()
    if (comp) {
        // loading 类型 duration 设为 0，不自动关闭，需手动 hide()
        comp.show({
            title: options.title || '加载中',
            icon: 'loading',
            duration: 0,
            mask: options.mask !== false
        })
    } else {
        originalShowLoading(options)
    }
}

/** 隐藏加载中（替代 uni.hideLoading） */
function hideLoading() {
    const comp = getToastComp()
    if (comp) {
        comp.hide()
    } else {
        originalHideLoading()
    }
}

export default {
    install(app) {
        // 1. 劫持原生 toast API：所有现有 uni.showToast / showLoading / hideLoading 调用
        //    将自动走自定义组件，无需逐个修改业务代码
        uni.showToast = showToast
        uni.showLoading = showLoading
        uni.hideLoading = hideLoading

        // 2. 挂载 $toast 全局属性，提供语义化调用方式（this.$toast.success(...)）
        const $toast = {
            show: showToast,
            loading: (title) => showLoading({ title }),
            success: (title) => showToast({ title, icon: 'success', duration: 2000 }),
            error: (title) => showToast({ title, icon: 'error', duration: 2000 }),
            hide: hideLoading
        }
        app.config.globalProperties.$toast = $toast
        // 同时挂到 uni 上，便于非组件场景调用
        uni.$toast = $toast
    }
}
