import { ClockCircleOutlined } from '@ant-design/icons'
import { memo, type ReactNode } from 'react'
import intl from 'react-intl-universal'
import IconFont from '@/components/IconFont'
import type { PlanListItemProps } from './types'
import { formatPlanRelativeDayTime, getSessionTitle } from './utils'

function HistoryMetaColumn({ value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 max-w-[140px] flex-col gap-1">
      {/* <div className="flex items-center justify-center gap-1 text-xs leading-[18px] text-[--dip-text-color-45]">
        <span className="inline-flex shrink-0 text-[10px]">{icon}</span>
        <span className="truncate">{label}</span>
      </div> */}
      <div
        className="truncate text-xs leading-[18px] text-[--dip-text-color-45]"
        title={value === intl.get('history.common.dash') ? undefined : value}
      >
        {value}
      </div>
    </div>
  )
}

function HistoryListItemInner({ session, onClick, onDelete, digitalHumanName }: PlanListItemProps) {
  const title = getSessionTitle(session)
  const updatedAtText = formatPlanRelativeDayTime(session.updatedAt)
  return (
    <button
      type="button"
      onClick={() => onClick?.(session)}
      className="max-w-[880px] mx-auto flex w-full items-center gap-4 rounded-lg border border-[#EAEEF3] bg-[--dip-white] px-4 py-3 text-left transition-[border-color,background-color] hover:border-[#BEDBFF] hover:bg-[#EFF6FF] group"
    >
      <IconFont type="icon-dialog" className="text-xl text-[--dip-text-color-45]" />

      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[--dip-text-color]" title={title}>
            {title}
          </span>
        </div>
        <span className="text-[--dip-text-color-45] text-xs">
          {intl.get('history.list.fromDigitalHuman', {
            name: digitalHumanName ?? intl.get('history.common.dash'),
          })}
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-start justify-end gap-6 gap-y-2 max-w-[min(100%,420px)]">
        <HistoryMetaColumn
          icon={<ClockCircleOutlined />}
          label={intl.get('history.list.updateTime')}
          value={updatedAtText}
        />
      </div>

      {onDelete ? (
        <button
          type="button"
          className="w-6 h-6 flex-shrink-0 hidden items-center justify-center rounded text-[--dip-text-color-45] group-hover:inline-flex hover:bg-[rgba(0,0,0,0.06)]"
          onClick={(event) => {
            event.stopPropagation()
            onDelete?.(session)
          }}
          aria-label={intl.get('history.list.deleteSessionAria')}
        >
          <IconFont type="icon-trash" />
        </button>
      ) : null}
    </button>
  )
}

const HistoryListItem = memo(HistoryListItemInner)
export default HistoryListItem
