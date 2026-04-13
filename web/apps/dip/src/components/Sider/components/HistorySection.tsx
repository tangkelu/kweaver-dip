import { DownOutlined, UpOutlined } from '@ant-design/icons'
import clsx from 'classnames'
import { useState } from 'react'
import intl from 'react-intl-universal'
import type { SessionSummary } from '@/apis/dip-studio/sessions'
import { getSessionTitle } from '@/components/HistoryList/utils'
import IconFont from '@/components/IconFont'
import { formatTotalDisplay } from '../utils'

interface HistorySectionProps {
  sessions: SessionSummary[]
  hasMore: boolean
  total: number
  selectedSessionKey?: string
  onMore: () => void
  onOpenHistoryDetail: (sessionKey: string) => void
  onDeleteHistory?: (session: SessionSummary) => void
}

export const HistorySection = ({
  sessions,
  hasMore,
  total,
  selectedSessionKey,
  onMore,
  onOpenHistoryDetail,
  onDeleteHistory,
}: HistorySectionProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between px-2 py-1">
        <button
          type="button"
          className="text-xs leading-[20px] text-[--dip-text-color-45] bg-transparent border-0 p-0 cursor-pointer flex flex-1 items-center"
          onClick={() => setIsCollapsed((prev) => !prev)}
        >
          {intl.get('sider.history.sectionTitle', { count: formatTotalDisplay(total) })}
          {isCollapsed ? <UpOutlined className="text-xs" /> : <DownOutlined className="text-xs" />}
        </button>
        {hasMore ? (
          <button
            type="button"
            className="text-xs text-[--dip-primary-color] bg-transparent border-0 cursor-pointer hover:underline"
            onClick={(event) => {
              event.stopPropagation()
              onMore()
            }}
          >
            {intl.get('sider.history.more')}
          </button>
        ) : null}
      </div>
      {isCollapsed ? null : (
        <div className="flex flex-col gap-0.5">
          {sessions.length === 0 ? (
            <div className="text-xs text-[--dip-text-color-45] px-2 py-2">
              {intl.get('sider.history.empty')}
            </div>
          ) : (
            sessions.map((session) => {
              const title = getSessionTitle(session)
              const isActive = selectedSessionKey === session.key
              return (
                <button
                  key={`history-session-${session.key}`}
                  type="button"
                  onClick={() => onOpenHistoryDetail(session.key)}
                  className={clsx(
                    'group w-full text-left h-9 px-2 py-1.5 rounded-md relative border-0 flex items-center',
                    isActive
                      ? 'bg-[#f1f7fe] text-[--dip-primary-color]'
                      : 'bg-transparent hover:bg-[--dip-hover-bg-color]',
                  )}
                >
                  {/* {isActive ? (
                    <span className="absolute left-[-4px] top-[10px] bottom-[10px] w-[2px] rounded-[2px] bg-[linear-gradient(180deg,#3fa9f5_0%,#126ee3_100%)]" />
                  ) : null} */}
                  <div
                    className={clsx(
                      'truncate text-sm group-hover:mr-2 flex-1 min-w-0',
                      isActive ? 'text-[--dip-primary-color]' : 'text-[--dip-text-color]',
                    )}
                    title={title}
                  >
                    {title}
                  </div>
                  <button
                    type="button"
                    className="w-6 h-6 flex-shrink-0 hidden items-center justify-center rounded text-[--dip-text-color-45] group-hover:inline-flex hover:bg-[rgba(0,0,0,0.06)]"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDeleteHistory?.(session)
                    }}
                    aria-label={intl.get('sider.history.deleteAria')}
                  >
                    <IconFont type="icon-trash" />
                  </button>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
