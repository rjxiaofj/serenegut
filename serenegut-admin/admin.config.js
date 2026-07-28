export default {
  login: {
    url: '/uni_modules/uni-id-pages/pages/login/login-withpwd', // 登录页面路径
  },
  index: {
    url: '/pages/index/index', // 登录后跳转的第一个页面
  },
  error: {
    url: '/pages/error/404', // 404 Not Found 错误页面路径
  },
  navBar: {
    // 顶部导航
    logo: '/static/logo.png', // 左侧 Logo
    langs: [
      {
        text: '中文简体',
        lang: 'zh-Hans',
      },
      {
        text: '中文繁體',
        lang: 'zh-Hant',
      },
      {
        text: 'English',
        lang: 'en',
      },
    ],
    themes: [
      {
        text: '默认',
        value: 'default',
      },
      {
        text: '绿柔',
        value: 'green',
      },
    ],
    debug: {
      enable: process.env.NODE_ENV !== 'production', //是否显示错误信息
      engine: [
        {
          // 搜索引擎配置（每条错误信息后，会自动生成搜索链接，点击后跳转至搜索引擎）
          name: '百度',
          url: 'https://www.baidu.com/baidu?wd=ERR_MSG',
        },
        {
          name: '谷歌',
          url: 'https://www.google.com/search?q=ERR_MSG',
        },
      ],
    },
  },
  sideBar: {
    // 左侧菜单
    // 配置静态菜单列表（放置在用户被授权的菜单列表下边）
    staticMenu: [
      {
        menu_id: 'sg-dashboard',
        text: '数据总览',
        icon: 'admin-icons-dashboard',
        value: '/pages/index/index',
      },
      {
        menu_id: 'sg-users',
        text: '用户管理',
        icon: 'admin-icons-user',
        value: '/pages/business/users/list',
      },
      {
        menu_id: 'sg-records',
        text: '健康记录',
        icon: 'admin-icons-activity',
        value: '/pages/business/records/list',
      },
      {
        menu_id: 'sg-articles',
        text: '科普文章',
        icon: 'admin-icons-doc',
        value: '/pages/business/articles/list',
      },
      {
        menu_id: 'sg-rankings',
        text: '排行榜',
        icon: 'admin-icons-trend',
        value: '/pages/business/rankings/list',
      },
      {
        menu_id: 'sg-settings',
        text: '系统设置',
        icon: 'admin-icons-eco',
        value: '/pages/business/settings/list',
      },
      {
        menu_id: 'sg-system',
        text: '系统管理',
        icon: 'admin-icons-xitongguanli',
        url: '',
        children: [
          {
            menu_id: 'sg-system-menu',
            text: '菜单管理',
            icon: 'admin-icons-manager-menu',
            value: '/pages/system/menu/list',
          },
          {
            menu_id: 'sg-system-role',
            text: '角色管理',
            icon: 'admin-icons-manager-role',
            value: '/pages/system/role/list',
          },
          {
            menu_id: 'sg-system-permission',
            text: '权限管理',
            icon: 'admin-icons-manager-permission',
            value: '/pages/system/permission/list',
          },
          {
            menu_id: 'sg-system-user',
            text: '管理员账户',
            icon: 'admin-icons-manager-user',
            value: '/pages/system/user/list',
          },
        ],
      },
    ],
  },
  uniStat: {},
};
