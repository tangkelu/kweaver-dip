import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/publicEnv', () => ({
  isPublicChannelVisible: true,
}))

import { DESettingMenuKey } from '../types'
import { deSettingMenuKeyOrder, getDeSettingMenuItems } from '../utils'

describe('DigitalHumanSetting/utils', () => {
  it('菜单项顺序与 key 正确', () => {
    expect(deSettingMenuKeyOrder).toEqual([
      DESettingMenuKey.BASIC,
      DESettingMenuKey.SKILL,
      DESettingMenuKey.KNOWLEDGE,
      DESettingMenuKey.CHANNEL,
    ])
  })

  it('菜单文案使用 i18n key（测试环境下 intl mock 返回 key）', () => {
    expect(getDeSettingMenuItems().map((item) => item.label)).toEqual([
      'digitalHuman.setting.menuBasic',
      'digitalHuman.setting.menuSkill',
      'digitalHuman.setting.menuKnowledge',
      'digitalHuman.setting.menuChannel',
    ])
  })

  it('getDeSettingMenuItems 在默认环境下与 deSettingMenuKeyOrder 长度一致', () => {
    expect(getDeSettingMenuItems().map((item) => item.key)).toEqual(deSettingMenuKeyOrder)
  })
})
