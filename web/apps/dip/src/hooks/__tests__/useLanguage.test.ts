import { act, renderHook } from '@testing-library/react'
import intl from 'react-intl-universal'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setMicroAppGlobalStateMock = vi.fn()

vi.mock('@/utils/micro-app/globalState', () => ({
  setMicroAppGlobalState: (...args: unknown[]) => setMicroAppGlobalStateMock(...args),
}))

const store = { language: 'zh-CN' as string }
const setLanguageMock = vi.fn((lang: string) => {
  store.language = lang
})

vi.mock('@/stores/languageStore', () => ({
  useLanguageStore: Object.assign(
    () => ({
      setLanguage: setLanguageMock,
    }),
    {
      getState: () => store,
    },
  ),
}))

vi.mock('@/i18n/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/i18n/config')>()
  return {
    ...actual,
    getNavigatorLanguage: () => null,
  }
})

describe('useLanguage', () => {
  beforeEach(() => {
    store.language = 'zh-CN'
    setLanguageMock.mockClear()
    setMicroAppGlobalStateMock.mockClear()
    vi.mocked(intl.init).mockClear()
  })

  it('initLanguage 使用持久化语言并同步微应用状态', async () => {
    store.language = 'en-US'

    const { useLanguage } = await import('../useLanguage')
    const { result } = renderHook(() => useLanguage())

    await act(async () => {
      await result.current.initLanguage()
    })

    expect(intl.init).toHaveBeenCalled()
    expect(setMicroAppGlobalStateMock).toHaveBeenCalledWith(
      { language: 'en-US' },
      { allowAllFields: true },
    )
  })

  it('updateLanguage 更新 store、intl 与微应用状态', async () => {
    const { useLanguage } = await import('../useLanguage')
    const { result } = renderHook(() => useLanguage())

    await act(async () => {
      await result.current.updateLanguage('zh-TW')
    })

    expect(setLanguageMock).toHaveBeenCalledWith('zh-TW')
    expect(intl.init).toHaveBeenCalled()
    expect(setMicroAppGlobalStateMock).toHaveBeenCalledWith(
      { language: 'zh-TW' },
      { allowAllFields: true },
    )
  })
})
