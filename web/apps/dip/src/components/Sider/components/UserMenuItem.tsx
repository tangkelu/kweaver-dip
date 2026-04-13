import type { MenuProps } from 'antd'
import { Dropdown } from 'antd'
import clsx from 'classnames'
import intl from 'react-intl-universal'
import { useNavigate } from 'react-router-dom'
import AvatarIcon from '@/assets/images/sider/avatar.svg?react'
import { useUserInfoStore } from '@/stores'

export interface UserMenuItemProps {
  /** 是否折叠 */
  collapsed: boolean
}

export const UserMenuItem = ({ collapsed }: UserMenuItemProps) => {
  const navigate = useNavigate()
  const { userInfo, logout } = useUserInfoStore()
  const showSystemSettings = useUserInfoStore(
    (s) => s.isAdmin && s.modules.includes('studio'),
  )

  const handleLogout = () => {
    logout()
  }

  const displayName =
    userInfo?.email || userInfo?.vision_name || userInfo?.account || intl.get('sider.defaultUser')

  const menuItems: MenuProps['items'] = [
    ...(showSystemSettings
      ? [
          {
            key: 'system-settings',
            label: intl.get('sider.systemSettings'),
            title: '',
            onClick: () => {
              navigate('/studio/initial-configuration')
            },
          },
          { type: 'divider' as const },
        ]
      : []),
    {
      key: 'logout',
      label: intl.get('sider.logout'),
      title: '',
      onClick: handleLogout,
    },
  ]

  const trigger = (
    <div
      className={clsx(
        'flex items-center gap-2 min-w-0 w-full cursor-pointer',
        collapsed ? 'h-10 min-h-10 justify-center' : 'justify-start',
      )}
    >
      <AvatarIcon className="w-4 h-4 shrink-0" />
      {!collapsed && (
        <span
          className="flex-1 min-w-0 truncate text-sm text-[var(--dip-text-color)]"
          title={displayName}
        >
          {displayName}
        </span>
      )}
    </div>
  )

  return (
    <div className={clsx(collapsed && 'flex min-w-0 w-full flex-1')}>
      <Dropdown
        menu={{
          items: menuItems,
          inlineCollapsed: false,
        }}
        placement="topLeft"
        trigger={['click']}
      >
        {trigger}
      </Dropdown>
    </div>
  )
}
