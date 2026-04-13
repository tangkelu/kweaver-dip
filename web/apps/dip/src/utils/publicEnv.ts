/**
 * 为 true 时仅隐藏「通道」相关 UI（如数字员工设置里的通道接入、列表卡片上的通道统计等）。
 * 数字员工入口、路由与默认落地页不受影响。
 * 在 `.env.local` 中设置 `PUBLIC_CHANNEL_VISIBLE=true`。
 */
export const isPublicChannelVisible = import.meta.env.PUBLIC_CHANNEL_VISIBLE === 'true'
