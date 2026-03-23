import { lazy } from 'react'
import applicationsUrl from '@/assets/images/sider/applications.svg'
import appStoreUrl from '@/assets/images/sider/appStore.svg'
import dipStudioUrl from '@/assets/images/sider/dipStudio.svg'
import type { RouteConfig } from './types'

const MyApp = lazy(() => import('../pages/MyApp'))
const AppStore = lazy(() => import('../pages/AppStore'))
const Home = lazy(() => import('../pages/Home'))
const WorkPlan = lazy(() => import('../pages/WorkPlan'))
const WorkPlanDetail = lazy(() => import('../pages/WorkPlan/Details'))
const ChatKitTest = lazy(() => import('../pages/ChatKitTest'))
const History = lazy(() => import('../pages/DigitalHuman/History'))
const HistoryItem = lazy(() => import('../pages/DigitalHuman/History/HistoryItem'))
const DigitalHumanManagement = lazy(() => import('../pages/DigitalHuman/Management'))
const DigitalHumanDetail = lazy(() => import('../pages/DigitalHuman/Details'))
const DHSetting = lazy(() => import('../pages/DigitalHuman/DHSetting'))

/**
 * 路由配置数组
 * 这里定义了所有路由信息，包括路径、组件、菜单显示等
 */
export const routeConfigs: RouteConfig[] = [
  // --- Home Section ---
  {
    path: 'home',
    key: 'home',
    label: '首页',
    iconUrl: dipStudioUrl,
    requiredRoleIds: [],
    element: <Home />,
    showInSidebar: true,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'home',
        headerType: 'micro-app',
      },
    },
  },
  {
    path: 'chat-kit-test',
    key: 'chat-kit-test',
    label: 'ChatKitTest',
    requiredRoleIds: [],
    element: <ChatKitTest />,
    showInSidebar: false,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'home',
        headerType: 'micro-app',
      },
    },
  },

  // --- AI Store Section ---
  {
    path: 'store/my-app',
    key: 'my-app',
    label: '应用',
    iconUrl: applicationsUrl,
    requiredRoleIds: [],
    element: <MyApp />,
    showInSidebar: true,
    showInHeader: true,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: true,
        siderType: 'store',
        headerType: 'store',
      },
    },
  },
  {
    path: 'store/app-store',
    key: 'app-store',
    label: '应用商店',
    iconUrl: appStoreUrl,
    requiredRoleIds: [],
    element: <AppStore />,
    showInSidebar: true,
    showInHeader: true,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: true,
        siderType: 'store',
        headerType: 'store',
      },
    },
  },

  // --- Digital Human Section ---
  {
    path: 'digital-human/management',
    key: 'digital-human-management',
    label: '我的数字员工',
    iconUrl: dipStudioUrl,
    element: <DigitalHumanManagement />,
    showInSidebar: true,
    showInHeader: true,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
  {
    path: 'work-plan',
    key: 'work-plan',
    label: '工作计划',
    iconUrl: dipStudioUrl,
    element: <WorkPlan />,
    showInSidebar: true,
    showInHeader: true,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
  {
    path: 'work-plan/:workPlanId',
    key: 'work-plan-item',
    label: '工作计划',
    element: <WorkPlanDetail />,
    showInSidebar: false,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
  // {
  //   path: 'digital-human/history',
  //   key: 'history',
  //   label: '历史记录',
  //   iconUrl: dipStudioUrl,
  //   element: <History />,
  //   showInSidebar: true,
  //   showInHeader: true,
  //   handle: {
  //     layout: {
  //       hasSider: true,
  //       hasHeader: false,
  //       siderType: 'digital-human',
  //       headerType: 'home',
  //     },
  //   },
  // },
  {
    path: 'digital-human/history/:historyId',
    key: 'history-item',
    label: '历史记录',
    element: <HistoryItem />,
    showInSidebar: false,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
  {
    path: 'digital-human/management/setting',
    key: 'digital-human-setting-new',
    label: '数字员工新建配置',
    element: <DHSetting />,
    showInSidebar: false,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
  // 详情 Tab 暂用页面 state，子路径路由先关闭
  // {
  //   path: 'digital-human/management/:digitalHumanId/plan',
  //   key: 'digital-human-detail-plan',
  //   label: '数字员工详情',
  //   element: <DigitalHumanDetail />,
  //   showInSidebar: false,
  //   handle: {
  //     layout: {
  //       hasSider: true,
  //       hasHeader: false,
  //       siderType: 'digital-human',
  //       headerType: 'home',
  //     },
  //   },
  // },
  // {
  //   path: 'digital-human/management/:digitalHumanId/session',
  //   key: 'digital-human-detail-session',
  //   label: '数字员工详情',
  //   element: <DigitalHumanDetail />,
  //   showInSidebar: false,
  //   handle: {
  //     layout: {
  //       hasSider: true,
  //       hasHeader: false,
  //       siderType: 'digital-human',
  //       headerType: 'home',
  //     },
  //   },
  // },
  // {
  //   path: 'digital-human/management/:digitalHumanId/config',
  //   key: 'digital-human-detail-config',
  //   label: '数字员工详情',
  //   element: <DigitalHumanDetail />,
  //   showInSidebar: false,
  //   handle: {
  //     layout: {
  //       hasSider: true,
  //       hasHeader: false,
  //       siderType: 'digital-human',
  //       headerType: 'home',
  //     },
  //   },
  // },
  {
    path: 'digital-human/management/:digitalHumanId/setting',
    key: 'digital-human-setting-item',
    label: '数字员工配置',
    element: <DHSetting />,
    showInSidebar: false,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
  {
    path: 'digital-human/management/:digitalHumanId',
    key: 'digital-human-detail',
    label: '数字员工详情',
    element: <DigitalHumanDetail />,
    showInSidebar: false,
    handle: {
      layout: {
        hasSider: true,
        hasHeader: false,
        siderType: 'digital-human',
        headerType: 'home',
      },
    },
  },
]
