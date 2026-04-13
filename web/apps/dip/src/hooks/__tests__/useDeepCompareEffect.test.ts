import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import useDeepCompareEffect from '../useDeepCompareEffect'

describe('useDeepCompareEffect', () => {
  it('引用不同但深度相等时不重复执行 effect', () => {
    const effect = vi.fn()
    const { rerender } = renderHook(({ deps }) => useDeepCompareEffect(effect, deps), {
      initialProps: { deps: [{ x: 1 }] as unknown[] },
    })

    expect(effect).toHaveBeenCalledTimes(1)

    rerender({ deps: [{ x: 1 }] })
    expect(effect).toHaveBeenCalledTimes(1)

    rerender({ deps: [{ x: 2 }] })
    expect(effect).toHaveBeenCalledTimes(2)
  })

  it('deep 为 false 时仍用 isEqual 比较，结构相同的新引用不重复执行', () => {
    const effect = vi.fn()
    const { rerender } = renderHook(({ deps }) => useDeepCompareEffect(effect, deps, false), {
      initialProps: { deps: [{ x: 1 }] as unknown[] },
    })

    expect(effect).toHaveBeenCalledTimes(1)
    rerender({ deps: [{ x: 1 }] })
    expect(effect).toHaveBeenCalledTimes(1)
  })
})
