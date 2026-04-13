import { Form, Input } from 'antd'
import { useMemo } from 'react'
import intl from 'react-intl-universal'
import { useLanguageStore } from '@/stores/languageStore'

const NAME_MAX_LENGTH = 128
const DESCRIPTION_MAX_LENGTH = 400

/** 名称、简介表单项（与 `BasicSetting` 中「角色设定」拆分） */
const NameDescriptionFields = () => {
  const { language } = useLanguageStore()
  const nameRules = useMemo(
    () => [{ required: true, message: intl.get('digitalHuman.setting.nameRequired') }],
    [language],
  )

  return (
    <>
      <Form.Item
        label={intl.get('digitalHuman.basic.fieldName')}
        name="name"
        rules={nameRules}
      >
        <Input placeholder={intl.get('digitalHuman.basic.namePlaceholder')} maxLength={NAME_MAX_LENGTH} />
      </Form.Item>

      <Form.Item label={intl.get('digitalHuman.basic.fieldBio')} name="creature">
        <Input.TextArea
          placeholder={intl.get('digitalHuman.basic.bioPlaceholder')}
          rows={4}
          maxLength={DESCRIPTION_MAX_LENGTH}
          showCount
          autoSize={{ minRows: 5, maxRows: 5 }}
        />
      </Form.Item>
    </>
  )
}

export default NameDescriptionFields
