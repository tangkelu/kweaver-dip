import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApplicationInfo } from '@/apis'
import { WENSHU_APP_KEY } from '@/routes/types'

const getApplicationsMock = vi.fn()

vi.mock('@/apis', () => ({
  getApplications: (...args: unknown[]) => getApplicationsMock(...args),
}))

describe('useApplicationsService', () => {
  beforeEach(() => {
    getApplicationsMock.mockReset()
  })

  it('拉取列表后为 WENSHU_APP_KEY 标记 isBuiltIn', async () => {
    getApplicationsMock.mockResolvedValue([
      { key: 'other', name: 'Other' },
      { key: WENSHU_APP_KEY, name: 'Wenshu' },
    ])

    const { useApplicationsService } = await import('../useApplicationsService')
    const { result } = renderHook(() => useApplicationsService({}))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.apps).toEqual([
      { key: 'other', name: 'Other', isBuiltIn: false },
      { key: WENSHU_APP_KEY, name: 'Wenshu', isBuiltIn: true },
    ])
  })

  it('updateApp 按 key 替换项', async () => {
    getApplicationsMock.mockResolvedValue([{ key: 'k1', name: 'N1' }])

    const { useApplicationsService } = await import('../useApplicationsService')
    const { result } = renderHook(() => useApplicationsService({}))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.updateApp({ key: 'k1', name: 'Updated' } as ApplicationInfo)
    })

    expect(result.current.apps).toEqual([{ key: 'k1', name: 'Updated' }])
  })

  it('fetchAppList 透传为手动拉取', async () => {
    getApplicationsMock.mockResolvedValue([])

    const { useApplicationsService } = await import('../useApplicationsService')
    const { result } = renderHook(() => useApplicationsService({ autoLoad: false }))

    await act(async () => {
      await result.current.fetchAppList()
    })

    expect(getApplicationsMock).toHaveBeenCalled()
  })
})
