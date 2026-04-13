import { Form } from 'antd'
import { memo, useEffect } from 'react'
import intl from 'react-intl-universal'
import ScrollBarContainer from '@/components/ScrollBarContainer'
import { useLanguageStore } from '@/stores/languageStore'
import AdPromptInput from '../AdPromptInput'
import { useDigitalHumanStore } from '../digitalHumanStore'
import NameDescriptionFields from './NameDescriptionFields'

/** 基本设置：名称、简介、角色设定（创建 / 编辑 / 只读详情共用） */
const BasicSetting = ({ readonly }: { readonly?: boolean }) => {
  const { language } = useLanguageStore()
  const { basic, skills, updateBasic } = useDigitalHumanStore()
  const [form] = Form.useForm()

  const skillOptions = skills.map((skill) => ({
    label: skill.name,
    value: ` @${skill.name}`,
    type: 'text',
  }))

  useEffect(() => {
    form.setFieldsValue({
      name: basic.name,
      creature: basic.creature,
      soul: basic.soul,
    })
  }, [basic.name, basic.creature, basic.soul, form])

  const ROLE_INSTRUCTION_PLACEHOLDER: Record<string, string> = {
    'zh-CN': `# 角色
角色名称
# 角色描述
角色概述和主要职责的一句话描述
## 目标
角色的工作目标，如果有多目标可以分点列出
## 技能
为了实现目标，角色需要具备的技能1（可使用@调用技能）
为了实现目标，角色需要具备的技能2（可使用@调用技能）
为了实现目标，角色需要具备的技能3（可使用@调用技能）
`,

    'zh-TW': `# 角色
角色名稱
# 角色描述
角色概述與主要職責的一句話描述
## 目標
角色的工作目標，若有多個目標可分點列出
## 技能
為達成目標，角色需要具備的技能1（可使用@調用技能）
為達成目標，角色需要具備的技能2（可使用@調用技能）
為達成目標，角色需要具備的技能3（可使用@調用技能）
`,

    'en-US': `# Role
Role name
# Role description
One-sentence overview of the role and its main responsibilities
## Goals
The role's work goals; if there are multiple goals, list them as separate points
## Skills
Skill 1 the role needs to meet its goals (invoke skills with @)
Skill 2 the role needs to meet its goals (invoke skills with @)
Skill 3 the role needs to meet its goals (invoke skills with @)
`,
  }

  if (readonly) {
    return (
      <ScrollBarContainer className="h-full flex flex-col p-6 flex-1">
        <div className="text-xl">{intl.get('digitalHuman.basic.infoSectionTitle')}</div>
        <div className="h-px w-full bg-[--dip-border-color] my-4 flex-shrink-0" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className="text-base font-medium">
              {intl.get('digitalHuman.basic.fieldName')}
            </span>
            <span className="text-sm break-words">{basic.name}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">{intl.get('digitalHuman.basic.fieldBio')}</span>
            <span className="text-sm whitespace-pre-wrap break-words">
              {basic.creature || '--'}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-base font-medium">
              {intl.get('digitalHuman.basic.fieldSoul')}
            </span>
            <AdPromptInput
              bordered={false}
              transparent
              disabled
              value={basic.soul || '--'}
              style={{ minHeight: '200px' }}
              placeholder={''}
              trigger={[
                {
                  character: '@',
                  options: skillOptions,
                },
              ]}
            />
          </div>
        </div>
      </ScrollBarContainer>
    )
  }

  return (
    <ScrollBarContainer className="h-full flex flex-col p-6 flex-1">
      <div className="font-medium text-[--dip-text-color]">
        {intl.get('digitalHuman.setting.menuBasic')}
      </div>
      <div className="mt-1 text-[--dip-text-color-45]">
        {intl.get('digitalHuman.basic.editIntro')}
      </div>
      <Form
        form={form}
        layout="vertical"
        className="mt-6"
        onValuesChange={(_, allValues) =>
          updateBasic({
            name: allValues.name,
            creature: allValues.creature,
            soul: allValues.soul,
          })
        }
      >
        <NameDescriptionFields />

        <Form.Item
          label={intl.get('digitalHuman.basic.soulLabel')}
          name="soul"
          style={{ marginBottom: 0 }}
        >
          <AdPromptInput
            style={{ minHeight: '240px', maxHeight: 'calc(100vh - 476px)' }}
            placeholder={ROLE_INSTRUCTION_PLACEHOLDER[language]}
            trigger={[
              {
                character: '@',
                options: skillOptions,
              },
            ]}
          />
        </Form.Item>
      </Form>
    </ScrollBarContainer>
  )
}

export default memo(BasicSetting)
