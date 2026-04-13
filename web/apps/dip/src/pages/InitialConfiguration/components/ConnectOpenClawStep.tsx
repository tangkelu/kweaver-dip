import type { FormInstance } from 'antd'
import { Button, Form, Input, Spin } from 'antd'
import Tooltip from 'antd/es/tooltip'
import { memo } from 'react'
import intl from 'react-intl-universal'
import type { GuideInitializeRequest } from '@/apis/dip-studio/guide'
import styles from './index.module.less'

interface ConnectOpenClawStepProps {
  loading: boolean
  submitError: string | null
  submitting: boolean
  form: FormInstance<GuideInitializeRequest>
  onNextFromConnect: (values: GuideInitializeRequest) => void
}

function validateKweaverBaseUrl(_: unknown, value: string | undefined) {
  const v = value?.trim()
  if (!v) return Promise.resolve()
  try {
    const u = new URL(v)
    if (!['http:', 'https:'].includes(u.protocol)) {
      return Promise.reject(
        new Error(intl.get('initialConfiguration.connect.kweaverBaseUrlInvalidProtocol')),
      )
    }
    return Promise.resolve()
  } catch {
    return Promise.reject(
      new Error(intl.get('initialConfiguration.connect.kweaverBaseUrlInvalid')),
    )
  }
}

const ConnectOpenClawStep = ({
  loading,
  submitError,
  submitting,
  form,
  onNextFromConnect,
}: ConnectOpenClawStepProps) => {
  const kweaverBaseUrl = Form.useWatch('kweaver_base_url', form)
  const hasKweaverBaseUrl = Boolean(kweaverBaseUrl?.trim())

  return (
    <div className="w-full h-full flex flex-col">
      {loading ? (
        <div className="flex-1 min-h-[260px] flex flex-col items-center justify-center">
          <div className="text-black/50 mt-3 mb-8">
            {intl.get('initialConfiguration.connect.loading')}
          </div>
          <Spin />
        </div>
      ) : (
        <>
          <div className="font-bold text-[--dip-text-color] text-[28px]">
            {intl.get('initialConfiguration.connect.title')}
          </div>
          <div className="text-black/50 mt-3 mb-8">
            {intl.get('initialConfiguration.connect.subtitle')}
          </div>
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              openclaw_address: '',
              openclaw_token: '',
              kweaver_base_url: '',
              kweaver_token: '',
            }}
            onValuesChange={(changedValues) => {
              const changedKeys = Object.keys(changedValues) as Array<keyof GuideInitializeRequest>
              const fieldsToClear = changedKeys.map((key) => ({ name: key, errors: [] }))
              if (changedKeys.includes('kweaver_base_url')) {
                fieldsToClear.push({ name: 'kweaver_token', errors: [] })
              }
              form.setFields(fieldsToClear)
            }}
            onFinish={onNextFromConnect}
            className={styles.form}
          >
            <Form.Item
              label={intl.get('initialConfiguration.connect.connectionAddressLabel')}
              name="openclaw_address"
              validateTrigger="onSubmit"
              rules={[
                {
                  required: true,
                  message: intl.get('initialConfiguration.connect.connectionAddressRequired'),
                },
              ]}
            >
              <Input
                placeholder={intl.get('initialConfiguration.connect.connectionAddressPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              label={intl.get('initialConfiguration.connect.tokenLabel')}
              name="openclaw_token"
              validateTrigger="onSubmit"
              rules={[
                { required: true, message: intl.get('initialConfiguration.connect.tokenRequired') },
              ]}
            >
              <Input placeholder={intl.get('initialConfiguration.connect.tokenPlaceholder')} />
            </Form.Item>

            <Form.Item
              label={intl.get('initialConfiguration.connect.kweaverBaseUrlLabel')}
              name="kweaver_base_url"
              validateTrigger="onSubmit"
              rules={[{ validator: validateKweaverBaseUrl }]}
            >
              <Input placeholder={intl.get('initialConfiguration.connect.kweaverBaseUrlPlaceholder')} />
            </Form.Item>

            <Form.Item
              label={intl.get('initialConfiguration.connect.kweaverTokenLabel')}
              name="kweaver_token"
              validateTrigger="onSubmit"
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const baseUrl = getFieldValue('kweaver_base_url')?.trim()
                    if (!baseUrl) return Promise.resolve()
                    if (value?.trim()) return Promise.resolve()
                    return Promise.reject(
                      new Error(
                        intl.get('initialConfiguration.connect.kweaverTokenRequiredWhenBaseUrl'),
                      ),
                    )
                  },
                }),
              ]}
            >
              <Input
                placeholder={
                  hasKweaverBaseUrl
                    ? intl.get('initialConfiguration.connect.kweaverTokenPlaceholder')
                    : intl.get('initialConfiguration.connect.kweaverTokenPlaceholderDisabled')
                }
                disabled={!hasKweaverBaseUrl}
              />
            </Form.Item>

            <div className="flex justify-between">
              <Tooltip
                color={'#fff'}
                classNames={{
                  container: 'max-h-[300px] overflow-y-auto',
                }}
                title={submitError || ''}
              >
                <div className="text-sm text-[--dip-error-color] line-clamp-1">
                  {submitError || ''}
                </div>
              </Tooltip>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {intl.get('initialConfiguration.connect.next')}
              </Button>
            </div>
          </Form>
        </>
      )}
    </div>
  )
}

export default memo(ConnectOpenClawStep)
