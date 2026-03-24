import { Drawer } from 'antd'
import DipChatKit from '@/components/DipChatKit'
import type { AiPromptSubmitPayload } from '@/components/DipChatKit/components/AiPromptInput/types'

export interface AddSkillDrawerProps {
  open: boolean
  onClose: () => void
  payload: AiPromptSubmitPayload | null
}

const AddSkillDrawer = ({ open, onClose, payload }: AddSkillDrawerProps) => {
  return (
    <Drawer
      title="新建技能"
      open={open}
      onClose={onClose}
      closable={{ placement: 'end' }}
      mask={{ closable: false }}
      destroyOnHidden
      styles={{
        // DigitalHumanSetting 左侧菜单固定宽度 w-60（15rem），抽屉只覆盖右侧内容区
        wrapper: { width: 'calc(100% - 15rem)', minWidth: 0 },
        header: { borderBottom: 'none' },
        body: { padding: 0 },
      }}
      getContainer={() => document.getElementById('digital-human-setting-container') as HTMLElement}
    >
      <div className="flex flex-col h-full min-h-0">
        <div className="flex flex-1 min-h-0">
          <DipChatKit
            initialSubmitPayload={payload ?? undefined}
            defaultEmployeeValue="__internal_skill_agent__"
          />
        </div>
      </div>
    </Drawer>
  )
}

export default AddSkillDrawer
