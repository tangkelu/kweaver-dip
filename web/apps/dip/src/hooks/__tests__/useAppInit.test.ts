import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const initLanguageMock = vi.fn().mockResolvedValue(undefined)
const initOEMConfigMock = vi.fn()

vi.mock('../useLanguage', () => ({
  useLanguage: () => ({
    initLanguage: initLanguageMock,
  }),
}))

vi.mock('@/stores/oemConfigStore', () => {
  const state = {
    oemResourceConfig: {} as Record<string, { product?: string }>,
    initialize: initOEMConfigMock,
  }
  return {
    useOEMConfigStore: Object.assign(
      (selector?: (s: typeof state) => unknown) => {
        if (selector) return selector(state)
        return state
      },
      { getState: () => state, setState: vi.fn() },
    ),
  }
})

const initQiankunMock = vi.fn()
vi.mock('@/utils/qiankun', () => ({
  initQiankun: () => initQiankunMock(),
}))

describe('useAppInit', () => {
  const originalTitle = document.title
  const originalDescriptor =
    Object.getOwnPropertyDescriptor(document, 'title') ||
    Object.getOwnPropertyDescriptor(Document.prototype, 'title')

  beforeEach(async () => {
    initLanguageMock.mockClear()
    initOEMConfigMock.mockClear()
    initQiankunMock.mockClear()
    document.title = ''
    for (const n of Array.from(document.head.querySelectorAll('link[rel="preload"]'))) {
      n.remove()
    }
    const { useOEMConfigStore } = await import('@/stores/oemConfigStore')
    const s = useOEMConfigStore.getState() as {
      oemResourceConfig: Record<string, { product?: string }>
    }
    s.oemResourceConfig = {}
  })

  afterEach(() => {
    document.title = originalTitle
    if (originalDescriptor) {
      try {
        Object.defineProperty(document, 'title', originalDescriptor)
      } catch {
        /* ignore */
      }
    }
  })

  it('挂载后设置标题、预加载、初始化语言/OEM/qiankun', async () => {
    const { useAppInit } = await import('../useAppInit')
    renderHook(() => useAppInit())

    expect(document.title).toBe('DIP')
    expect(document.head.querySelector('link[rel="preload"]')).not.toBeNull()
    expect(initLanguageMock).toHaveBeenCalled()
    expect(initOEMConfigMock).toHaveBeenCalled()
    expect(initQiankunMock).toHaveBeenCalled()
  })

  it('有 OEM product 时使用 product 作为标题', async () => {
    const oem = await import('@/stores/oemConfigStore')
    const store = oem.useOEMConfigStore.getState?.() as {
      oemResourceConfig: Record<string, { product?: string }>
    }
    if (store) {
      store.oemResourceConfig = { 'zh-CN': { product: 'MyProduct' } }
    }

    const { useAppInit } = await import('../useAppInit')
    renderHook(() => useAppInit())

    expect(document.title).toBe('MyProduct')
  })
})
