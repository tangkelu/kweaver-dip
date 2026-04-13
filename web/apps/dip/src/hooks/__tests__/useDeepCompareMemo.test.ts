import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import useDeepCompareMemo from '../useDeepCompareMemo'

describe('useDeepCompareMemo', () => {
  it('深度相等的依赖不会重复调用 factory', () => {
    const factory = vi.fn(() => ({ v: 1 }))
    const { result, rerender } = renderHook(({ deps }) => useDeepCompareMemo(factory, deps), {
      initialProps: { deps: [{ a: 1 }] as unknown[] },
    })

    expect(factory).toHaveBeenCalledTimes(1)
    expect(result.current).toEqual({ v: 1 })

    rerender({ deps: [{ a: 1 }] })
    expect(factory).toHaveBeenCalledTimes(1)

    rerender({ deps: [{ a: 2 }] })
    expect(factory).toHaveBeenCalledTimes(2)
  })
})
