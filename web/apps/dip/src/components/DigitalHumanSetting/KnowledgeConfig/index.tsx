import { Button, Flex, Table, Tooltip } from 'antd'
import { memo, useMemo, useState } from 'react'
import intl from 'react-intl-universal'
import type { BknKnowledgeNetworkInfo } from '@/apis'
import type { BknEntry } from '@/apis/dip-studio/digital-human'
import AppIcon from '@/components/AppIcon'
import Empty from '@/components/Empty'
import IconFont from '@/components/IconFont'
import ScrollBarContainer from '@/components/ScrollBarContainer'
import { useLanguageStore } from '@/stores/languageStore'
import { useDigitalHumanStore } from '../digitalHumanStore'
import styles from './index.module.less'
import SelectKnowledgeModal from './SelectKnowledgeModal'

interface KnowledgeConfigProps {
  /** 只读（非管理员详情等） */
  readonly?: boolean
}

const KnowledgeConfig = ({ readonly }: KnowledgeConfigProps) => {
  const { language } = useLanguageStore()
  const { bkn, updateBkn, deleteBkn } = useDigitalHumanStore()
  const [selectKnowledgeModalOpen, setSelectKnowledgeModalOpen] = useState(false)

  /** 选择知识网络 */
  const handleSelectKnowledge = () => {
    setSelectKnowledgeModalOpen(true)
  }

  /** 选择知识网络结果，写入 store */
  const handleSelectKnowledgeResult = (result: BknKnowledgeNetworkInfo[]) => {
    const next: BknEntry[] = result.map((k) => ({
      name: k.name,
      url: k.id,
    }))
    updateBkn(next)
  }

  // 知识表格列定义（`url` 列展示名沿用「功能描述」表头，与历史接口字段一致）
  const knowledgeColumns = useMemo(() => {
    const columns = [
      {
        title: intl.get('digitalHuman.common.columnName'),
        dataIndex: 'name',
        key: 'name',
        width: '40%',
        render: (text: string) => (
          <div className="flex items-center gap-2 truncate">
            <AppIcon
              name={text}
              size={20}
              className="w-6 h-6 rounded flex-shrink-0"
              shape="square"
            />
            <span title={text} className="truncate">
              {text || '--'}
            </span>
          </div>
        ),
      },
      {
        title: intl.get('digitalHuman.common.columnFunctionDesc'),
        dataIndex: 'url',
        key: 'url',
        ellipsis: true,
        render: (text: string) => text || '--',
      },
      {
        title: intl.get('digitalHuman.common.columnAction'),
        key: 'action',
        width: 80,
        render: (_: unknown, record: BknEntry) => (
          <Flex align="center">
            <Tooltip title={intl.get('digitalHuman.common.remove')}>
              <Button
                type="text"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteBkn(record.url)
                }}
                icon={<IconFont type="icon-remove" />}
              />
            </Tooltip>
          </Flex>
        ),
      },
    ]
    return readonly ? columns.slice(0, 2) : columns
  }, [deleteBkn, readonly, language])

  return (
    <ScrollBarContainer className="h-full flex flex-col p-6">
      <div className="flex justify-between mb-4">
        <div className="flex flex-col gap-y-1">
          <div className="font-medium text-[--dip-text-color]">
            {intl.get('digitalHuman.setting.menuKnowledge')}
          </div>
          <div className="text-[--dip-text-color-45]">{intl.get('digitalHuman.knowledge.sectionDesc')}</div>
        </div>
        {bkn.length > 0 && !readonly && (
          <div className="flex items-end gap-x-3">
            <Button
              color="primary"
              icon={<IconFont type="icon-add" />}
              onClick={handleSelectKnowledge}
              variant="outlined"
            >
              {intl.get('digitalHuman.knowledge.addButton')}
            </Button>
          </div>
        )}
      </div>
      <Table<BknEntry>
        dataSource={bkn}
        columns={knowledgeColumns}
        pagination={false}
        className={styles['knowledge-table']}
        rowKey={(record) => record.url}
        bordered={false}
        size="small"
        scroll={{ y: 'max(246px, calc(100vh - 299px))' }}
        locale={{
          emptyText: (
            <Empty type="empty" title={intl.get('digitalHuman.knowledge.emptyNoKnowledge')}>
              {readonly ? undefined : (
                <Button
                  icon={<IconFont type="icon-add" />}
                  color="primary"
                  variant="outlined"
                  onClick={handleSelectKnowledge}
                >
                  {intl.get('digitalHuman.knowledge.addButton')}
                </Button>
              )}
            </Empty>
          ),
        }}
      />

      {/* 选择知识网络弹窗 */}
      <SelectKnowledgeModal
        open={selectKnowledgeModalOpen}
        onOk={handleSelectKnowledgeResult}
        onCancel={() => setSelectKnowledgeModalOpen(false)}
        defaultSelectedIds={bkn.map((item) => item.url) || []}
      />
    </ScrollBarContainer>
  )
}

export default memo(KnowledgeConfig)
