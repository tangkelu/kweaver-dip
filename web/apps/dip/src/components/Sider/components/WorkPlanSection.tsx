import { DownOutlined, ExclamationCircleFilled, UpOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Dropdown, Modal, message } from 'antd'
import clsx from 'classnames'
import { useState } from 'react'
import intl from 'react-intl-universal'
import type { CronJob } from '@/apis/dip-studio/plan'
import IconFont from '@/components/IconFont'
import { getPlanJobDisplayStatus } from '@/components/WorkPlanList/utils'
import { formatTotalDisplay } from '../utils'

interface WorkPlanSectionProps {
  plans: CronJob[]
  hasMore: boolean
  total: number
  selectedPlanId?: string
  onMore: () => void
  onOpenPlanDetail: (planId: string, agentId: string, sessionId: string) => void
  onPausePlan: (id: string) => Promise<boolean>
  onResumePlan: (id: string) => Promise<boolean>
  onDeletePlan: (id: string) => Promise<boolean>
}

export const WorkPlanSection = ({
  plans,
  hasMore,
  total,
  selectedPlanId,
  onMore,
  onOpenPlanDetail,
  onPausePlan,
  onResumePlan,
  onDeletePlan,
}: WorkPlanSectionProps) => {
  const [modal, contextHolder] = Modal.useModal()
  const [messageApi, messageContextHolder] = message.useMessage()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const getPlanStatusMeta = (plan: CronJob): { prefix: string; colorClass: string } => {
    const status = getPlanJobDisplayStatus(plan)
    if (status === 'running') {
      return { prefix: intl.get('sider.workPlan.statusRunning'), colorClass: 'text-[#497ED2]' }
    }
    if (status === 'ok') {
      return { prefix: intl.get('sider.workPlan.statusOk'), colorClass: 'text-[#519B72]' }
    }
    if (status === 'error') {
      return { prefix: intl.get('sider.workPlan.statusError'), colorClass: 'text-[#ff4d4f]' }
    }
    if (status === 'skipped') {
      return { prefix: intl.get('sider.workPlan.statusSkipped'), colorClass: 'text-[rgba(0,0,0,0.65)]' }
    }
    if (status === 'disabled') {
      return { prefix: intl.get('sider.workPlan.statusDisabled'), colorClass: 'text-[#D48806]' }
    }
    return { prefix: intl.get('sider.workPlan.statusPending'), colorClass: 'text-[rgba(0,0,0,0.65)]' }
  }

  const handleDeletePlan = (id: string) => {
    modal.confirm({
      title: intl.get('sider.confirmDelete'),
      icon: <ExclamationCircleFilled />,
      content: intl.get('sider.workPlan.deleteConfirmContent'),
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
        try {
          await onDeletePlan(id)
          messageApi.success(intl.get('sider.workPlan.deleteSuccess'))
        } catch (err: any) {
          if (err?.description) {
            messageApi.error(err.description)
          }
        }
      },
    })
  }

  return (
    <>
      {contextHolder}
      {messageContextHolder}
      <div className="px-2 py-1">
        {/* <div className="h-px bg-[--dip-line-color-10] mb-1.5" /> */}
        <div className="flex items-center justify-between px-2 py-1">
          <button
            type="button"
            className="text-xs leading-[20px] text-[--dip-text-color-45] bg-transparent border-0 p-0 cursor-pointer flex flex-1 items-center"
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            {intl.get('sider.workPlan.sectionTitle', { count: formatTotalDisplay(total) })}
            {isCollapsed ? (
              <UpOutlined className="text-xs" />
            ) : (
              <DownOutlined className="text-xs" />
            )}
          </button>
          {hasMore ? (
            <button
              type="button"
              className="text-xs text-[--dip-primary-color] bg-transparent border-0 cursor-pointer hover:underline"
              onClick={onMore}
            >
              {intl.get('sider.workPlan.more')}
            </button>
          ) : null}
        </div>
        {isCollapsed ? null : (
          <div className="flex flex-col gap-0.5">
            {plans.length === 0 ? (
              <div className="text-xs text-[--dip-text-color-45] px-2 py-2">
                {intl.get('sider.workPlan.empty')}
              </div>
            ) : (
              plans.map((plan) => {
                const isActive = selectedPlanId === plan.id
                const { prefix: statusPrefix, colorClass } = getPlanStatusMeta(plan)
                const operationItems: MenuProps['items'] = [
                  {
                    key: plan.enabled ? 'pause' : 'resume',
                    label: plan.enabled
                      ? intl.get('sider.workPlan.actionPause')
                      : intl.get('sider.workPlan.actionEnable'),
                    onClick: (e) => {
                      e.domEvent.stopPropagation()
                      if (plan.enabled) {
                        void onPausePlan(plan.id)
                      } else {
                        void onResumePlan(plan.id)
                      }
                    },
                  },
                  {
                    key: 'delete',
                    label: intl.get('sider.workPlan.actionDelete'),
                    danger: true,
                    onClick: (e) => {
                      e.domEvent.stopPropagation()
                      handleDeletePlan(plan.id)
                    },
                  },
                ]
                return (
                  <button
                    key={`work-plan-${plan.id}`}
                    type="button"
                    onClick={() => onOpenPlanDetail(plan.id, plan.agentId, plan.sessionKey)}
                    className={clsx(
                      'group w-full text-left min-h-[44px] px-2 py-1.5 rounded-md relative border-0 flex items-center',
                      isActive
                        ? 'bg-[#f1f7fe] text-[--dip-primary-color]'
                        : 'bg-transparent hover:bg-[--dip-hover-bg-color]',
                    )}
                  >
                    {/* {isActive ? (
                  <span className="absolute left-[-4px] top-[10px] bottom-[10px] w-[2px] rounded-[2px] bg-[linear-gradient(180deg,#3fa9f5_0%,#126ee3_100%)]" />
                ) : null} */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={clsx(
                          'truncate text-sm group-hover:mr-2',
                          isActive ? 'text-[--dip-primary-color]' : 'text-[--dip-text-color]',
                        )}
                        title={plan.name}
                      >
                        {plan.name}
                      </div>
                      <div
                        className={clsx(`mt-0.5 truncate text-xs leading-4 ${colorClass}`)}
                        title={statusPrefix}
                      >
                        {statusPrefix}
                      </div>
                    </div>
                    <Dropdown menu={{ items: operationItems }} trigger={['click']}>
                      <button
                        type="button"
                        className="w-6 h-6 flex-shrink-0 hidden items-center justify-center rounded text-[--dip-text-color-45] group-hover:inline-flex hover:bg-[rgba(0,0,0,0.06)]"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <IconFont type="icon-more" />
                      </button>
                    </Dropdown>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </>
  )
}
