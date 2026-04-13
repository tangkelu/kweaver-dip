import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchSessionsMock = vi.fn()
const fetchPlansMock = vi.fn()

vi.mock('@/stores/userHistoryStore', () => ({
  useUserHistoryStore: (selector: (s: { fetchSessions: typeof fetchSessionsMock }) => unknown) =>
    selector({ fetchSessions: fetchSessionsMock }),
}))

vi.mock('@/stores/userWorkPlanStore', () => ({
  useUserWorkPlanStore: (selector: (s: { fetchPlans: typeof fetchPlansMock }) => unknown) =>
    selector({ fetchPlans: fetchPlansMock }),
}))

describe('useSyncHistorySessions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchSessionsMock.mockReset()
    fetchPlansMock.mockReset()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('延迟后定时同步 fetchSessions 与 fetchPlans', async () => {
    const { default: useSyncHistorySessions } = await import('../useSyncHistorySessions')
    renderHook(() => useSyncHistorySessions())

    expect(fetchSessionsMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchSessionsMock).toHaveBeenCalledWith({ silent: true })
    expect(fetchPlansMock).toHaveBeenCalledWith({ silent: true })

    fetchSessionsMock.mockClear()
    fetchPlansMock.mockClear()

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchSessionsMock).toHaveBeenCalledWith({ silent: true })
    expect(fetchPlansMock).toHaveBeenCalledWith({ silent: true })
  })

  it('页面不可见时不执行同步', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    const { default: useSyncHistorySessions } = await import('../useSyncHistorySessions')
    renderHook(() => useSyncHistorySessions())

    await vi.advanceTimersByTimeAsync(2000)
    expect(fetchSessionsMock).not.toHaveBeenCalled()
    expect(fetchPlansMock).not.toHaveBeenCalled()
  })
})
