import { Card, Dropdown, type MenuProps } from 'antd'
import clsx from 'clsx'
import { LineChart as ELineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useState } from 'react'
import type { DigitalHuman } from '@/apis'
import AppIcon from '../AppIcon'
import IconFont from '../IconFont'
import { cardHeight } from './utils'

echarts.use([ELineChart, GridComponent, TooltipComponent, CanvasRenderer])

interface EmployeeCardProps {
  digitalHuman: DigitalHuman
  width: number
  menuItems?: MenuProps['items']
  /** 卡片菜单点击回调 */
  onCardClick?: (digitalHuman: DigitalHuman) => void
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  digitalHuman,
  width,
  menuItems,
  onCardClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  // const updateTime = digitalHuman.updated_at
  //   ? formatTimeSlash(new Date(digitalHuman.updated_at).getTime())
  //   : ''

  return (
    <Card
      className="group rounded-[10px] transition-all w-full cursor-pointer"
      styles={{
        root: {
          height: cardHeight,
          border: '1px solid var(--dip-border-color)',
          // boxShadow: '0px 2px 8px 0px hsla(0,0%,0%,0.1)',
        },
        body: {
          height: '100%',
          padding: '16px 16px 12px 16px',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      onClick={() => {
        onCardClick?.(digitalHuman)
      }}
    >
      <div className="flex gap-4 flex-shrink-0">
        {/* 图标 */}
        <div className="w-12 h-12 flex-shrink-0 flex overflow-hidden mt-0.5">
          <AppIcon
            name={digitalHuman.name}
            size={48}
            className="w-12 h-12 rounded-xl overflow-hidden"
            shape="square"
          />
        </div>
        {/* 名称 + 描述 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div
                className="text-base font-medium mr-px truncate text-black"
                title={digitalHuman.name}
              >
                {digitalHuman.name}
              </div>
              {/* 更多操作 */}
              {menuItems && menuItems.length > 0 && (
                <Dropdown
                  menu={{ items: menuItems }}
                  trigger={['click']}
                  placement="bottomRight"
                  onOpenChange={(open) => {
                    setMenuOpen(open)
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    className={clsx(
                      'w-6 h-6 flex items-center justify-center rounded text-[var(--dip-text-color-45)] hover:text-[var(--dip-text-color-85)] hover:bg-[--dip-hover-bg-color] transition-opacity',
                      menuOpen
                        ? 'opacity-100 visible'
                        : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                    )}
                  >
                    <IconFont type="icon-more" />
                  </button>
                </Dropdown>
              )}
            </div>
            <p
              className="text-[13px] line-clamp-2 leading-5 text-black"
              title={digitalHuman.creature}
            >
              {digitalHuman.creature || '[暂无简介]'}
            </p>
          </div>
        </div>
      </div>

      {/* 更新信息 */}
      {/* <div className="flex flex-col justify-end flex-1 h-0 mt-2">
        <div className="mb-2 h-px bg-[var(--dip-line-color)]" />
        <div className="flex items-center justify-between text-xs text-[var(--dip-text-color-45)]">
          <div className="flex items-center">
            <Avatar size="small" className="flex-shrink-0 mr-2">
              {digitalHuman.updated_by?.charAt(0)}
            </Avatar>
            <span
              className="truncate mr-4"
              style={{ maxWidth: `${Math.floor(width * 0.22)}px` }}
              title={digitalHuman.updated_by}
            >
              {digitalHuman.updated_by}
            </span>
          </div>
          <span>更新：{updateTime}</span>
        </div>
      </div> */}
      {/* <div className="mb-3 mt-2 w-full h-px bg-[var(--dip-line-color)]" /> */}
    </Card>
  )
}

export default EmployeeCard
