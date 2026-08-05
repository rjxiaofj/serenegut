<template>
  <view class="sg-sidebar" :class="{ 'sg-sidebar--collapsed': collapsed }">
    <!-- 顶部品牌区：品牌 + 折叠按钮（折叠时点击 Logo 展开） -->
    <view class="sg-sidebar__header" @click="onBrandClick">
      <image class="sg-brand-logo" src="/static/logo.png" mode="aspectFit"></image>
      <view v-show="!collapsed" class="sg-brand-text">
        <text class="sg-brand-name">Serene Gut</text>
        <text class="sg-brand-sub">健康管理后台</text>
      </view>
      <view v-show="!collapsed" class="sg-collapse-btn" @click.stop="toggleSidebar">
        <uni-icons type="arrowleft" size="16" color="#887364" />
      </view>
    </view>

    <!-- 菜单列表 -->
    <scroll-view class="sg-sidebar__nav" scroll-y="true">
      <view v-for="m in menus" :key="m.path || m.menu_id" class="sg-nav-wrap">
        <!-- 普通菜单 -->
        <view
          v-if="!m.children"
          class="sg-nav-item"
          :class="{ 'sg-nav-item--active': isActive(m) }"
          @click="clickMenu(m)"
        >
          <uni-icons class="sg-nav-icon" :type="m.icon" size="20" :color="isActive(m) ? '#ffffff' : '#887364'" />
          <text v-show="!collapsed" class="sg-nav-label">{{ m.label }}</text>
        </view>

        <!-- 含子菜单的分组（折叠子菜单） -->
        <template v-else>
          <view
            class="sg-nav-item"
            :class="{ 'sg-nav-item--open': isGroupActive(m) }"
            @click="toggleGroup(m)"
          >
            <uni-icons class="sg-nav-icon" :type="m.icon" size="20" :color="isGroupActive(m) ? '#8d4b00' : '#887364'" />
            <text v-show="!collapsed" class="sg-nav-label">{{ m.label }}</text>
            <uni-icons
              v-show="!collapsed"
              class="sg-nav-arrow"
              :type="isGroupExpanded(m) ? 'arrowup' : 'arrowdown'"
              size="14"
              color="#b3a394"
            />
          </view>
          <view v-show="!collapsed && isGroupExpanded(m)" class="sg-nav-sub">
            <view
              v-for="c in m.children"
              :key="c.path"
              class="sg-nav-item sg-nav-item--sub"
              :class="{ 'sg-nav-item--active': isActive(c) }"
              @click="clickMenu(c)"
            >
              <text class="sg-nav-label">{{ c.label }}</text>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <!-- 底部：管理员信息（固定贴底） -->
    <view class="sg-sidebar__user">
      <view class="sg-user-main" @click="onBrandClick">
        <view class="sg-user-avatar">{{ avatarLetter }}</view>
        <view v-show="!collapsed" class="sg-user-meta">
          <text class="sg-user-name">{{ adminName }}</text>
          <text class="sg-user-role">管理员</text>
        </view>
      </view>
      <view v-show="!collapsed" class="sg-logout-btn" @click="logout">退出</view>
    </view>
  </view>
</template>

<script>
  import { mapState, mapMutations } from 'vuex';
  import config from '@/admin.config.js';
  import { menuApi } from '@/js_sdk/sg-admin/api.js';

  export default {
    data() {
      return {
        currentMenu: '/',
        expandedGroups: {}, // 记录各分组的展开状态，key 为 menu_id 或 label
        menus: [
          /* 总览：一级菜单最上方，直达数据看板 */
          { menu_id: 'overview', label: '数据总览', icon: 'home', path: '/pages/index/index' },
          {
            menu_id: 'home',
            label: '主页',
            icon: 'images',
            children: [
              { path: '/pages/business/ad/list', label: '广告管理', icon: 'sound' },
              { path: '/pages/system/ai-report/list', label: 'AI模型管理', icon: 'chat' },
            ],
          },
          {
            menu_id: 'user_mgmt',
            label: '用户管理',
            icon: 'contact',
            children: [
              { path: '/pages/business/users/list', label: '用户信息', icon: 'person' },
              { path: '/pages/business/records/list', label: '健康记录', icon: 'list' },
            ],
          },
          {
            menu_id: 'science',
            label: '科普页面',
            icon: 'images',
            children: [
              { path: '/pages/business/articles/list', label: '科普文章', icon: 'images' },
              { path: '/pages/business/cooperation/list', label: '合作信息', icon: 'link' },
            ],
          },
          {
            menu_id: 'rank',
            label: '排行',
            icon: 'flag',
            children: [
              { path: '/pages/business/ranking-notice/list', label: '跑马灯公告', icon: 'notification' },
              { path: '/pages/business/rankings/list', label: '排行榜管理', icon: 'flag' },
            ],
          },
          {
            menu_id: 'system',
            label: '系统管理',
            icon: 'gear-filled',
            children: [
              { path: '/pages/system/announcement/list', label: '系统公告', icon: 'notification' },
              { path: '/pages/business/settings/list', label: '系统设置', icon: 'gear' },
              { path: '/pages/system/menu/list', label: '菜单管理', icon: 'list' },
              { path: '/pages/system/role/list', label: '角色管理', icon: 'staff' },
              { path: '/pages/system/user/list', label: '管理员用户', icon: 'person' },
            ],
          },
        ],
      };
    },
    computed: {
      ...mapState('app', ['collapsed']),
      userInfo() {
        return this.$uniIdPagesStore.store.userInfo;
      },
      adminName() {
        const u = this.userInfo || {};
        return u.nickname || u.username || u.mobile || u.email || '管理员';
      },
      avatarLetter() {
        const name = this.adminName;
        return name ? name.charAt(0).toUpperCase() : 'A';
      },
      currentPath() {
        return this.currentMenu;
      },
    },
    watch: {
      // #ifdef H5
      $route: {
        immediate: true,
        handler(newRoute) {
          const path = newRoute ? newRoute.fullPath || newRoute.path : '';
          if (path) {
            this.currentMenu = path.split('?')[0];
          }
          /* 自动展开包含当前页面的分组 */
          this.autoExpandByPath(this.currentMenu);
        },
      },
      // #endif
      collapsed: {
        immediate: true,
        handler(val) {
          this.applyBodyCollapse(val);
        },
      },
    },
    mounted() {
      this.applyBodyCollapse(this.collapsed);
      /* 从数据库加载菜单，失败时保留硬编码菜单作为降级 */
      this.loadDbMenus();
    },
    methods: {
      ...mapMutations('app', ['SET_COLLAPSED']),
      toggleSidebar() {
        this.SET_COLLAPSED(!this.collapsed);
      },
      /* 折叠态点击品牌或头像时展开侧栏 */
      onBrandClick() {
        if (this.collapsed) {
          this.SET_COLLAPSED(false);
        }
      },
      logout() {
        uni.showModal({
          title: '退出登录',
          content: '确定要退出当前账号吗？',
          success: (res) => {
            if (res.confirm) {
              this.$uniIdPagesStore.mutations.logout();
            }
          },
        });
      },
      applyBodyCollapse(val) {
        // #ifdef H5
        if (typeof document !== 'undefined') {
          document.body.classList.toggle('sg-collapse', !!val);
        }
        // #endif
      },
      isActive(item) {
        return this.currentPath === item.path;
      },
      isGroupActive(item) {
        return item.children && item.children.some((c) => this.currentPath === c.path);
      },
      /* 获取分组的唯一标识，用于 expandedGroups 的 key */
      getGroupKey(m) {
        return m.menu_id || m.label;
      },
      /* 判断某个分组是否已展开 */
      isGroupExpanded(m) {
        return !!this.expandedGroups[this.getGroupKey(m)];
      },
      /* 切换某个分组的展开/折叠状态 */
      toggleGroup(m) {
        const key = this.getGroupKey(m);
        this.expandedGroups[key] = !this.expandedGroups[key];
      },
      /* 根据当前页面路径自动展开对应的分组 */
      autoExpandByPath(path) {
        if (!path || !this.menus.length) return;
        this.menus.forEach((m) => {
          if (m.children && m.children.some((c) => c.path === path)) {
            this.expandedGroups[this.getGroupKey(m)] = true;
          }
        });
      },
      /**
       * 将数据库菜单格式转换为前端导航格式
       * 数据库格式：{ menu_id, name, icon, url, sort, parent_id, enable }
       * 前端格式：{ path, label, icon, children?, menu_id }
       */
      transformMenus(dbMenus) {
        if (!dbMenus || !dbMenus.length) return [];
        /* 过滤掉禁用的菜单 */
        const activeMenus = dbMenus.filter((m) => m.enable !== false);
        /* 递归构建树形结构 */
        const buildTree = (parentId) => {
          return activeMenus
            .filter((m) => (m.parent_id || '') === parentId)
            .sort((a, b) => (a.sort || 0) - (b.sort || 0))
            .map((m) => {
              const children = buildTree(m.menu_id);
              const item = {
                path: m.url || '',
                label: m.name,
                icon: m.icon || 'list',
                menu_id: m.menu_id,
              };
              if (children.length > 0) {
                item.children = children;
              }
              return item;
            });
        };
        return buildTree('');
      },
      /* 从数据库加载菜单；数据库未配置的页面入口自动补齐 */
      async loadDbMenus() {
        try {
          const res = await menuApi.getList();
          if (res && res.code === 0 && res.data && res.data.list && res.data.list.length) {
            const dbMenus = this.transformMenus(res.data.list);
            if (dbMenus.length > 0) {
              this.appendMissingMenus(dbMenus);
              this.menus = dbMenus;
              /* 加载完成后根据当前路径自动展开对应分组 */
              this.autoExpandByPath(this.currentMenu);
            }
          }
        } catch (e) {
          /* 加载失败时静默降级到硬编码菜单，不提示用户 */
          console.warn('[leftWindow] 数据库菜单加载失败，使用硬编码菜单', e);
        }
      },
      /* 补齐数据库菜单中缺失的页面入口（广告管理、合作信息、跑马灯公告） */
      appendMissingMenus(menus) {
        const existingPaths = new Set();
        const collectPaths = (list) => {
          list.forEach((item) => {
            if (item.path) existingPaths.add(item.path);
            if (item.children && item.children.length) collectPaths(item.children);
          });
        };
        collectPaths(menus);

        const extraGroups = [
          {
            after: 'article',
            items: [
              { menu_id: 'cooperation', label: '合作信息', icon: 'link', path: '/pages/business/cooperation/list' },
              { menu_id: 'ad', label: '广告管理', icon: 'sound', path: '/pages/business/ad/list' },
            ],
          },
          {
            after: 'ranking',
            items: [
              { menu_id: 'ranking_notice', label: '跑马灯公告', icon: 'notification', path: '/pages/business/ranking-notice/list' },
            ],
          },
        ];

        extraGroups.forEach(({ after, items }) => {
          const missing = items.filter((item) => !existingPaths.has(item.path));
          if (!missing.length) return;
          let index = menus.findIndex((m) => m.menu_id === after);
          if (index === -1) {
            /* 找不到锚点时插入到“系统管理”之前，否则追加到末尾 */
            const sysIndex = menus.findIndex((m) => m.menu_id === 'system');
            index = sysIndex === -1 ? menus.length - 1 : sysIndex - 1;
          }
          menus.splice(index + 1, 0, ...missing);
          missing.forEach((item) => existingPaths.add(item.path));
        });
      },
      clickMenu(item) {
        let url = item.path;
        if (!url) return;

        // #ifdef H5
        if (url.indexOf('http') === 0) {
          window.open(url);
          return;
        }
        // #endif

        if (url[0] !== '/' && url.indexOf('http') !== 0) {
          url = '/' + url;
        }
        // #ifndef H5
        if (url === '/') {
          url = config.index.url;
        }
        // #endif

        uni.redirectTo({
          url: url,
          fail: () => {
            uni.showModal({
              title: '提示',
              content: '页面 ' + url + ' 跳转失败',
              showCancel: false,
            });
          },
        });
      },
    },
  };
</script>

<style lang="scss">
  .sg-sidebar {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background: var(--bg-sidebar);
    backdrop-filter: blur(20px) saturate(1.08);
    -webkit-backdrop-filter: blur(20px) saturate(1.08);
    border-right: 1px solid rgba(141, 75, 0, 0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* 顶部品牌区 */
  .sg-sidebar__header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px;
    border-bottom: 1px solid rgba(141, 75, 0, 0.08);
    flex-shrink: 0;
  }
  .sg-sidebar--collapsed .sg-sidebar__header {
    justify-content: center;
    padding: 20px 0;
    cursor: pointer;
  }
  .sg-brand-logo {
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 50%;
    object-fit: contain;
  }
  .sg-brand-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .sg-brand-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
  }
  .sg-brand-sub {
    font-size: 11px;
    color: var(--text-placeholder);
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .sg-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-left: auto;
    border-radius: 50%;
    cursor: pointer;
    transition: background 0.2s;
  }
  .sg-collapse-btn:hover {
    background: var(--primary-veil);
  }

  /* 菜单列表 */
  .sg-sidebar__nav {
    flex: 1 1 0;
    height: 0;
    min-height: 0;
    padding: 10px 12px;
    box-sizing: border-box;
    overflow: hidden;
  }
  /* #ifdef H5 */
  .sg-sidebar__nav ::-webkit-scrollbar {
    display: none;
  }
  /* #endif */

  .sg-nav-wrap {
    margin-bottom: 4px;
  }
  .sg-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 16px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    position: relative;
    transition: background 0.25s var(--ease-harmony), color 0.25s var(--ease-harmony);
    white-space: nowrap;
    overflow: hidden;
  }
  .sg-nav-item:hover {
    background: var(--primary-veil);
    color: var(--primary);
  }
  .sg-nav-item--active {
    background: var(--grad-primary);
    color: #fff;
    box-shadow: var(--shadow-btn);
  }
  /* 父级含激活子项时高亮（非渐变，仅标识） */
  .sg-nav-item--open {
    background: var(--primary-veil);
    color: var(--primary);
  }
  .sg-nav-icon {
    flex-shrink: 0;
  }
  .sg-nav-label {
    flex: 1;
    transition: opacity 0.2s;
  }
  .sg-nav-arrow {
    flex-shrink: 0;
  }

  /* 子菜单 */
  .sg-nav-sub {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0 4px 24px;
  }
  .sg-nav-item--sub {
    padding: 9px 16px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .sg-nav-item--sub:hover {
    color: var(--primary);
  }
  .sg-nav-item--sub.sg-nav-item--active {
    color: #fff;
  }

  /* 折叠态：隐藏文字、箭头与子菜单，图标居中 */
  .sg-sidebar--collapsed .sg-nav-label,
  .sg-sidebar--collapsed .sg-nav-arrow,
  .sg-sidebar--collapsed .sg-nav-sub {
    display: none;
  }
  .sg-sidebar--collapsed .sg-nav-item {
    justify-content: center;
    padding: 11px 0;
  }

  /* 底部：管理员信息（固定贴底） */
  .sg-sidebar__user {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: auto;
    padding: 12px 16px;
    border-top: 1px solid rgba(141, 75, 0, 0.08);
    background: #ffffff;
    box-shadow: 0 -6px 16px rgba(146, 64, 14, 0.06);
    flex: 0 0 auto;
    z-index: 2;
  }
  .sg-sidebar--collapsed .sg-sidebar__user {
    justify-content: center;
    padding: 12px 0;
  }
  .sg-user-main {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }
  .sg-sidebar--collapsed .sg-user-main {
    flex: none;
    cursor: pointer;
  }
  .sg-user-avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--grad-primary);
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 3px rgba(255, 220, 195, 0.45), var(--shadow-sm);
  }
  .sg-user-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .sg-user-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sg-user-role {
    font-size: 11px;
    color: var(--text-placeholder);
  }
  .sg-logout-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 12px;
    color: var(--text-muted);
    background: var(--bg-veil);
    border: 1px solid rgba(255, 220, 195, 0.5);
    cursor: pointer;
    transition: color 0.2s, background 0.2s, border-color 0.2s;
  }
  .sg-logout-btn:hover {
    color: var(--danger);
    background: var(--danger-soft);
    border-color: rgba(192, 83, 60, 0.3);
  }
</style>
