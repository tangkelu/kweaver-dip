import { lazy } from 'react'
import applicationsUrl from '@/assets/images/sider/applications.svg'
import appStoreUrl from '@/assets/images/sider/appStore.svg'
import chatUrl from '@/assets/images/sider/chat.svg'
import digitalHumanUrl from '@/assets/images/sider/digitalHuman.svg'
import dipStudioUrl from '@/assets/images/sider/dipStudio.svg'
import skillUrl from '@/assets/images/sider/skill.svg'
import {
  BUSINESS_NETWORK_BASE_PATH,
  businessLeafMenuItems,
} from '@/components/Sider/BusinessSider/menus'
import type { RouteConfig } from './types'

const MyApp = lazy(() => import('../pages/MyApp'))
const AppStore = lazy(() => import('../pages/AppStore'))
const Home = lazy(() => import('../pages/Home'))
const WorkPlan = lazy(() => import('../pages/WorkPlan'))
const WorkPlanDetail = lazy(() => import('../pages/WorkPlan/Details'))
const History = lazy(() => import('../pages/History'))
const HistoryConversation = lazy(() => import('../pages/History/HistoryConversation'))
const DigitalHumanManagement = lazy(() => import('../pages/DigitalHuman/Management'))
const SkillsManagement = lazy(() => import('../pages/Skills'))
const SkillsDetailPage = lazy(() => import('../pages/Skills/Details'))
const DigitalHumanDetail = lazy(() => import('../pages/DigitalHuman/Details'))
const DHSetting = lazy(() => import('../pages/DigitalHuman/DHSetting'))
const Conversation = lazy(() => import('../pages/Conversation'))
const InitialConfiguration = lazy(() => import('../pages/InitialConfiguration'))
const BusinessNetwork = lazy(() => import('../pages/BusinessNetwork'))

const businessLayoutConfig = {
  hasHeader: true,
  siderMode: 'app',
  module: 'business',
  headerType: 'business',
} as const

/**
 * 路由配置数组
 * 这里定义了所有路由信息，包括路径、组件、菜单显示等
 */
export const routeConfigs: RouteConfig[] = [
  // --- Home Section ---
  {
    path: 'home',
    key: 'home',
    labelKey: 'routes.home',
    iconUrl: chatUrl,
    requiredRoleIds: [],
    element: <Home />,
    sidebarMode: 'menu',
    handle: {
      layout: {
        hasHeader: false,
        siderMode: 'entry',
        module: 'studio',
        headerType: 'home',
      },
    },
  },

  // --- AI Store Section ---
  {
    path: 'store/my-app',
    key: 'my-app',
    labelKey: 'routes.myApp',
    iconUrl: applicationsUrl,
    requiredRoleIds: [],
    element: <MyApp />,
    sidebarMode: 'menu',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'store',
        headerType: 'store',
      },
    },
  },
  {
    path: 'store/app-store',
    key: 'app-store',
    labelKey: 'routes.appStore',
    iconUrl: appStoreUrl,
    requiredRoleIds: [],
    element: <AppStore />,
    sidebarMode: 'menu',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'store',
        headerType: 'store',
      },
    },
  },

  // --- DIP Studio Section ---
  {
    path: 'studio/digital-human',
    key: 'digital-human',
    labelKey: 'routes.digitalHuman',
    iconUrl: digitalHumanUrl,
    element: <DigitalHumanManagement />,
    sidebarMode: 'menu',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/skills',
    key: 'skills',
    labelKey: 'routes.skills',
    iconUrl: skillUrl,
    element: <SkillsManagement />,
    sidebarMode: 'menu',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/skills/:skillName',
    key: 'skill-item',
    labelKey: 'routes.skillDetail',
    element: <SkillsDetailPage />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/conversation',
    key: 'studio-conversation',
    labelKey: 'routes.conversation',
    iconUrl: chatUrl,
    requiredRoleIds: [],
    element: <Conversation />,
    sidebarMode: 'entry-only',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/work-plan',
    key: 'work-plan',
    labelKey: 'routes.workPlan',
    iconUrl: dipStudioUrl,
    element: <WorkPlan />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/work-plan/:workPlanId',
    key: 'work-plan-item',
    labelKey: 'routes.workPlanDetail',
    element: <WorkPlanDetail />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/history',
    key: 'history',
    labelKey: 'routes.history',
    iconUrl: dipStudioUrl,
    element: <History />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/history/:sessionKey',
    key: 'history-item',
    labelKey: 'routes.history',
    element: <HistoryConversation />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/digital-human/setting',
    key: 'digital-human-setting-new',
    labelKey: 'routes.dhSettingNew',
    element: <DHSetting />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/digital-human/:digitalHumanId/setting',
    key: 'digital-human-setting-item',
    labelKey: 'routes.dhSettingItem',
    element: <DHSetting />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/digital-human/:digitalHumanId',
    key: 'digital-human-detail',
    labelKey: 'routes.dhDetail',
    element: <DigitalHumanDetail />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'app',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: 'studio/initial-configuration',
    key: 'initial-configuration',
    labelKey: 'routes.initialConfiguration',
    element: <InitialConfiguration />,
    sidebarMode: 'hidden',
    handle: {
      layout: {
        hasHeader: true,
        siderMode: 'none',
        module: 'studio',
        headerType: 'studio',
      },
    },
  },
  {
    path: BUSINESS_NETWORK_BASE_PATH.replace(/^\//, ''),
    key: 'business-network',
    labelKey: 'routes.businessNetwork',
    element: <BusinessNetwork />,
    sidebarMode: 'menu',
    handle: {
      layout: businessLayoutConfig,
    },
  },
  ...businessLeafMenuItems.flatMap((item): RouteConfig[] => {
    const normalizedPath = item.path.replace(/^\//, '')
    return [
      {
        path: normalizedPath,
        key: item.key,
        label: item.label,
        element: <BusinessNetwork />,
        sidebarMode: 'menu',
        handle: {
          layout: businessLayoutConfig,
        },
      },
      {
        path: `${normalizedPath}/*`,
        key: `${item.key}-nested`,
        label: item.label,
        element: <BusinessNetwork />,
        sidebarMode: 'menu',
        handle: {
          layout: businessLayoutConfig,
        },
      },
    ]
  }),
]
