import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import useLatestState from '../useLatestState'

describe('useLatestState', () => {
  it('getState 返回与界面一致的最新值', () => {
    const { result } = renderHook(() => useLatestState(0))
    const [, setState, getState] = result.current

    act(() => {
      setState(1)
    })
    expect(result.current[0]).toBe(1)
    expect(getState()).toBe(1)

    act(() => {
      setState((n) => (n as number) + 1)
    })
    expect(getState()).toBe(2)
  })

  it('卸载后 setState 不再更新 state', () => {
    const { result, unmount } = renderHook(() => useLatestState(0))
    const [, setState] = result.current

    unmount()

    act(() => {
      setState(99)
    })
    // 卸载后 React state 不应被更新为 99（若更新会违反规则；hook 内已拦截）
    expect(result.current[0]).toBe(0)
  })

  it('resetState 无参时合并回初始值', () => {
    const { result } = renderHook(() => useLatestState({ a: 1, b: 2 }))
    const [, setState, , resetState] = result.current

    act(() => {
      setState({ a: 10, b: 20 })
    })
    act(() => {
      resetState()
    })
    expect(result.current[0]).toEqual({ a: 1, b: 2 })
  })

  it('resetState 可按 key 恢复初始字段', () => {
    const { result } = renderHook(() => useLatestState({ a: 1, b: 2 }))
    const [, setState, , resetState] = result.current

    act(() => {
      setState({ a: 10, b: 20 })
    })
    act(() => {
      resetState('a')
    })
    expect(result.current[0]).toEqual({ a: 1, b: 20 })
  })
})
