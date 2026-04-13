import { Button, Flex, Table, Tooltip } from 'antd'
import { memo, useMemo, useState } from 'react'
import intl from 'react-intl-universal'
import type { ChannelConfig as DhChannelConfig } from '@/apis/dip-studio/digital-human'
import DingDingIcon from '@/assets/icons/dingding.svg'
import FeiShuIcon from '@/assets/icons/feishu.svg'
import Empty from '@/components/Empty'
import IconFont from '@/components/IconFont'
import ScrollBarContainer from '@/components/ScrollBarContainer'
import { useLanguageStore } from '@/stores/languageStore'
import { useDigitalHumanStore } from '../digitalHumanStore'
import AddChannelModal from './AddChannelModal'
import styles from './index.module.less'

interface ChannelConfigProps {
  /** 只读（非管理员详情等） */
  readonly?: boolean
}

const ChannelConfig = ({ readonly }: ChannelConfigProps) => {
  const { language } = useLanguageStore()
  const { channel, updateChannel, deleteChannel } = useDigitalHumanStore()
  const [addChannelModalOpen, setAddChannelModalOpen] = useState(false)

  /** 添加通道 */
  const handleAddChannel = () => {
    setAddChannelModalOpen(true)
  }

  /** 添加通道结果，写入 store（单通道） */
  const handleAddChannelResult = (result: DhChannelConfig) => {
    updateChannel(result)
  }

  const channelDataSource = useMemo(() => {
    if (!channel) return []
    return [channel]
  }, [channel])

  // 通道表格列定义（名称列展示类型图标 + 本地化类型名；描述列为固定业务说明句）
  const channelColumns = useMemo(() => {
    const typeLabel = (type: DhChannelConfig['type']) =>
      type === 'dingtalk'
        ? intl.get('digitalHuman.channel.typeDingtalk')
        : intl.get('digitalHuman.channel.typeFeishu')

    const channelDesc = (type: DhChannelConfig['type']) =>
      type === 'dingtalk'
        ? intl.get('digitalHuman.channel.descDingtalk')
        : intl.get('digitalHuman.channel.descFeishu')

    const columns = [
      {
        title: intl.get('digitalHuman.common.columnName'),
        dataIndex: 'type',
        key: 'type',
        width: '40%',
        render: (type: DhChannelConfig['type']) => {
          const label = typeLabel(type ?? 'feishu')
          return (
            <div className="flex items-center gap-2 truncate">
              <img
                src={type === 'dingtalk' ? DingDingIcon : FeiShuIcon}
                alt={label}
                className="h-4 w-4 object-contain"
              />
              <span title={label} className="truncate">
                {label}
              </span>
            </div>
          )
        },
      },
      {
        title: intl.get('digitalHuman.channel.columnChannelDesc'),
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (_: string, record: DhChannelConfig) => channelDesc(record.type),
      },
      {
        title: intl.get('digitalHuman.common.columnAction'),
        key: 'action',
        width: 80,
        render: () => (
          <Flex align="center">
            <Tooltip title={intl.get('digitalHuman.common.remove')}>
              <Button
                type="text"
                onClick={() => deleteChannel()}
                icon={<IconFont type="icon-remove" />}
              />
            </Tooltip>
          </Flex>
        ),
      },
    ]
    return readonly ? columns.slice(0, 2) : columns
  }, [deleteChannel, readonly, language])

  return (
    <ScrollBarContainer className="h-full flex flex-col p-6 relative flex-1">
      <div className="flex justify-between mb-4">
        <div className="flex flex-col gap-y-1">
          <div className="font-medium text-[--dip-text-color]">
            {intl.get('digitalHuman.setting.menuChannel')}
          </div>
          <div className="text-[--dip-text-color-45]">{intl.get('digitalHuman.channel.sectionDesc')}</div>
        </div>
        {channel && !readonly && (
          <div className="flex items-end gap-x-3">
            <Button
              color="primary"
              icon={<IconFont type="icon-add" />}
              variant="outlined"
              onClick={handleAddChannel}
            >
              {intl.get('digitalHuman.channel.addButton')}
            </Button>
          </div>
        )}
      </div>
      <Table<DhChannelConfig>
        dataSource={channelDataSource}
        columns={channelColumns}
        pagination={false}
        className={styles['channel-table']}
        rowKey={(record) => `${record.type ?? 'feishu'}-${record.appId}`}
        bordered={false}
        size="small"
        scroll={{ y: 'max(246px, calc(100vh - 299px))' }}
        locale={{
          emptyText: (
            <Empty type="empty" title={intl.get('digitalHuman.channel.emptyNoChannel')}>
              {readonly ? undefined : (
                <Button
                  icon={<IconFont type="icon-add" />}
                  color="primary"
                  variant="outlined"
                  onClick={handleAddChannel}
                >
                  {intl.get('digitalHuman.channel.addButton')}
                </Button>
              )}
            </Empty>
          ),
        }}
      />

      {/* 添加通道弹窗 */}
      <AddChannelModal
        open={addChannelModalOpen}
        onOk={handleAddChannelResult}
        onCancel={() => setAddChannelModalOpen(false)}
      />
    </ScrollBarContainer>
  )
}

export default memo(ChannelConfig)
