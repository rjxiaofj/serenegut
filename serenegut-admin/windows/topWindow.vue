<template>
  <!-- 顶部窗口高度约等于 0：仅在小屏提供打开/关闭侧栏的浮动按钮 -->
  <view class="sg-mobile-nav">
    <view v-if="open" class="sg-mobile-nav__mask" @click="close"></view>
    <view class="sg-mobile-nav__btn" :class="{ 'is-open': open }" @click="toggle">
      <uni-icons :type="open ? 'closeempty' : 'list'" size="20" :color="open ? '#8d4b00' : '#554336'" />
    </view>
  </view>
</template>

<script>
  export default {
    data() {
      return {
        open: false,
      };
    },
    methods: {
      toggle() {
        this.open ? this.close() : this.show();
      },
      show() {
        this.open = true;
        uni.showLeftWindow();
      },
      close() {
        this.open = false;
        uni.hideLeftWindow();
      },
    },
  };
</script>

<style lang="scss">
  .sg-mobile-nav {
    width: 0;
    height: 0;
  }

  /* 顶部窗口高度约等于 0，抬高层级确保小屏浮动按钮与遮罩位于侧栏之上 */
  .uni-top-window {
    z-index: 1300 !important;
  }

  /* 默认（桌面）隐藏，仅小屏显示 */
  .sg-mobile-nav__btn {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 1200;
    width: 40px;
    height: 40px;
    display: none;
    align-items: center;
    justify-content: center;
    background: var(--bg-card-strong);
    border: 1px solid rgba(255, 220, 195, 0.6);
    border-radius: var(--radius-full);
    box-shadow: var(--shadow-float);
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
  }
  .sg-mobile-nav__btn:hover {
    background: var(--primary-soft);
  }
  /* 侧栏展开时按钮移到侧栏右上角，避免遮挡品牌 Logo */
  .sg-mobile-nav__btn.is-open {
    left: 188px;
  }

  .sg-mobile-nav__mask {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 240px;
    z-index: 1100;
    display: none;
    background: rgba(42, 31, 21, 0.28);
  }

  @media screen and (max-width: 959px) {
    .sg-mobile-nav__btn {
      display: flex;
    }
    .sg-mobile-nav__mask {
      display: block;
    }
  }
</style>