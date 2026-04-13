import type { ModalProps } from 'antd'
import { Button, Form, Input, Modal, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import intl from 'react-intl-universal'
import type { ChannelConfig, ChannelType } from '@/apis/dip-studio/digital-human'
import DingDingIcon from '@/assets/icons/dingding.svg'
import FeiShuIcon from '@/assets/icons/feishu.svg'
import { useLanguageStore } from '@/stores/languageStore'

export interface AddChannelModalProps extends Omit<ModalProps, 'onCancel' | 'onOk'> {
  /** 确定成功的回调，传递通道配置 */
  onOk: (result: ChannelConfig) => void
  /** 取消回调 */
  onCancel: () => void
}

/** 添加通道弹窗（飞书 / 钉钉机器人凭证） */
const AddChannelModal = ({ open, onOk, onCancel }: AddChannelModalProps) => {
  const { language } = useLanguageStore()
  const [form] = Form.useForm()
  const [selectedType, setSelectedType] = useState<ChannelType>('feishu')
  const [, messageContextHolder] = message.useMessage()

  /** 左侧可选通道类型（展示名与配置标题走 i18n） */
  const channelOptions = useMemo(
    () =>
      [
        {
          type: 'feishu' as const,
          name: intl.get('digitalHuman.channelModal.feishuBot'),
          configTitle: intl.get('digitalHuman.channelModal.feishuConfigTitle'),
          icon: FeiShuIcon,
        },
        {
          type: 'dingtalk' as const,
          name: intl.get('digitalHuman.channelModal.dingtalkBot'),
          configTitle: intl.get('digitalHuman.channelModal.dingtalkConfigTitle'),
          icon: DingDingIcon,
        },
      ] as const,
    [language],
  )

  const selectedOption = useMemo(() => {
    return channelOptions.find((o) => o.type === selectedType)
  }, [channelOptions, selectedType])

  useEffect(() => {
    if (!open) return
    setSelectedType('feishu')
    form.resetFields()
  }, [open, form])

  const handleReset = () => {
    form.resetFields()
  }

  const handleSelectChannel = (type: ChannelType) => {
    setSelectedType(type)
    form.resetFields()
  }

  const handleTestConnection = async () => {
    try {
      await form.validateFields()
      message.success(intl.get('digitalHuman.channelModal.testConnectionOk'))
    } catch {
      // 表单校验不通过时不提示额外错误
    }
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const appId = (values.app_id as string | undefined)?.trim() ?? ''
      const appSecret = (values.app_secret as string | undefined)?.trim() ?? ''

      onOk({
        type: selectedType,
        appId,
        appSecret,
      })
      onCancel()
    } catch (err: any) {
      // 表单校验失败时不额外打断
      if (err?.errorFields) return
      message.error(err?.description || intl.get('digitalHuman.channelModal.configFailed'))
    }
  }

  return (
    <>
      {messageContextHolder}
      <Modal
        open={open}
        onCancel={onCancel}
        closable={false}
        mask={{ closable: false }}
        destroyOnHidden
        width={840}
        footer={false}
        styles={{ container: { padding: 0 } }}
      >
        <div className="flex min-h-[500px] overflow-hidden rounded-md border border-[#E5E6EA]">
          <div className="flex w-[220px] flex-col gap-1 border-r border-[#E5E6EA] bg-[#FAFBFC] px-2 py-[18px]">
            {channelOptions.map((option) => {
              const isSelected = option.type === selectedType
              return (
                <button
                  key={option.type}
                  type="button"
                  className={`h-9 cursor-pointer rounded-md px-2 text-left transition-colors] ${
                    isSelected ? 'bg-white' : 'bg-transparent'
                  }`}
                  onClick={() => handleSelectChannel(option.type)}
                >
                  <div className="flex h-full items-center gap-1.5 text-sm text-[rgb(0_0_0_/_85%)]">
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      className="m-0 h-4 w-4 accent-[#126EE3]"
                    />
                    <img src={option.icon} alt={option.name} className="h-4 w-4 object-contain" />
                    <span>{option.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex-1 bg-white px-6 pb-5 pt-4">
            <div className="mb-4 flex items-start gap-x-2">
              {selectedOption && (
                <img src={selectedOption.icon} alt={selectedOption.name} className="h-8 w-8" />
              )}
              <div>
                <div className="text-sm leading-5 text-[rgb(0_0_0_/_85%)]">
                  {selectedOption?.configTitle ?? intl.get('digitalHuman.channelModal.configFallbackTitle')}
                </div>
                <div className="mt-0.5 text-xs leading-[18px] text-[rgb(0_0_0_/_50%)]">
                  {intl.get('digitalHuman.channelModal.configSubtitle')}
                </div>
              </div>
            </div>

            <Form form={form} layout="vertical">
              <Form.Item
                label={intl.get('digitalHuman.channelModal.labelApiKey')}
                name="app_id"
                rules={[{ required: true, message: intl.get('digitalHuman.channelModal.ruleAppId') }]}
              >
                <Input
                  placeholder={
                    selectedType === 'dingtalk'
                      ? intl.get('digitalHuman.channelModal.placeholderDingtalkAppKey')
                      : intl.get('digitalHuman.channelModal.placeholderFeishuAppKey')
                  }
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item
                label={intl.get('digitalHuman.channelModal.labelApiSecret')}
                name="app_secret"
                rules={[{ required: true, message: intl.get('digitalHuman.channelModal.ruleAppSecret') }]}
              >
                <Input placeholder={intl.get('digitalHuman.channelModal.placeholderAppSecret')} autoComplete="off" />
              </Form.Item>
            </Form>
            <div className="flex justify-between">
              <button
                type="button"
                className="mb-[14px] cursor-pointer border-none bg-transparent p-0 leading-5 text-[#126EE3]"
                onClick={handleTestConnection}
              >
                {/* 测试连接 */}
              </button>
              <div className="flex justify-end gap-2">
                <Button type="primary" onClick={handleOk}>
                  {intl.get('global.ok')}
                </Button>
                <Button onClick={handleReset}>{intl.get('digitalHuman.channelModal.reset')}</Button>
                <Button onClick={onCancel}>{intl.get('global.cancel')}</Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default AddChannelModal
