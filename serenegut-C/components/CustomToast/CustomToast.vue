<template>
    <!-- 自定义 Toast 遮罩层：pointer-events:none 不拦截点击，避免影响页面交互 -->
    <view v-if="visible" class="custom-toast-mask" @click.stop>
        <view class="custom-toast" :class="{ 'toast-loading': type === 'loading' }">
            <!-- 加载动画：圆环顺时针旋转（底色轨道 + 旋转弧线） -->
            <view v-if="type === 'loading'" class="toast-loading-ring">
                <view class="ring-track"></view>
                <view class="ring-spinner"></view>
            </view>
            <!-- 成功 / 失败 / 纯文字 的图标 -->
            <AppIcon v-if="type === 'success'" name="check" color="green" :size="48" />
            <AppIcon v-if="type === 'error'" name="x" color="red" :size="48" />
            <!-- 文字内容 -->
            <text class="toast-text">{{ message }}</text>
        </view>
    </view>
</template>

<script>
import AppIcon from '@/components/AppIcon/AppIcon.vue'

export default {
    name: 'CustomToast',
    components: { AppIcon },
    data() {
        return {
            visible: false,   // 是否显示
            message: '',      // 文案
            type: 'none',     // 类型：none / success / error / loading
            duration: 2000,   // 自动关闭时长（ms），loading 时为 0 表示不自动关闭
            timer: null       // 自动关闭定时器引用
        }
    },
    methods: {
        /**
         * 显示 Toast
         * @param {Object|String} options 字符串则视为 title
         */
        show(options = {}) {
            // 兼容字符串简写调用：show('提示') 等价于 show({ title: '提示' })
            if (typeof options === 'string') {
                options = { title: options }
            }
            this.message = options.title || ''
            this.type = options.icon || 'none'
            this.duration = options.duration != null ? options.duration : 2000
            this.visible = true

            // 清掉上一次的定时器，避免重复计时
            if (this.timer) {
                clearTimeout(this.timer)
                this.timer = null
            }

            // loading 类型不自动关闭，需手动调用 hide()
            if (this.type !== 'loading' && this.duration > 0) {
                this.timer = setTimeout(() => {
                    this.hide()
                }, this.duration)
            }
        },
        /** 隐藏 Toast（同时用于 hideLoading） */
        hide() {
            this.visible = false
            if (this.timer) {
                clearTimeout(this.timer)
                this.timer = null
            }
        }
    }
}
</script>

<style lang="scss" scoped>
/* 遮罩层：全屏居中，不拦截点击事件 */
.custom-toast-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999998;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

/* Toast 主体：深棕磨砂背景，符合棕色系主题 */
.custom-toast {
    min-width: 200rpx;
    max-width: 500rpx;
    padding: 32rpx 40rpx;
    background: rgba(40, 30, 20, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.25);

    /* loading 类型留出更大空间给旋转圆环 */
    &.toast-loading {
        padding: 48rpx 40rpx;
        min-width: 180rpx;
    }
}

.toast-icon {
    font-size: 48rpx;
    font-weight: 700;
    line-height: 1;
}

.toast-icon-success {
    color: #f0c987; /* 暖棕金，契合主题 */
}

.toast-icon-error {
    color: #e8a87c; /* 暖橙棕 */
}

.toast-text {
    font-size: 28rpx;
    color: #fff;
    text-align: center;
    line-height: 1.5;
    word-break: break-all;
}

/* ===== 加载动画：圆环顺时针旋转 ===== */
.toast-loading-ring {
    position: relative;
    width: 72rpx;
    height: 72rpx;
}

/* 底色轨道：浅色完整圆环 */
.ring-track {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 6rpx solid rgba(255, 255, 255, 0.15);
    box-sizing: border-box;
}

/* 旋转弧线：仅上、右两侧着色，形成旋转视觉 */
.ring-spinner {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 6rpx solid transparent;
    border-top-color: #b15f00;   /* 棕色主题主色 */
    border-right-color: #8d4b00; /* 棕色主题深色 */
    box-sizing: border-box;
    /* 顺时针旋转：0deg -> 360deg */
    animation: ring-spin 0.8s linear infinite;
}

@keyframes ring-spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
</style>
