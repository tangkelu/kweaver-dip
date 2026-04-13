import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { themeColors } from '@/styles/themeColors'

const getOEMBasicConfig = vi.fn()

vi.mock('@/stores/oemConfigStore', () => ({
  useOEMConfigStore: vi.fn(() => ({
    getOEMBasicConfig,
  })),
}))

describe('useOEMBranding', () => {
  beforeEach(() => {
    getOEMBasicConfig.mockReset()
    document.documentElement.removeAttribute('style')
    for (const el of Array.from(document.querySelectorAll("link[rel='icon']"))) {
      el.remove()
    }
  })

  it('无 OEM 主题时使用默认 primary 并写入 CSS 变量', async () => {
    getOEMBasicConfig.mockReturnValue(null)

    const { useOEMBranding } = await import('../useOEMBranding')
    const { result } = renderHook(() => useOEMBranding())

    expect(result.current.primaryColor).toBe(themeColors.primary)
    expect(document.documentElement.style.getPropertyValue('--dip-primary-color')).toBe(
      themeColors.primary,
    )
    expect(document.documentElement.style.getPropertyValue('--dip-success-color')).toBe(
      themeColors.success,
    )
  })

  it('有 OEM theme 时覆盖 primaryColor', async () => {
    getOEMBasicConfig.mockReturnValue({ theme: '#112233' })

    const { useOEMBranding } = await import('../useOEMBranding')
    const { result } = renderHook(() => useOEMBranding())

    expect(result.current.primaryColor).toBe('#112233')
    expect(document.documentElement.style.getPropertyValue('--dip-primary-color')).toBe('#112233')
  })

  it('有 favicon 配置时设置 link[rel=icon]', async () => {
    getOEMBasicConfig.mockReturnValue({
      'favicon.ico': 'https://example.com/f.ico',
    })

    const { useOEMBranding } = await import('../useOEMBranding')
    renderHook(() => useOEMBranding())

    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    expect(link?.href).toBe('https://example.com/f.ico')
  })
})
