import DipChatKit from '@/components/DipChatKit'

export type ConversationProps = {
  planId?: string
  dhId: string
  sessionId: string
}

/** 对话 Tab（接入会话 API 后替换） */
const Conversation = ({ planId: _planId, dhId, sessionId }: ConversationProps) => {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <DipChatKit
        defaultEmployeeValue={dhId}
        sessionId={sessionId}
      />
    </div>
  )
}

export default Conversation
