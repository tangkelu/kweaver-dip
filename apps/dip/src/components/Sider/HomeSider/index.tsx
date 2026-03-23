import type { MenuProps } from 'antd'
import { Button, Menu, message, Tooltip } from 'antd'
import clsx from 'classnames'
import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import logoImage from '@/assets/images/brand/logo.png'
import SidebarAiStoreIcon from '@/assets/images/sider/aiStore.svg?react'
import SidebarSystemIcon from '@/assets/images/sider/proton.svg?react'
import { routeConfigs } from '@/routes/routes'
import type { RouteConfig } from '@/routes/types'
import {
  getFirstVisibleRouteBySiderType,
  getRouteByPath,
  isRouteVisibleForRoles,
} from '@/routes/utils'
import { useLanguageStore } from '@/stores/languageStore'
import { useOEMConfigStore } from '@/stores/oemConfigStore'
import { getFullPath } from '@/utils/config'
import { getAccessToken, getRefreshToken } from '@/utils/http/token-config'
import IconFont from '../../IconFont'
import { MaskIcon } from '../components/GradientMaskIcon'
import { UserMenuItem } from '../components/UserMenuItem'

interface HomeSiderProps {
  /** 是否折叠 */
  collapsed: boolean
  /** 折叠状态改变回调 */
  onCollapse: (collapsed: boolean) => void
}

/**
 * 首页侧边栏（HomeSider）
 *
 * - 负责渲染：Logo + 折叠按钮 + 用户信息
 * - 显示路由菜单项、钉住的应用、外部链接等
 */
const HomeSider = ({ collapsed, onCollapse }: HomeSiderProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [, messageContextHolder] = message.useMessage()
  const { language } = useLanguageStore()
  const { getOEMResourceConfig } = useOEMConfigStore()
  const oemResourceConfig = getOEMResourceConfig(language)
  // TODO: 角色信息需要从其他地方获取，暂时使用空数组
  const roleIds = useMemo(() => new Set<string>([]), [])

  /** 新建会话 */
  const handleCreateSession = () => {
    navigate('/home')
  }

  /** 根据当前路由确定选中的菜单项 */
  const getSelectedKey = useCallback(() => {
    const pathname = location.pathname
    if (pathname === '/') {
      return 'home'
    }

    const route = getRouteByPath(pathname)
    return route?.key || 'home'
  }, [location.pathname])

  const selectedKey = getSelectedKey()

  /** 菜单项 */
  const menuItems = useMemo<MenuProps['items']>(() => {
    const hasKey = (route: RouteConfig): route is RouteConfig & { key: string } => {
      return Boolean(route.key)
    }

    const visibleSidebarRoutes = routeConfigs
      .filter((route) => route.showInSidebar && route.key)
      .filter((route) => isRouteVisibleForRoles(route, roleIds))
      .filter((route) => route.handle?.layout?.siderType === 'digital-human')
      .filter(hasKey)

    const items: MenuProps['items'] = []

    // 第一组：普通数字员工路由，按 group 分组展示
    const groupMap = new Map<string, NonNullable<MenuProps['items']>>()
    const groupedRouteOrder: string[] = []

    visibleSidebarRoutes.forEach((route) => {
      if (!route.key) return

      const item: Exclude<MenuProps['items'], undefined>[number] = {
        key: route.key,
        label: route.label || route.key,
        icon: route.iconUrl ? (
          <MaskIcon
            url={route.iconUrl}
            className="w-4 h-4"
            background={
              selectedKey === route.key
                ? 'linear-gradient(210deg, #1C4DFA 0%, #3FA9F5 100%)'
                : '#333333'
            }
          />
        ) : null,
        onClick: () => {
          if (route.path) {
            navigate(`/${route.path}`)
          }
        },
      }

      if (!route.group) {
        // 无 group 的路由直接平铺
        items.push(item)
        return
      }

      if (!groupMap.has(route.group)) {
        groupMap.set(route.group, [])
        groupedRouteOrder.push(route.group)
      }
      const groupChildren = groupMap.get(route.group)
      if (groupChildren) {
        groupChildren.push(item)
      }
    })

    groupedRouteOrder.forEach((groupName) => {
      const children = groupMap.get(groupName)
      if (!children || children.length === 0) return

      // 分组标题作为一个普通、不可点击的菜单项，后面紧跟该分组下的子项，整体平铺展示
      items.push({
        key: `group-${groupName}`,
        label: groupName,
        type: 'group',
      })

      children.forEach((child) => {
        items.push(child)
      })
    })

    return items
  }, [roleIds, selectedKey, navigate])

  /** 外链菜单项 */
  const externalMenuItems = useMemo<MenuProps['items']>(() => {
    const firstStoreRoute = getFirstVisibleRouteBySiderType('store', roleIds)
    const baseOrigin = window.location.origin
    const getExternalUrl = (path: string) => `${baseOrigin}${path}`

    const storePath = `/${firstStoreRoute?.path || 'store/my-app'}`

    const storeHref = getFullPath(storePath)

    // 业务知识网络单点登录参数
    const redirectUrl = '/studio/home'
    const token = getAccessToken()
    const refreshToken = getRefreshToken()
    const ssoSearchParams = new URLSearchParams({
      redirect_url: redirectUrl,
      product: 'adp',
    })
    if (token) {
      if (process.env.NODE_ENV === 'development') {
        // TODO: 测试使用
        ssoSearchParams.set(
          'token',
          'ory_at_1Ol1cd_wZVPwYNCr50AiR9dctvUvM1_mI2C-f481n6Y.uikVUF3c1Rf5KFBivT8JbYDE6VDFLplv_1KRiihWqWU',
        )
        ssoSearchParams.set(
          'refreshToken',
          'ory_rt_b1VBSySehSNQro5ZPZPTxScOEYVkNwaVpzTVk0tgCZI.8lJkppPN97yZSGWTlZOSxqz3fpoTg0dKTR8MwCWr5Uo',
        )
      } else {
        ssoSearchParams.set('token', token)
        ssoSearchParams.set('refreshToken', refreshToken)
      }
    }
    const ssoUrl = `${baseOrigin}/interface/studioweb/internalSSO?${ssoSearchParams.toString()}`

    return [
      {
        key: 'ai-store',
        label: (
          <a
            href={storeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 justify-between"
          >
            <span>AI Store</span> <span>&gt;</span>
          </a>
        ),
        icon: <SidebarAiStoreIcon />,
      },
      {
        key: 'data-platform',
        label: (
          <a
            href={ssoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 justify-between"
          >
            <span>业务知识网络</span> <span>&gt;</span>
          </a>
        ),
        icon: <IconFont type="icon-yewuzhishiwangluo" />,
      },
      {
        key: 'system',
        label: (
          <a
            href={getExternalUrl('/deploy')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 justify-between"
          >
            <span>系统工作台</span> <span>&gt;</span>
          </a>
        ),
        icon: <SidebarSystemIcon />,
      },
    ]
  }, [roleIds])

  // 获取 OEM logo，如果获取不到则使用默认 logo
  const logoUrl = useMemo(() => {
    const base64Image = oemResourceConfig?.['logo.png']
    if (!base64Image) {
      return logoImage
    }
    // 如果已经是 data URL 格式，直接使用
    if (base64Image.startsWith('data:image/')) {
      return base64Image
    }
    // 否则添加 base64 前缀
    return `data:image/png;base64,${base64Image}`
  }, [oemResourceConfig])

  return (
    <div className="flex flex-col h-full px-0 pt-4 pb-1 overflow-hidden">
      {messageContextHolder}
      {/* logo + 收缩按钮 */}
      <div
        className={clsx(
          'flex items-center gap-2 pb-4',
          collapsed ? 'justify-center pl-1.5 pr-1.5' : 'justify-between pl-3 pr-2',
        )}
      >
        <img src={logoUrl} alt="logo" className={clsx('h-8 w-auto', collapsed && 'hidden')} />
        <Tooltip title={collapsed ? '展开' : '收起'} placement="right">
          <button
            type="button"
            className="text-sm cursor-pointer flex items-center justify-center w-8 h-8 rounded-md text-[--dip-text-color] hover:text-[--dip-primary-color]"
            onClick={() => onCollapse(!collapsed)}
          >
            <IconFont type="icon-dip-cebianlan" />
          </button>
        </Tooltip>
      </div>

      {/* 新建会话按钮 */}
      <div
        className={clsx(
          'flex items-center gap-2 pb-10',
          collapsed ? 'justify-center px-3' : 'justify-between px-5',
        )}
      >
        <Tooltip title={collapsed ? '新建会话' : ''} placement="right">
          <Button
            type="primary"
            icon={<IconFont type="icon-dip-add" />}
            onClick={handleCreateSession}
            styles={{ root: { width: '100%' } }}
          >
            {collapsed ? '' : '新建会话'}
          </Button>
        </Tooltip>
      </div>

      {/* 菜单内容 */}
      <div className="flex-1 flex flex-col dip-hideScrollbar">
        <div className="flex-1">
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            inlineCollapsed={collapsed}
            selectable
          />
        </div>

        {/* 外链菜单内容 */}
        <div className="shrink-0">
          {/* <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems[1]}
            inlineCollapsed={collapsed}
            selectable
          /> */}
          <Menu
            mode="inline"
            selectedKeys={[]}
            items={externalMenuItems}
            inlineCollapsed={collapsed}
            selectable={false}
          />
        </div>
      </div>

      {/* 用户 */}
      <UserMenuItem collapsed={collapsed} />
    </div>
  )
}

export default HomeSider
