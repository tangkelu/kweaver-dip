import {
  CalendarOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Dropdown, Modal } from 'antd'
import { memo, type ReactNode } from 'react'
import intl from 'react-intl-universal'
import IconFont from '@/components/IconFont'
import type { PlanListItemProps } from './types'
import { formatPlanRelativeDayTime, planExecutionConditionText, planJobDescription } from './utils'

function PlanMetaColumn({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 max-w-[140px] flex-col gap-1">
      <div className="flex items-center justify-center gap-1 text-xs leading-[18px] text-[--dip-text-color-45]">
        <span className="inline-flex shrink-0 text-[10px]">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div
        className="truncate text-xs leading-[18px] text-[--dip-text-color-45]"
        title={value === intl.get('workPlan.common.dash') ? undefined : value}
      >
        {value}
      </div>
    </div>
  )
}

function PlanListItemInner({
  job,
  onClick,
  onPause,
  onResume,
  onDelete,
  onEdit,
}: PlanListItemProps) {
  const description = planJobDescription(job)
  const isPeriodic = job.schedule?.kind === 'every'
  const conditionText = planExecutionConditionText(job)
  const lastRun = formatPlanRelativeDayTime(job.state?.lastRunAtMs)
  const nextRun = formatPlanRelativeDayTime(job.state?.nextRunAtMs)
  const [modal, contextHolder] = Modal.useModal()

  const operationItems: MenuProps['items'] = [
    {
      key: job.enabled ? 'pause' : 'resume',
      label: job.enabled ? intl.get('workPlan.common.pause') : intl.get('workPlan.common.start'),
      onClick: (e) => {
        e.domEvent.stopPropagation()
        if (job.enabled) {
          void onPause?.(job.id)
          return
        }
        void onResume?.(job.id)
      },
    },
    {
      key: 'edit',
      label: intl.get('workPlan.common.edit'),
      onClick: (e) => {
        e.domEvent.stopPropagation()
        onEdit?.(job)
      },
    },
    {
      key: 'delete',
      label: intl.get('workPlan.common.delete'),
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation()
        modal.confirm({
          title: intl.get('workPlan.common.deleteConfirmTitle'),
          icon: <ExclamationCircleFilled />,
          content: intl.get('workPlan.common.deleteConfirmContent'),
          okText: intl.get('global.ok'),
          okType: 'primary',
          okButtonProps: { danger: true },
          cancelText: intl.get('global.cancel'),
          footer: (_, { OkBtn, CancelBtn }) => (
            <>
              <OkBtn />
              <CancelBtn />
            </>
          ),
          onOk: async () => {
            await onDelete?.(job.id)
          },
        })
      },
    },
  ]

  return (
    <>
      {contextHolder}
      <button
        type="button"
        onClick={() => onClick?.(job)}
        className="group max-w-[880px] mx-auto flex w-full items-center gap-4 rounded-lg border border-[#EAEEF3] bg-[--dip-white] px-4 py-3 text-left transition-[border-color,background-color] hover:border-[#BEDBFF] hover:bg-[#EFF6FF]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#60AEFF]">
          <IconFont type="icon-plan" className="text-[18px] text-white" />
        </div>

        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="truncate text-sm font-medium leading-[22px] text-[--dip-text-color]"
              title={job.name}
            >
              {job.name}
            </span>
            {isPeriodic ? (
              <span className="inline-flex shrink-0 items-center rounded bg-[#F9F0FF] px-1.5 py-0.5 text-xs font-normal leading-[18px] text-[#722ED1]">
                {intl.get('workPlan.list.periodicTask')}
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded bg-[#E6FFFB] px-1.5 py-0.5 text-xs font-normal leading-[18px] text-[#08979C]">
                {intl.get('workPlan.list.timedPlan')}
              </span>
            )}
          </div>
          {description ? (
            <p
              className="truncate text-xs leading-[18px] text-[--dip-text-color-45]"
              title={description}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-start justify-end gap-6 gap-y-2 max-w-[min(100%,420px)]">
          <PlanMetaColumn
            icon={<CalendarOutlined />}
            label={intl.get('workPlan.list.executionCondition')}
            value={conditionText}
          />
          <PlanMetaColumn
            icon={<ClockCircleOutlined />}
            label={intl.get('workPlan.list.lastExecution')}
            value={lastRun}
          />
          <PlanMetaColumn
            icon={<ClockCircleOutlined />}
            label={intl.get('workPlan.list.nextExecution')}
            value={nextRun}
          />
        </div>

        <Dropdown menu={{ items: operationItems }} trigger={['click']} placement="bottomRight">
          <button
            type="button"
            className="hidden ml-2 group-hover:inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-[--dip-text-color-45] hover:bg-[rgba(0,0,0,0.06)]"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <EllipsisOutlined />
          </button>
        </Dropdown>
      </button>
    </>
  )
}

const PlanListItem = memo(PlanListItemInner)
export default PlanListItem
