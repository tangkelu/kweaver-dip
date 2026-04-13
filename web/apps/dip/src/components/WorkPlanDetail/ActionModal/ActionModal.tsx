import type { ModalProps } from 'antd'
import { Form, Input, Modal, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import intl from 'react-intl-universal'
import { type CronJob, updateCronJob } from '@/apis/dip-studio/plan'

interface EditPlanFormValues {
  name: string
  enabled: boolean
}

export interface ActionModalProps extends Pick<ModalProps, 'open' | 'onCancel'> {
  plan?: CronJob
  onSuccess: (plan: CronJob) => void
}

const ActionModal = ({ open, onCancel, onSuccess, plan }: ActionModalProps) => {
  const [form] = Form.useForm<EditPlanFormValues>()
  const [loading, setLoading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const nameValue = Form.useWatch('name', form)
  const canSubmit = useMemo(() => Boolean(nameValue?.trim()), [nameValue])
  const submitDisabled = useMemo(() => {
    if (!plan) return true
    return !canSubmit
  }, [plan, canSubmit])

  useEffect(() => {
    if (!open) return
    setLoading(false)
    form.setFieldsValue({
      name: plan?.name ?? '',
      enabled: plan?.enabled ?? true,
    })
  }, [open, form, plan])

  const handleOk = async () => {
    if (!plan) return
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name.trim(),
        enabled: values.enabled,
      }
      setLoading(true)
      const updatedPlan = await updateCronJob(plan.id, payload)
      messageApi.success(intl.get('workPlan.actionModal.editPlanSuccess'))
      onSuccess(updatedPlan)
      onCancel?.(undefined as never)
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      if (error?.description) {
        messageApi.error(error.description)
      } else {
        messageApi.error(intl.get('workPlan.actionModal.editPlanFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {contextHolder}
      <Modal
        title={intl.get('workPlan.actionModal.editPlanTitle')}
        open={open}
        onCancel={onCancel}
        onOk={handleOk}
        closable
        mask={{ closable: false }}
        destroyOnHidden
        width={520}
        okText={intl.get('global.ok')}
        cancelText={intl.get('global.cancel')}
        confirmLoading={loading}
        okButtonProps={{ loading, disabled: submitDisabled }}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <OkBtn />
            <CancelBtn />
          </>
        )}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4 mb-10"
          initialValues={{ enabled: true }}
        >
          <Form.Item
            label={intl.get('workPlan.actionModal.planName')}
            name="name"
            rules={[
              {
                required: true,
                whitespace: true,
                message: intl.get('workPlan.actionModal.planNameRequired'),
              },
            ]}
          >
            <Input placeholder={intl.get('workPlan.actionModal.planNamePlaceholder')} maxLength={128} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default ActionModal
