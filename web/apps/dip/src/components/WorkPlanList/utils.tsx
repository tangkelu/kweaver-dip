import dayjs from 'dayjs'
import intl from 'react-intl-universal'
import type { CronJob } from '@/apis/dip-studio/plan'
import { formatTimeMinute } from '@/utils/handle-function/FormatTime'
import type {
  PlanJobDisplayStatus,
  PlanJobDisplayStyle,
  PlanJobLeftIconStyle,
  PlanStatusPill,
} from './types'

/** 常见 Cron：分 时 日 月 周 均为 * 时解析为「每日 HH:mm」 */
export function formatDailyCronLabel(expr: string): string | null {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 5) return null
  const [min, hour, dom, month, dow] = parts
  if (dom === '*' && month === '*' && dow === '*') {
    const h = hour.padStart(2, '0')
    const m = min.padStart(2, '0')
    return intl.get('workPlan.list.dailyAt', { time: `${h}:${m}` })
  }
  return null
}

/** 右侧时间胶囊：优先解析每日 Cron，否则展示下次执行时间 */
export function schedulePillText(job: CronJob): string {
  const expr = job.schedule?.expr?.trim()
  if (expr) {
    const daily = formatDailyCronLabel(expr)
    if (daily) return daily
  }
  if (job.state?.nextRunAtMs != null) {
    return formatTimeMinute(job.state.nextRunAtMs)
  }
  return ''
}

/** 列表副标题：来自 payload.description / summary */
export function planJobDescription(job: CronJob): string {
  const p = job.payload
  if (p && typeof p === 'object') {
    const o = p as Record<string, unknown>
    const d = o.description
    if (typeof d === 'string' && d.trim()) return d.trim()
    const s = o.summary
    if (typeof s === 'string' && s.trim()) return s.trim()
  }
  return ''
}

/** 执行条件展示：wakeMode、payload.conditionLabel，否则尝试每日 Cron 文案 */
export function planExecutionConditionText(job: CronJob): string {
  const w = job.wakeMode?.trim()
  if (w) return w
  const p = job.payload
  if (p && typeof p === 'object') {
    const c = (p as Record<string, unknown>).conditionLabel
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  const expr = job.schedule?.expr?.trim()
  if (expr) {
    const daily = formatDailyCronLabel(expr)
    if (daily) return daily
  }
  return intl.get('workPlan.common.dash')
}

/** 今天/明天/昨天 HH:mm，否则 MM/DD HH:mm */
export function formatPlanRelativeDayTime(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return intl.get('workPlan.common.dash')
  const d = dayjs(ms)
  const today = dayjs().startOf('day')
  const target = d.startOf('day')
  const diff = target.diff(today, 'day')
  const hm = d.format('HH:mm')
  if (diff === 0) return intl.get('workPlan.list.today', { time: hm })
  if (diff === 1) return intl.get('workPlan.list.tomorrow', { time: hm })
  if (diff === -1) return intl.get('workPlan.list.yesterday', { time: hm })
  return d.format('MM/DD HH:mm')
}

export function planFileCount(job: CronJob): number | null {
  const p = job.payload
  if (p && typeof p === 'object') {
    const n = (p as Record<string, unknown>).fileCount
    if (typeof n === 'number' && Number.isFinite(n)) return n
  }
  return null
}

type PlanJobDisplayEntry = { pill: PlanStatusPill; leftIcon: PlanJobLeftIconStyle }

const PLAN_JOB_DISPLAY: Record<PlanJobDisplayStatus, PlanJobDisplayEntry> = {
  disabled: {
    pill: {
      text: intl.get('workPlan.list.statusDisabled'),
      className: 'bg-[#FFFBE6] text-[#D48806]',
    },
    leftIcon: {
      boxClassName: 'bg-[#FFFBE6]',
      iconClassName: 'text-lg text-[#D48806]',
    },
  },
  running: {
    pill: {
      text: intl.get('workPlan.list.statusRunning'),
      className: 'bg-[#ECF2FA] text-[#497ED2]',
    },
    leftIcon: {
      boxClassName: 'bg-[#ECF2FA]',
      iconClassName: 'text-[#497ED2]',
    },
  },
  ok: {
    pill: {
      text: intl.get('workPlan.list.statusDone'),
      className: 'bg-[#E9F6EF] text-[#519B72]',
    },
    leftIcon: {
      boxClassName: 'bg-[#E9F6EF]',
      iconClassName: 'text-xl text-[#519B72]',
    },
  },
  error: {
    pill: {
      text: intl.get('workPlan.list.statusFailed'),
      className: 'bg-[rgba(255,77,79,0.12)] text-[#ff4d4f]',
    },
    leftIcon: {
      boxClassName: 'bg-[rgba(255,77,79,0.12)]',
      iconClassName: 'text-xl text-[#ff4d4f]',
    },
  },
  pending: {
    pill: {
      text: intl.get('workPlan.list.statusPending'),
      className: 'bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.65)]',
    },
    leftIcon: {
      boxClassName: 'bg-[rgba(0,0,0,0.06)]',
      iconClassName: 'text-lg text-[rgba(0,0,0,0.45)]',
    },
  },
  skipped: {
    pill: {
      text: intl.get('workPlan.list.statusSkipped'),
      className: 'bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.65)]',
    },
    leftIcon: {
      boxClassName: 'bg-[rgba(0,0,0,0.06)]',
      iconClassName: 'text-lg text-[rgba(0,0,0,0.45)]',
    },
  },
}

/** 从 CronJob 解析展示状态（与 lastRunStatus：ok / error / skipped 等对齐） */
export function getPlanJobDisplayStatus(job: CronJob): PlanJobDisplayStatus {
  if (!job.enabled) return 'disabled'
  if (job.state?.runningAtMs) return 'running'
  const last = job.state?.lastRunStatus?.toLowerCase()
  if (last === 'ok') return 'ok'
  if (last === 'error') return 'error'
  if (last === 'skipped') return 'skipped'
  return 'pending'
}

/** 左侧图标 + 右侧状态胶囊的完整样式（颜色与语义统一） */
export function getPlanJobDisplayStyle(job: CronJob): PlanJobDisplayStyle {
  const status = getPlanJobDisplayStatus(job)
  const row = PLAN_JOB_DISPLAY[status]
  const pill = { ...row.pill }
  return { status, pill, leftIcon: row.leftIcon }
}

export function rightStatusPill(job: CronJob): PlanStatusPill {
  return getPlanJobDisplayStyle(job).pill
}
