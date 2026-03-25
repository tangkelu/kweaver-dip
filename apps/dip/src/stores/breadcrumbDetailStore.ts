import { create } from 'zustand'

interface BreadcrumbDetailState {
  /** 与路由配置的 `key` 一致，避免跨路由串名 */
  detail: { routeKey: string; title: string } | null
  setDetailBreadcrumb: (payload: { routeKey: string; title: string } | null) => void
}

export const useBreadcrumbDetailStore = create<BreadcrumbDetailState>((set) => ({
  detail: null,
  setDetailBreadcrumb: (payload) => set({ detail: payload }),
}))
