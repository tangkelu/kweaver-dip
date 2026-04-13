import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useListService } from '../useListService'

type Item = { name?: string; id: string }

/** 稳定引用，避免 useEffect 依赖变化导致死循环 */
const getFetchArgsFromSearch = (searchValue: string): [string] => [searchValue]
const getFetchArgsEmptyKeyword = (): [string] => ['']

describe('useListService', () => {
  it('autoLoad 为 true 时挂载后调用 fetchFn 并写入 items', async () => {
    const data: Item[] = [{ id: '1', name: 'Alpha' }]
    const fetchFn = vi.fn().mockResolvedValue(data)

    const { result } = renderHook(() =>
      useListService<Item>({
        fetchFn,
        autoLoad: true,
      }),
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(fetchFn).toHaveBeenCalled()
    expect(result.current.items).toEqual(data)
    expect(result.current.error).toBeNull()
  })

  it('autoLoad 为 false 时不自动请求', async () => {
    const fetchFn = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() =>
      useListService<Item>({
        fetchFn,
        autoLoad: false,
      }),
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(result.current.items).toEqual([])
  })

  it('handleSearch 触发本地按 name 过滤', async () => {
    const fetchFn = vi.fn().mockResolvedValue([
      { id: '1', name: 'Apple' },
      { id: '2', name: 'Banana' },
    ])

    const { result } = renderHook(() =>
      useListService<Item>({
        fetchFn,
        autoLoad: true,
      }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleSearch('app')
    })

    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: '1', name: 'Apple' }])
    })
  })

  it('提供 getFetchArgs 时默认禁用本地过滤', async () => {
    const fetchFn = vi.fn().mockImplementation(async (kw: string) => {
      if (kw === 'x') return [{ id: '1', name: 'Filtered' }]
      return [{ id: '1', name: 'All' }]
    })

    const { result } = renderHook(() =>
      useListService<Item, [string]>({
        fetchFn,
        autoLoad: true,
        getFetchArgs: getFetchArgsFromSearch,
      }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleSearch('x')
    })

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledWith('x')
      expect(result.current.items).toEqual([{ id: '1', name: 'Filtered' }])
    })
  })

  it('getFetchArgs 存在且 disableLocalFilter 为 false 时仍做本地过滤', async () => {
    const fetchFn = vi.fn().mockResolvedValue([
      { id: '1', name: 'Apple' },
      { id: '2', name: 'Berry' },
    ])

    const { result } = renderHook(() =>
      useListService<Item, [string]>({
        fetchFn,
        autoLoad: true,
        getFetchArgs: getFetchArgsEmptyKeyword,
        disableLocalFilter: false,
      }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.handleSearch('app')
    })

    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: '1', name: 'Apple' }])
    })
  })

  it('handleRefresh 使用上次请求参数重新拉取', async () => {
    const fetchFn = vi.fn().mockResolvedValue([{ id: '1', name: 'A' }])

    const { result } = renderHook(() =>
      useListService<Item, [string, number]>({
        fetchFn,
        autoLoad: false,
      }),
    )

    await act(async () => {
      await result.current.fetchList('id', 2)
    })
    expect(fetchFn).toHaveBeenLastCalledWith('id', 2)

    fetchFn.mockResolvedValueOnce([{ id: '2', name: 'B' }])
    await act(async () => {
      result.current.handleRefresh()
    })

    expect(fetchFn).toHaveBeenLastCalledWith('id', 2)
    await waitFor(() => {
      expect(result.current.items).toEqual([{ id: '2', name: 'B' }])
    })
  })

  it('AbortError 不写入 error（loading 按实现可能保持为 true）', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))

    const { result } = renderHook(() =>
      useListService<Item>({
        fetchFn,
        autoLoad: true,
      }),
    )

    await waitFor(() => expect(fetchFn).toHaveBeenCalled())
    expect(result.current.error).toBeNull()
    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('业务错误使用 description 作为 error', async () => {
    const fetchFn = vi.fn().mockRejectedValue({ description: '权限不足' })

    const { result } = renderHook(() =>
      useListService<Item>({
        fetchFn,
        autoLoad: true,
      }),
    )

    await waitFor(() => {
      expect(result.current.error).toBe('权限不足')
    })
  })

  it('新请求会 abort 上一请求（带 abort 的 Promise）', async () => {
    const abort = vi.fn()
    const first = new Promise<Item[]>(() => {}) as Promise<Item[]> & { abort: () => void }
    first.abort = abort

    const secondData: Item[] = [{ id: '2', name: 'B' }]
    const fetchFn = vi.fn().mockReturnValueOnce(first).mockResolvedValueOnce(secondData)

    const { result } = renderHook(() =>
      useListService<Item, []>({
        fetchFn,
        autoLoad: false,
      }),
    )

    await act(async () => {
      void result.current.fetchList()
    })
    expect(abort).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.fetchList()
    })
    expect(abort).toHaveBeenCalled()
    expect(result.current.items).toEqual(secondData)
  })
})
