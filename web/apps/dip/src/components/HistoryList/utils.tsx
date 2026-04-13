import dayjs from 'dayjs'
import intl from 'react-intl-universal'
import type { SessionSummary } from '@/apis/dip-studio/sessions'

export function getSessionTitle(session: SessionSummary): string {
  const displayName = session.displayName?.trim() || ''
  const lastUnderscoreIndex = displayName.lastIndexOf('_')
  if (lastUnderscoreIndex > 0) {
    return displayName.slice(0, lastUnderscoreIndex)
  }
  return displayName || '--'
}

/** 今天/明天/昨天 HH:mm，否则 MM/DD HH:mm */
export function formatPlanRelativeDayTime(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return intl.get('history.common.dash')
  const d = dayjs(ms)
  const today = dayjs().startOf('day')
  const target = d.startOf('day')
  const diff = target.diff(today, 'day')
  const hm = d.format('HH:mm')
  if (diff === 0) return intl.get('history.list.today', { time: hm })
  if (diff === 1) return intl.get('history.list.tomorrow', { time: hm })
  if (diff === -1) return intl.get('history.list.yesterday', { time: hm })
  return d.format('MM/DD HH:mm')
}
