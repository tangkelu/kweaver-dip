import intl from 'react-intl-universal'
import { isPublicChannelVisible } from '@/utils/publicEnv'
import { type DESettingMenuItem, DESettingMenuKey } from './types'

/** 侧栏菜单 key 顺序（与原先 `deSettingMenuItems` 一致） */
export const deSettingMenuKeyOrder: DESettingMenuKey[] = [
  DESettingMenuKey.BASIC,
  DESettingMenuKey.SKILL,
  DESettingMenuKey.KNOWLEDGE,
  DESettingMenuKey.CHANNEL,
]

/** 各菜单项对应的 i18n 文案 key */
const labelKeyByMenuKey: Record<DESettingMenuKey, string> = {
  [DESettingMenuKey.BASIC]: 'digitalHuman.setting.menuBasic',
  [DESettingMenuKey.SKILL]: 'digitalHuman.setting.menuSkill',
  [DESettingMenuKey.KNOWLEDGE]: 'digitalHuman.setting.menuKnowledge',
  [DESettingMenuKey.CHANNEL]: 'digitalHuman.setting.menuChannel',
}

/** 侧栏菜单项（受 `PUBLIC_CHANNEL_VISIBLE` 影响时去掉「通道接入」） */
export const getDeSettingMenuItems = (): DESettingMenuItem[] => {
  const items: DESettingMenuItem[] = deSettingMenuKeyOrder.map((key) => ({
    key,
    label: intl.get(labelKeyByMenuKey[key]),
  }))
  if (!isPublicChannelVisible) {
    return items.filter((i) => i.key !== DESettingMenuKey.CHANNEL)
  }
  return items
}
