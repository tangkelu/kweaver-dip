import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteConfig } from '../types'

const { mockRouteConfigs, prefState, getGuideStatusMock } = vi.hoisted(() => {
  const mockRouteConfigs: RouteConfig[] = [
    {
      path: 'home',
      key: 'home',
      sidebarMode: 'menu',
      handle: { layout: { module: 'studio' } },
    },
    {
      path: 'store/app',
      key: 'store-app',
      sidebarMode: 'menu',
      handle: { layout: { module: 'store' } },
    },
    {
      path: 'studio/dh',
      key: 'dh',
      sidebarMode: 'menu',
      handle: { layout: { module: 'studio' } },
    },
    {
      path: 'studio/pm',
      key: 'pm-list',
      sidebarMode: 'menu',
      handle: { layout: { module: 'studio' } },
    },
    {
      path: 'studio/pm/:projectId',
      key: 'pm-detail',
      sidebarMode: 'hidden',
      handle: { layout: { module: 'studio' } },
    },
    {
      path: 'parent',
      key: 'parent',
      sidebarMode: 'menu',
    },
    {
      path: 'parent/child',
      key: 'child',
      sidebarMode: 'hidden',
      breadcrumbParentKeys: ['parent'],
    },
    {
      path: 'solo',
      key: 'solo',
      sidebarMode: 'entry-only',
      handle: { layout: { module: 'studio' } },
    },
  ]

  const prefState = {
    wenshuAppInfo: null as { key: string } | null,
    fetchPinned: vi.fn().mockResolvedValue(undefined),
  }

  const getGuideStatusMock = vi.fn()

  return { mockRouteConfigs, prefState, getGuideStatusMock }
})

vi.mock('@/utils/config', () => ({
  BASE_PATH: '/dip-hub',
}))

vi.mock('../routes', () => ({
  routeConfigs: mockRouteConfigs,
}))

vi.mock('@/stores', () => ({
  usePreferenceStore: {
    getState: () => ({
      fetchPinnedMicroApps: prefState.fetchPinned,
      wenshuAppInfo: prefState.wenshuAppInfo,
    }),
  },
}))

vi.mock('@/apis/dip-studio/guide', () => ({
  getGuideStatus: () => getGuideStatusMock(),
}))

describe('routes/utils', () => {
  beforeEach(() => {
    vi.resetModules()
    prefState.wenshuAppInfo = null
    prefState.fetchPinned.mockClear()
    getGuideStatusMock.mockReset()
  })

  it('getRouteSidebarMode 缺省为 hidden', async () => {
    const { getRouteSidebarMode } = await import('../utils')
    expect(getRouteSidebarMode({ path: 'x' })).toBe('hidden')
    expect(getRouteSidebarMode({ path: 'x', sidebarMode: 'menu' })).toBe('menu')
  })

  it('getRouteByPath 去掉 BASE_PATH 并精确匹配', async () => {
    const { getRouteByPath } = await import('../utils')
    expect(getRouteByPath('/dip-hub/home')?.key).toBe('home')
    expect(getRouteByPath('home')?.key).toBe('home')
  })

  it('getRouteByPath 识别 application/:appKey 微应用占位', async () => {
    const { getRouteByPath } = await import('../utils')
    const r = getRouteByPath('/dip-hub/application/my-app-id/foo')
    expect(r?.key).toBe('micro-app-my-app-id')
    expect(r?.sidebarMode).toBe('hidden')
  })

  it('getRouteByPath 动态段匹配', async () => {
    const { getRouteByPath } = await import('../utils')
    expect(getRouteByPath('studio/pm/proj-1')?.key).toBe('pm-detail')
  })

  it('getRouteByPath 前缀匹配子路径', async () => {
    const { getRouteByPath } = await import('../utils')
    expect(getRouteByPath('store/app/extra')?.key).toBe('store-app')
  })

  it('getParentRoute 返回上一级静态路径对应路由', async () => {
    const { getParentRoute, getRouteByPath } = await import('../utils')
    const child = getRouteByPath('studio/pm/proj-1')
    expect(child).toBeDefined()
    if (!child) throw new Error('expected route')
    const parent = getParentRoute(child)
    expect(parent?.key).toBe('pm-list')
  })

  it('getRouteByKey', async () => {
    const { getRouteByKey } = await import('../utils')
    expect(getRouteByKey('dh')?.path).toBe('studio/dh')
    expect(getRouteByKey('missing')).toBeUndefined()
  })

  it('getBreadcrumbAncestorRoutes：breadcrumbParentKeys 优先', async () => {
    const { getBreadcrumbAncestorRoutes, getRouteByKey } = await import('../utils')
    const child = getRouteByKey('child')
    expect(child).toBeDefined()
    if (!child) throw new Error('expected route')
    expect(getBreadcrumbAncestorRoutes(child).map((r) => r.key)).toEqual(['parent'])
  })

  it('getBreadcrumbAncestorRoutes：无配置时用 getParentRoute', async () => {
    const { getBreadcrumbAncestorRoutes, getRouteByPath } = await import('../utils')
    const leaf = getRouteByPath('studio/pm/p1')
    expect(leaf).toBeDefined()
    if (!leaf) throw new Error('expected route')
    expect(getBreadcrumbAncestorRoutes(leaf).map((r) => r.key)).toEqual(['pm-list'])
  })

  it('shouldShowCurrentRouteInBreadcrumb', async () => {
    const { shouldShowCurrentRouteInBreadcrumb } = await import('../utils')
    expect(shouldShowCurrentRouteInBreadcrumb({ path: 'a' })).toBe(true)
    expect(shouldShowCurrentRouteInBreadcrumb({ path: 'a', showInBreadcrumb: false })).toBe(false)
  })

  it('getBreadcrumbLinkPathForRoute：含动态段则无链接', async () => {
    const { getBreadcrumbLinkPathForRoute } = await import('../utils')
    expect(getBreadcrumbLinkPathForRoute({ path: 'studio/pm/:id' })).toBeUndefined()
    expect(getBreadcrumbLinkPathForRoute({ path: 'home' })).toBe('/home')
  })

  it('isRouteVisibleForRoles 当前恒为 true', async () => {
    const { isRouteVisibleForRoles } = await import('../utils')
    expect(isRouteVisibleForRoles({ path: 'x' }, new Set())).toBe(true)
  })

  it('getFirstVisibleSidebarRoute', async () => {
    const { getFirstVisibleSidebarRoute } = await import('../utils')
    const r = getFirstVisibleSidebarRoute(new Set())
    expect(r?.key).toBe('home')
  })

  it('getFirstVisibleRouteByModule', async () => {
    const { getFirstVisibleRouteByModule } = await import('../utils')
    expect(getFirstVisibleRouteByModule('store', new Set())?.key).toBe('store-app')
    expect(getFirstVisibleRouteByModule('studio', new Set())?.key).toBe('home')
  })

  it('getFirstVisibleRouteBySiderType：home 返回 undefined', async () => {
    const { getFirstVisibleRouteBySiderType } = await import('../utils')
    expect(getFirstVisibleRouteBySiderType('home', new Set())).toBeUndefined()
    expect(getFirstVisibleRouteBySiderType('store', new Set())?.key).toBe('store-app')
  })

  it('removeBasePath', async () => {
    const { removeBasePath } = await import('../utils')
    expect(removeBasePath('/dip-hub/app')).toBe('/app')
    expect(removeBasePath('/other')).toBe('/other')
  })

  it('resolveDefaultMicroAppPath：缓存命中', async () => {
    prefState.wenshuAppInfo = { key: 'app-key' }
    const { resolveDefaultMicroAppPath } = await import('../utils')
    await expect(resolveDefaultMicroAppPath()).resolves.toBe('/application/app-key')
    expect(prefState.fetchPinned).not.toHaveBeenCalled()
  })

  it('resolveDefaultMicroAppPath：拉取后命中', async () => {
    prefState.wenshuAppInfo = null
    prefState.fetchPinned.mockImplementation(async () => {
      prefState.wenshuAppInfo = { key: 'after-fetch' }
    })
    const { resolveDefaultMicroAppPath } = await import('../utils')
    await expect(resolveDefaultMicroAppPath()).resolves.toBe('/application/after-fetch')
    expect(prefState.fetchPinned).toHaveBeenCalled()
  })

  it('resolveDefaultMicroAppPath：失败兜底', async () => {
    prefState.wenshuAppInfo = null
    prefState.fetchPinned.mockRejectedValueOnce(new Error('network'))
    const { resolveDefaultMicroAppPath } = await import('../utils')
    await expect(resolveDefaultMicroAppPath()).resolves.toBe('/application/error')
  })

  it('resolveDefaultAuthRedirect：管理员 + studio + guide 就绪', async () => {
    getGuideStatusMock.mockResolvedValue({ ready: true })
    const { resolveDefaultAuthRedirect } = await import('../utils')
    await expect(resolveDefaultAuthRedirect(true, ['studio'])).resolves.toEqual({
      path: '/studio/digital-human',
    })
  })

  it('resolveDefaultAuthRedirect：管理员 + studio + guide 未就绪', async () => {
    const guide = { ready: false }
    getGuideStatusMock.mockResolvedValue(guide)
    const { resolveDefaultAuthRedirect } = await import('../utils')
    await expect(resolveDefaultAuthRedirect(true, ['studio'])).resolves.toEqual({
      path: '/studio/initial-configuration',
      state: { guideStatus: guide, breadcrumbMode: 'init-only' },
    })
  })

  it('resolveDefaultAuthRedirect：仅 store 走微应用路径', async () => {
    prefState.wenshuAppInfo = { key: 'k' }
    const { resolveDefaultAuthRedirect } = await import('../utils')
    await expect(resolveDefaultAuthRedirect(false, ['store'])).resolves.toEqual({
      path: '/application/k',
    })
  })

  it('resolveDefaultAuthRedirect：默认 /home', async () => {
    const { resolveDefaultAuthRedirect } = await import('../utils')
    await expect(resolveDefaultAuthRedirect(false, ['studio'])).resolves.toEqual({ path: '/home' })
  })

  it('resolveDefaultAuthRedirect：getGuideStatus 抛错时走 catch', async () => {
    getGuideStatusMock.mockRejectedValueOnce(new Error('api'))
    const { resolveDefaultAuthRedirect } = await import('../utils')
    await expect(resolveDefaultAuthRedirect(true, ['studio'])).resolves.toEqual({
      path: '/studio/digital-human',
    })
  })
})
