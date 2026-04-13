import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import useResizeObserver from '../useResizeObserver'

const globalResizeObserver = globalThis.ResizeObserver

describe('useResizeObserver', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.ResizeObserver = globalResizeObserver
  })

  it('target 与 enabled 为真时注册 ResizeObserver，卸载时 disconnect', () => {
    const disconnect = vi.fn()
    const observe = vi.fn()
    const unobserve = vi.fn()
    let ctorCalls = 0
    class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        ctorCalls += 1
        queueMicrotask(() => {
          cb([], this as unknown as ResizeObserver)
        })
      }

      observe = observe
      disconnect = disconnect
      unobserve = unobserve
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver)

    const onResize = vi.fn()
    const target = document.createElement('div')

    const { unmount } = renderHook(() => useResizeObserver({ target, onResize, enabled: true }))

    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        expect(ctorCalls).toBe(1)
        expect(observe).toHaveBeenCalledWith(target)
        expect(onResize).toHaveBeenCalled()
        unmount()
        expect(disconnect).toHaveBeenCalledOnce()
        resolve()
      })
    })
  })

  it('enabled 为 false 时不 observe', () => {
    class MockResizeObserver {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
    }
    const ResizeObserverSpy = vi
      .spyOn(globalThis, 'ResizeObserver')
      .mockImplementation(MockResizeObserver as unknown as typeof ResizeObserver)

    const target = document.createElement('div')
    renderHook(() => useResizeObserver({ target, onResize: vi.fn(), enabled: false }))

    expect(ResizeObserverSpy).not.toHaveBeenCalled()
    ResizeObserverSpy.mockRestore()
  })
})
