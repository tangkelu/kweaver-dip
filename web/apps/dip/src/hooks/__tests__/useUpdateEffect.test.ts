import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import useUpdateEffect from '../useUpdateEffect'

describe('useUpdateEffect', () => {
  it('首次渲染不执行 effect，依赖变化后执行', () => {
    const effect = vi.fn()
    const { rerender } = renderHook(({ dep }) => useUpdateEffect(effect, [dep]), {
      initialProps: { dep: 0 },
    })

    expect(effect).not.toHaveBeenCalled()

    rerender({ dep: 1 })
    expect(effect).toHaveBeenCalledTimes(1)

    rerender({ dep: 2 })
    expect(effect).toHaveBeenCalledTimes(2)
  })
})
