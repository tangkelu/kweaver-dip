import clsx from 'clsx'
import type React from 'react'
import AiAnswerBubble from './AiAnswerBubble'
import UserQuestionBubble from './UserQuestionBubble'
import styles from './index.module.less'
import type { ConversationTurnProps } from './types'

const ConversationTurn: React.FC<ConversationTurnProps> = ({
  turn,
  onEditQuestion,
  onCopyQuestion,
  onCopyAnswer,
  onRegenerateAnswer,
  onOpenPreview,
}) => {
  const shouldRenderQuestion =
    turn.question.trim().length > 0 || turn.questionAttachments.length > 0

  return (
    <div className={clsx('ConversationTurn', styles.root)}>
      {shouldRenderQuestion && (
        <UserQuestionBubble
          question={turn.question}
          attachments={turn.questionAttachments}
          onEdit={() => {
            onEditQuestion(turn.id, turn.question)
          }}
          onCopy={() => {
            onCopyQuestion(turn.question)
          }}
        />
      )}
      <AiAnswerBubble
        turn={turn}
        onCopy={() => {
          onCopyAnswer(turn.answerMarkdown)
        }}
        onRegenerate={() => {
          onRegenerateAnswer(turn.id)
        }}
        onOpenPreview={(payload) => {
          onOpenPreview(turn.id, payload)
        }}
      />
    </div>
  )
}

export default ConversationTurn
