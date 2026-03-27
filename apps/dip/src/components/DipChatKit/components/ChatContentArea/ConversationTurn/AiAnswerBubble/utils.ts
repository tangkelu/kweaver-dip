import isString from 'lodash/isString'
import intl from 'react-intl-universal'
import type { DipChatKitAnswerEvent, DipChatKitPreviewPayload } from '../../../../types'
import type { DipChatKitToolCardItem } from './types'

const MARKDOWN_FILE_NAME_PATTERN = /([^\s"'<>()[\]{}]+?\.md)(?=$|[\s,.;:!?"'<>()[\]{}])/gi
const TOOL_INLINE_THRESHOLD = 80
const TOOL_PREVIEW_MAX_LINES = 2
const TOOL_PREVIEW_MAX_CHARS = 100
const TOOL_DETAIL_MAX_LENGTH = 96
const ARCHIVE_GRID_PLACEHOLDER_NAME = '{ORIGIN_NAME}'

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
      ? (intl.get('dipChatKit.mermaidPreview').d('Mermaid Preview') as string)
      : (intl
          .get('dipChatKit.codeSnippetTitle', { lang: resolvedLanguage })
          .d(`${resolvedLanguage} code snippet`) as string),
    content: code,
    sourceType,
  }
}

const parseJsonRecord = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

const readRecordField = (source: unknown, key: string): Record<string, unknown> | null => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null
  const value = (source as Record<string, unknown>)[key]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const normalizeArchiveSubpath = (rawSubpath: unknown, rawArchiveRoot: unknown): string => {
  const subpath = toTextFromUnknown(rawSubpath).trim().replace(/^\/+/, '')
  if (!subpath) return ''

  const archiveRoot = toTextFromUnknown(rawArchiveRoot)
    .trim()
    .replace(/^\/+|\/+$/g, '')

  if (archiveRoot && (subpath === archiveRoot || subpath.startsWith(`${archiveRoot}/`))) {
    return subpath.slice(archiveRoot.length).replace(/^\/+/, '')
  }

  if (!subpath.startsWith('archives/')) {
    return subpath
  }

  const segments = subpath.split('/').filter(Boolean)
  if (segments.length <= 1) return ''
  if (segments.length === 2) return segments[1]
  return segments.slice(2).join('/')
}

const normalizeArchiveRoot = (rawArchiveRoot: unknown): string => {
  return toTextFromUnknown(rawArchiveRoot)
    .trim()
    .replace(/^\/+|\/+$/g, '')
}

const hasFileExtension = (fileName: string): boolean => {
  const normalizedFileName = fileName.trim()
  const dotIndex = normalizedFileName.lastIndexOf('.')
  return dotIndex > 0 && dotIndex < normalizedFileName.length - 1
}

const getPathTail = (pathValue: string): string => {
  const segments = pathValue.split(/[\\/]/).filter(Boolean)
  return segments[segments.length - 1] || ''
}

const resolveFileNameFromSubpath = (subpath: string, fallbackName: unknown): string => {
  const fallbackNameText = toTextFromUnknown(fallbackName).trim()
  const fallbackTail = getPathTail(fallbackNameText)
  if (fallbackTail && hasFileExtension(fallbackTail)) {
    return fallbackTail
  }

  const subpathTail = getPathTail(subpath)
  if (subpathTail) {
    return subpathTail
  }

  return fallbackTail
}

export const buildArchiveGridPreviewPayload = (
  sessionKey: string | undefined,
  code: string,
): DipChatKitPreviewPayload | null => {
  const normalizedSessionKey = sessionKey?.trim() || ''
  if (!normalizedSessionKey) return null

  const parsed = parseJsonRecord(code)
  if (!parsed || parsed.type !== 'archive_grid') {
    return null
  }

  const data = readRecordField(parsed, 'data')
  if (!data) return null

  const dataName = toTextFromUnknown(data.name).trim()
  if (dataName === ARCHIVE_GRID_PLACEHOLDER_NAME) {
    return null
  }

  const normalizedSubpath = normalizeArchiveSubpath(data.subpath, data.archive_root)
  if (!normalizedSubpath) return null

  const fileName = resolveFileNameFromSubpath(normalizedSubpath, data.name)
  if (!fileName) return null
  const archiveRoot = normalizeArchiveRoot(data.archive_root)

  return {
    title: intl
      .get('dipChatKit.artifactPreviewTitle', { fileName })
      .d(`文件预览：${fileName}`) as string,
    content: normalizedSubpath,
    sourceType: 'artifact',
    artifact: {
      sessionKey: normalizedSessionKey,
      subpath: normalizedSubpath,
      fileName,
      archiveRoot,
    },
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
    title: fileName || (intl.get('dipChatKit.markdownFile').d('Markdown file') as string),
    content: sourceContent || fileName || '',
    sourceType: 'text',
  }
}

const normalizeLineBreak = (value: string): string => {
  return value.replace(/\r\n/g, '\n').trim()
}

const toTextFromUnknown = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const parseJsonObject = (value: string): Record<string, unknown> | null => {
  return parseJsonRecord(value)
}

const normalizeToolCardKind = (event: DipChatKitAnswerEvent): 'call' | 'result' | null => {
  if (event.type === 'toolCall') return 'call'
  if (event.type === 'toolResult') return 'result'

  const role = event.role.trim().toLowerCase()
  if (role === 'toolresult' || role === 'tool_result' || role === 'tool') {
    return 'result'
  }

  return null
}

const normalizeToolCardStatus = (
  event: DipChatKitAnswerEvent,
): 'in_progress' | 'completed' | undefined => {
  const statusValue = event.details?.status
  if (statusValue === 'in_progress' || statusValue === 'completed') {
    return statusValue
  }
  return undefined
}

const getAnswerEventRoleLabel = (event: DipChatKitAnswerEvent): string => {
  const normalizedRole = event.role.trim().toLowerCase()
  if (normalizedRole === 'assistant') {
    return intl.get('dipChatKit.eventRoleAssistant').d('Assistant') as string
  }
  if (normalizedRole === 'toolresult' || normalizedRole === 'tool') {
    return intl.get('dipChatKit.eventRoleTool').d('Tool') as string
  }
  if (normalizedRole === 'system') {
    return intl.get('dipChatKit.eventRoleSystem').d('System') as string
  }

  return event.role || (intl.get('dipChatKit.eventRoleUnknown').d('Unknown') as string)
}

export const getAnswerEventDisplayText = (event: DipChatKitAnswerEvent): string => {
  const text = normalizeLineBreak(event.text || '')
  if (text) {
    return text
  }

  if (event.details) {
    return toTextFromUnknown(event.details)
  }

  return ''
}

const buildToolCardTitle = (event: DipChatKitAnswerEvent): string => {
  if (event.toolName) {
    return event.toolName
  }

  return getAnswerEventRoleLabel(event)
}

const buildToolCardDetail = (
  event: DipChatKitAnswerEvent,
  text: string,
  kind: 'call' | 'result',
): string => {
  const parsed = parseJsonObject(text)
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
        const textValue = toTextFromUnknown(value)
        return `${key}: ${textValue}`
      }
    }
  }

  const oneLineText = text.split('\n')[0] || ''
  if (!oneLineText) {
    if (event.isError) {
      return intl.get('dipChatKit.eventActionError').d('Error') as string
    }

    if (kind === 'result') {
      return intl.get('dipChatKit.toolCompleted').d('Completed') as string
    }

    return ''
  }

  if (oneLineText.length <= TOOL_DETAIL_MAX_LENGTH) {
    return oneLineText
  }

  return `${oneLineText.slice(0, TOOL_DETAIL_MAX_LENGTH)}...`
}

const buildInlineText = (text: string): string => {
  if (!text || text.length > TOOL_INLINE_THRESHOLD) {
    return ''
  }
  return text
}

const getTruncatedPreview = (text: string): string => {
  const lines = text.split('\n')
  const firstLines = lines.slice(0, TOOL_PREVIEW_MAX_LINES)
  const joined = firstLines.join('\n')

  if (joined.length > TOOL_PREVIEW_MAX_CHARS) {
    return `${joined.slice(0, TOOL_PREVIEW_MAX_CHARS)}...`
  }

  if (firstLines.length < lines.length) {
    return `${joined}...`
  }

  return joined
}

const buildPreviewText = (text: string): string => {
  if (!text || text.length <= TOOL_INLINE_THRESHOLD) {
    return ''
  }

  return getTruncatedPreview(text)
}

export const buildToolCardItems = (events: DipChatKitAnswerEvent[]): DipChatKitToolCardItem[] => {
  return events.reduce<DipChatKitToolCardItem[]>((cards, event, index) => {
    const kind = normalizeToolCardKind(event)
    if (!kind) {
      return cards
    }

    const normalizedText = getAnswerEventDisplayText(event)
    const textForDetail = kind === 'call' ? normalizeLineBreak(event.text || '') : normalizedText
    const text = kind === 'call' ? '' : normalizedText
    const status = normalizeToolCardStatus(event)

    cards.push({
      id: event.id || `tool_card_${index}`,
      kind,
      status,
      title: buildToolCardTitle(event).trim().toLowerCase(),
      detail: buildToolCardDetail(event, textForDetail, kind),
      toolName: event.toolName || (intl.get('dipChatKit.eventRoleTool').d('Tool') as string),
      toolCallId: event.toolCallId || '',
      text,
      inlineText: buildInlineText(text),
      previewText: buildPreviewText(text),
      isError: event.isError,
    })

    return cards
  }, [])
}

export const getToolCardsSummary = (toolCards: DipChatKitToolCardItem[]): string => {
  const toolNames = Array.from(new Set(toolCards.map((card) => card.toolName).filter(Boolean)))
  if (toolNames.length === 0) {
    return ''
  }

  if (toolNames.length <= 3) {
    return toolNames.join(', ')
  }

  const moreCount = toolNames.length - 2
  const moreLabel = intl
    .get('dipChatKit.toolMoreSuffix', { count: moreCount })
    .d(`+${moreCount} more`) as string
  return `${toolNames.slice(0, 2).join(', ')} ${moreLabel}`
}

export const isToolRoleEvent = (event: DipChatKitAnswerEvent): boolean => {
  const role = event.role.trim().toLowerCase()
  return role === 'toolresult' || role === 'tool_result' || role === 'tool'
}
