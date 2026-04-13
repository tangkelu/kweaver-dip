import type { MenuProps } from 'antd'
import intl from 'react-intl-universal'
import IconFont from '@/components/IconFont'
import { SkillManagementActionEnum } from './types'

export const getSkillManagementMenuItems = (
  onMenuClick: (key: SkillManagementActionEnum) => void,
): MenuProps['items'] => {
  return [
    {
      key: SkillManagementActionEnum.Delete,
      icon: <IconFont type="icon-trash" />,
      label: intl.get('skillManagement.delete'),
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation()
        onMenuClick(SkillManagementActionEnum.Delete)
      },
    },
  ]
}
