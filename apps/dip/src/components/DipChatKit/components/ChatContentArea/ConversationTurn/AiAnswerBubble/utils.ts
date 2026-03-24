import isString from 'lodash/isString'
import intl from 'react-intl-universal'
import type { DipChatKitAnswerEvent, DipChatKitPreviewPayload } from '../../../../types'

const MARKDOWN_FILE_NAME_PATTERN =
  /([^\s"'“”‘’<>()\[\]{}]+?\.md)(?=$|[\s,，。！？；:：)）\]】"'“”‘’])/gi

export const normalizeMarkdownText = (value: unknown): string => {
  if (isString(value)) return value
  if (value === null || value === undefined) return ''
  return String(value)
}

export const normalizeLanguage = (lang?: string): string => {
  if (!lang) return ''
  return lang.trim().split(/\s+/)[0]?.toLowerCase() || ''
}

export const isMermaidLanguage = (lang: string): boolean => {
  return lang === 'mermaid'
}

export const getDomDataAttributes = (domNode: unknown): Record<string, string> => {
  if (!domNode || typeof domNode !== 'object') return {}
  if (!('attribs' in domNode)) return {}

  const attrs = (domNode as { attribs?: Record<string, string> }).attribs
  if (!attrs || typeof attrs !== 'object') return {}
  return attrs
}

export const buildCodePreviewPayload = (lang: string, code: string): DipChatKitPreviewPayload => {
  const sourceType = isMermaidLanguage(lang) ? 'mermaid' : 'code'
  const resolvedDefaultLanguage = intl.get('dipChatKit.defaultCodeLanguage').d('text') as string
  const resolvedLanguage = lang || resolvedDefaultLanguage
  return {
    title: isMermaidLanguage(lang)
      ? (intl.get('dipChatKit.mermaidPreview').d('Mermaid 预览') as string)
      : (intl
          .get('dipChatKit.codeSnippetTitle', { lang: resolvedLanguage })
          .d(`${resolvedLanguage} 代码片段`) as string),
    content: code,
    sourceType,
  }
}

export const buildCardPreviewPayload = (
  title: string,
  content: string,
): DipChatKitPreviewPayload => {
  return {
    title,
    content,
    sourceType: 'card',
  }
}

export interface TextSegment {
  type: 'text' | 'file'
  value: string
}

export const splitTextByMarkdownFileName = (text: string): TextSegment[] => {
  if (!text) return []

  const segments: TextSegment[] = []
  let lastIndex = 0
  MARKDOWN_FILE_NAME_PATTERN.lastIndex = 0

  let match = MARKDOWN_FILE_NAME_PATTERN.exec(text)
  while (match) {
    const fullMatch = match[0]
    const matchIndex = match.index
    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, matchIndex),
      })
    }

    segments.push({
      type: 'file',
      value: fullMatch,
    })

    lastIndex = matchIndex + fullMatch.length
    match = MARKDOWN_FILE_NAME_PATTERN.exec(text)
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    })
  }

  return segments
}

export const extractMarkdownFileNameFromHref = (href: string): string => {
  if (!href) return ''
  const path = href.split('#')[0]?.split('?')[0] || ''
  const fileNameWithEncoding = path.split('/').pop() || ''
  if (!fileNameWithEncoding) return ''

  let fileName = fileNameWithEncoding
  try {
    fileName = decodeURIComponent(fileNameWithEncoding)
  } catch {
    fileName = fileNameWithEncoding
  }

  if (!/\.md$/i.test(fileName)) {
    return ''
  }

  return fileName
}

export const buildMarkdownFilePreviewPayload = (
  fileName: string,
  sourceContent?: string,
): DipChatKitPreviewPayload => {
  return {
    title: fileName || (intl.get('dipChatKit.markdownFile').d('Markdown 文件') as string),
    content: sourceContent || fileName || '',
    sourceType: 'text',
  }
}

export const getAnswerEventTypeLabel = (event: DipChatKitAnswerEvent): string => {
  if (event.type === 'toolCall') {
    return intl.get('dipChatKit.eventToolCall').d('工具调用') as string
  }

  if (event.type === 'toolResult') {
    return intl.get('dipChatKit.eventToolResult').d('工具结果') as string
  }

  if (event.type === 'system') {
    return intl.get('dipChatKit.eventSystem').d('系统消息') as string
  }

  return intl.get('dipChatKit.eventUnknown').d('其他消息') as string
}

export const getAnswerEventRoleLabel = (event: DipChatKitAnswerEvent): string => {
  const normalizedRole = event.role.trim().toLowerCase()
  if (normalizedRole === 'assistant') {
    return intl.get('dipChatKit.eventRoleAssistant').d('助手') as string
  }
  if (normalizedRole === 'toolresult' || normalizedRole === 'tool') {
    return intl.get('dipChatKit.eventRoleTool').d('工具') as string
  }
  if (normalizedRole === 'system') {
    return intl.get('dipChatKit.eventRoleSystem').d('系统') as string
  }

  return event.role || (intl.get('dipChatKit.eventRoleUnknown').d('未知') as string)
}

export const getAnswerEventDisplayText = (event: DipChatKitAnswerEvent): string => {
  if (event.text.trim()) {
    return event.text
  }

  if (event.details) {
    try {
      return JSON.stringify(event.details, null, 2)
    } catch {
      return String(event.details)
    }
  }

  return ''
}

const EVENT_INLINE_THRESHOLD = 120
const EVENT_PREVIEW_LENGTH = 240

const normalizeLineBreak = (value: string): string => {
  return value.replace(/\r\n/g, '\n').trim()
}

const parseTextJson = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

const toSimpleString = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const getAnswerEventCardDetail = (event: DipChatKitAnswerEvent): string => {
  const rawText = getAnswerEventDisplayText(event)
  const parsed = parseTextJson(rawText)
  if (parsed) {
    const detailKeys = [
      'command',
      'path',
      'url',
      'query',
      'session',
      'channelId',
      'messageId',
      'id',
      'name',
      'title',
    ]

    for (const key of detailKeys) {
      const value = parsed[key]
      if (value !== undefined && value !== null && value !== '') {
        return `${key}: ${toSimpleString(value)}`
      }
    }
  }

  const oneLineText = normalizeLineBreak(rawText).split('\n')[0] || ''
  if (!oneLineText) {
    return ''
  }

  if (oneLineText.length <= 96) {
    return oneLineText
  }

  return `${oneLineText.slice(0, 96)}...`
}

export const getAnswerEventInlineText = (event: DipChatKitAnswerEvent): string => {
  const text = normalizeLineBreak(getAnswerEventDisplayText(event))
  if (!text || text.length > EVENT_INLINE_THRESHOLD) {
    return ''
  }

  return text
}

export const getAnswerEventPreviewText = (event: DipChatKitAnswerEvent): string => {
  const text = normalizeLineBreak(getAnswerEventDisplayText(event))
  if (!text || text.length <= EVENT_INLINE_THRESHOLD) {
    return ''
  }

  if (text.length <= EVENT_PREVIEW_LENGTH) {
    return text
  }

  return `${text.slice(0, EVENT_PREVIEW_LENGTH)}...`
}

export const getAnswerEventFullText = (event: DipChatKitAnswerEvent): string => {
  return normalizeLineBreak(getAnswerEventDisplayText(event))
}

export const getAnswerEventCardTitle = (event: DipChatKitAnswerEvent): string => {
  const typeLabel = getAnswerEventTypeLabel(event)
  const roleLabel = getAnswerEventRoleLabel(event)
  if (event.toolName) {
    return `${typeLabel} ${roleLabel} ${event.toolName}`
  }
  return `${typeLabel} ${roleLabel}`
}

export const getAnswerEventActionLabel = (event: DipChatKitAnswerEvent): string => {
  if (event.isError) {
    return intl.get('dipChatKit.eventActionError').d('错误') as string
  }
  return intl.get('dipChatKit.eventActionView').d('查看') as string
}
