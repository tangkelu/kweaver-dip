import {
  CheckOutlined,
  CopyOutlined,
  EyeOutlined,
  RedoOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Tooltip } from 'antd'
import { Bubble, CodeHighlighter, Mermaid } from '@ant-design/x'
import XMarkdown, { type ComponentProps as MarkdownComponentProps } from '@ant-design/x-markdown'
import '@ant-design/x-markdown/dist/x-markdown.css'
import clsx from 'clsx'
import isEmpty from 'lodash/isEmpty'
import type React from 'react'
import { Children } from 'react'
import { useMemo } from 'react'
import intl from 'react-intl-universal'
import MessageActions from '../MessageActions'
import type { MessageAction } from '../MessageActions/types'
import styles from './index.module.less'
import type { AiAnswerBubbleProps } from './types'
import {
  buildCardPreviewPayload,
  buildCodePreviewPayload,
  buildMarkdownFilePreviewPayload,
  extractMarkdownFileNameFromHref,
  getAnswerEventActionLabel,
  getAnswerEventCardDetail,
  getAnswerEventCardTitle,
  getAnswerEventFullText,
  getAnswerEventInlineText,
  getAnswerEventPreviewText,
  getDomDataAttributes,
  isMermaidLanguage,
  normalizeLanguage,
  normalizeMarkdownText,
  splitTextByMarkdownFileName,
} from './utils'

const AiAnswerBubble: React.FC<AiAnswerBubbleProps> = ({ turn, onCopy, onRegenerate, onOpenPreview }) => {
  const markdownComponents = useMemo(() => {
    const openMarkdownFilePreview = (fileName: string, sourceContent?: string) => {
      onOpenPreview(buildMarkdownFilePreviewPayload(fileName, sourceContent))
    }

    const renderTextWithMarkdownFilePreview = (text: string, keyPrefix: string): React.ReactNode[] => {
      const segments = splitTextByMarkdownFileName(text)
      if (segments.length === 0) {
        return [text]
      }

      return segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={`${keyPrefix}-text-${index}`}>{segment.value}</span>
        }

        return (
          <span
            key={`${keyPrefix}-file-${index}`}
            className={styles.markdownFileLink}
            role="button"
            tabIndex={0}
            onClick={() => {
              openMarkdownFilePreview(segment.value, segment.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openMarkdownFilePreview(segment.value, segment.value)
              }
            }}
          >
            {segment.value}
          </span>
        )
      })
    }

    const renderChildrenWithMarkdownFilePreview = (
      children: React.ReactNode,
      keyPrefix: string,
    ): React.ReactNode[] => {
      const nodes = Children.toArray(children)
      return nodes.reduce<React.ReactNode[]>((result, node, index) => {
        if (typeof node === 'string') {
          const textNodes = renderTextWithMarkdownFilePreview(node, `${keyPrefix}-${index}`)
          result.push(...textNodes)
          return result
        }

        result.push(node)
        return result
      }, [])
    }

    const CodeRenderer: React.FC<MarkdownComponentProps> = ({
      children,
      lang,
      block,
      className,
    }) => {
      const language = normalizeLanguage(lang)
      const codeText = normalizeMarkdownText(children)

      if (!block) {
        return <code className={clsx(styles.inlineCode, className)}>{codeText}</code>
      }

      if (isMermaidLanguage(language)) {
        return (
          <div
            className={styles.blockCodeWrap}
            onClick={() => {
              onOpenPreview(buildCodePreviewPayload(language, codeText))
            }}
            role="presentation"
          >
            <Mermaid>{codeText}</Mermaid>
          </div>
        )
      }

      return (
        <div
          className={styles.blockCodeWrap}
          onClick={() => {
            onOpenPreview(buildCodePreviewPayload(language, codeText))
          }}
          role="presentation"
        >
          <CodeHighlighter lang={language || 'text'}>{codeText}</CodeHighlighter>
        </div>
      )
    }

    const LinkRenderer: React.FC<MarkdownComponentProps> = ({ children, className, href }) => {
      const hrefText = normalizeMarkdownText(href)
      const fileName = extractMarkdownFileNameFromHref(hrefText)

      if (!fileName) {
        return (
          <a className={className} href={hrefText || undefined} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      }

      const displayText = normalizeMarkdownText(children) || fileName
      return (
        <span
          className={clsx(className, styles.markdownFileLink)}
          role="button"
          tabIndex={0}
          onClick={() => {
            openMarkdownFilePreview(fileName, hrefText || displayText)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openMarkdownFilePreview(fileName, hrefText || displayText)
            }
          }}
        >
          {displayText}
        </span>
      )
    }

    const ParagraphRenderer: React.FC<MarkdownComponentProps> = ({ children, className }) => {
      return <p className={className}>{renderChildrenWithMarkdownFilePreview(children, 'p')}</p>
    }

    const ListItemRenderer: React.FC<MarkdownComponentProps> = ({ children, className }) => {
      return <li className={className}>{renderChildrenWithMarkdownFilePreview(children, 'li')}</li>
    }

    const DivRenderer: React.FC<MarkdownComponentProps> = ({ children, className, domNode }) => {
      const attrs = getDomDataAttributes(domNode)
      const isPreviewCard = attrs['data-preview-card'] === 'true'
      if (!isPreviewCard) {
        return <div className={className}>{children}</div>
      }

      const title =
        attrs['data-preview-title'] || (intl.get('dipChatKit.answerCard').d('回答卡片') as string)
      const content = attrs['data-preview-content'] || normalizeMarkdownText(children)

      return (
        <div
          className={styles.previewCard}
          onClick={() => {
            onOpenPreview(buildCardPreviewPayload(title, content))
          }}
          role="presentation"
        >
          <span className={styles.previewCardTitle}>{title}</span>
          <span className={styles.previewCardDesc}>{content}</span>
        </div>
      )
    }

    return {
      code: CodeRenderer,
      a: LinkRenderer,
      p: ParagraphRenderer,
      li: ListItemRenderer,
      div: DivRenderer,
    }
  }, [onOpenPreview])

  const answerContent =
    turn.answerMarkdown || (turn.answerLoading ? intl.get('dipChatKit.answerLoading').d('处理中...') : '')
  const hasEventBlocks = turn.answerEvents.length > 0
  const shouldRenderAnswerBubble = Boolean(answerContent) || turn.answerLoading || turn.answerStreaming
  const bubbleActions = useMemo<MessageAction[]>(() => {
    const actions: MessageAction[] = []

    if (turn.answerMarkdown.trim()) {
      actions.push({
        key: 'copy-answer',
        title: intl.get('dipChatKit.copyAnswer').d('复制回答') as string,
        icon: <CopyOutlined />,
        onClick: onCopy,
      })
    }

    if (turn.question.trim()) {
      actions.push({
        key: 'regenerate-answer',
        title: intl.get('dipChatKit.regenerateAnswer').d('重新生成') as string,
        icon: <RedoOutlined />,
        onClick: onRegenerate,
      })
    }

    return actions
  }, [onCopy, onRegenerate, turn.answerMarkdown, turn.question])

  return (
    <div className={clsx('AiAnswerBubble', styles.root)}>
      <div
        className={clsx(styles.answerLayout, {
          [styles.answerLayoutWithEvents]: hasEventBlocks,
        })}
      >
        {shouldRenderAnswerBubble && (
          <div className={styles.answerMain}>
            <Bubble
              className={styles.bubble}
              content={answerContent}
              streaming={turn.answerStreaming}
              typing={turn.answerStreaming ? { effect: 'fade-in' } : false}
              loading={turn.answerLoading && isEmpty(turn.answerMarkdown)}
              contentRender={(content) => {
                return (
                  <XMarkdown className={styles.markdownRoot} components={markdownComponents}>
                    {normalizeMarkdownText(content)}
                  </XMarkdown>
                )
              }}
              footer={
                bubbleActions.length > 0 ? (
                  <div className={styles.actionsWrap}>
                    <MessageActions actions={bubbleActions} />
                  </div>
                ) : null
              }
            />
          </div>
        )}

        {hasEventBlocks && (
          <div className={styles.eventBlockList}>
            {turn.answerEvents.map((event) => {
              const eventTitle = getAnswerEventCardTitle(event)
              const eventDetail = getAnswerEventCardDetail(event)
              const eventInlineText = getAnswerEventInlineText(event)
              const eventPreviewText = getAnswerEventPreviewText(event)
              const eventFullText = getAnswerEventFullText(event)
              const canOpenPreview = Boolean(eventFullText)

              return (
                <div
                  key={event.id}
                  className={clsx(styles.eventBlockItem, {
                    [styles.eventBlockItemError]: event.isError,
                    [styles.eventBlockItemClickable]: canOpenPreview,
                  })}
                  role={canOpenPreview ? 'button' : undefined}
                  tabIndex={canOpenPreview ? 0 : undefined}
                  onClick={() => {
                    if (!canOpenPreview) return
                    onOpenPreview(buildCardPreviewPayload(eventTitle, eventFullText))
                  }}
                  onKeyDown={(domEvent) => {
                    if (!canOpenPreview) return
                    if (domEvent.key !== 'Enter' && domEvent.key !== ' ') return
                    domEvent.preventDefault()
                    onOpenPreview(buildCardPreviewPayload(eventTitle, eventFullText))
                  }}
                >
                  <div className={styles.eventBlockHead}>
                    <div className={styles.eventBlockTitleWrap}>
                      <span className={styles.eventBlockIcon}>
                        {event.isError ? <WarningOutlined /> : <ToolOutlined />}
                      </span>
                      <span className={styles.eventBlockTitle}>{eventTitle}</span>
                    </div>
                    {canOpenPreview && (
                      <Tooltip title={getAnswerEventActionLabel(event)}>
                        <span className={styles.eventBlockAction} aria-hidden>
                          <EyeOutlined />
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  {eventDetail && <div className={styles.eventBlockDetail}>{eventDetail}</div>}

                  {event.toolCallId && (
                    <div className={styles.eventBlockCallId}>
                      {intl.get('dipChatKit.eventCallId').d('调用ID')}：{event.toolCallId}
                    </div>
                  )}

                  {!eventInlineText && !eventPreviewText && !event.isError && (
                    <div className={styles.eventBlockStatus}>
                      <CheckOutlined />
                    </div>
                  )}

                  {eventInlineText && <div className={styles.eventBlockInline}>{eventInlineText}</div>}
                  {eventPreviewText && <pre className={styles.eventBlockPreview}>{eventPreviewText}</pre>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {turn.answerError && <div className={styles.errorText}>{turn.answerError}</div>}
    </div>
  )
}

export default AiAnswerBubble
