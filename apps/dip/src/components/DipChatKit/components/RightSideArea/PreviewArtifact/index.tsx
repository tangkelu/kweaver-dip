import { Spin } from 'antd'
import clsx from 'clsx'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import intl from 'react-intl-universal'
import { getSessionArchiveSubpath } from '../../../apis'
import styles from './index.module.less'
import type { PreviewArtifactProps } from './types'

type ArtifactPreviewMode = 'text' | 'html' | 'image' | 'pdf'

interface ArtifactPreviewState {
  loading: boolean
  error: string
  mode: ArtifactPreviewMode
  textContent: string
  blobUrl: string
}

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json', 'log', 'csv', 'xml', 'yaml', 'yml'])
const HTML_EXTENSIONS = new Set(['html', 'htm'])
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const PDF_EXTENSIONS = new Set(['pdf'])

const getFileExtension = (fileName: string): string => {
  const normalizedFileName = fileName.trim()
  const dotIndex = normalizedFileName.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return normalizedFileName.slice(dotIndex + 1).toLowerCase()
}

const resolvePreviewMode = (fileName: string): ArtifactPreviewMode => {
  const ext = getFileExtension(fileName)
  if (HTML_EXTENSIONS.has(ext)) return 'html'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (PDF_EXTENSIONS.has(ext)) return 'pdf'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  return 'text'
}

const getBlobMimeType = (mode: ArtifactPreviewMode, fileName: string): string => {
  if (mode === 'image') {
    const ext = getFileExtension(fileName)
    if (ext === 'svg') return 'image/svg+xml'
    if (ext === 'png') return 'image/png'
    if (ext === 'gif') return 'image/gif'
    if (ext === 'webp') return 'image/webp'
    return 'image/jpeg'
  }
  if (mode === 'pdf') return 'application/pdf'
  return 'application/octet-stream'
}

const createInitialState = (): ArtifactPreviewState => ({
  loading: true,
  error: '',
  mode: 'text',
  textContent: '',
  blobUrl: '',
})

const PreviewArtifact: React.FC<PreviewArtifactProps> = ({ payload }) => {
  const [state, setState] = useState<ArtifactPreviewState>(createInitialState)

  const artifactInfo = payload.artifact

  const previewMeta = useMemo(() => {
    if (!artifactInfo) return null
    const sessionKey = artifactInfo.sessionKey.trim()
    const subpath = artifactInfo.subpath.trim()
    const fileName = (artifactInfo.fileName || artifactInfo.subpath || '').trim()
    if (!sessionKey || !subpath || !fileName) return null

    return {
      sessionKey,
      subpath,
      fileName,
      mode: resolvePreviewMode(fileName),
    }
  }, [artifactInfo])

  useEffect(() => {
    if (!previewMeta) {
      setState({
        loading: false,
        error: intl.get('dipChatKit.artifactMetaMissing').d('缺少归档文件预览所需信息') as string,
        mode: 'text',
        textContent: '',
        blobUrl: '',
      })
      return undefined
    }

    let disposed = false
    let localBlobUrl = ''

    setState((prevState) => {
      if (prevState.blobUrl) {
        URL.revokeObjectURL(prevState.blobUrl)
      }
      return {
        loading: true,
        error: '',
        mode: previewMeta.mode,
        textContent: '',
        blobUrl: '',
      }
    })

    const loadPreview = async () => {
      try {
        if (previewMeta.mode === 'html' || previewMeta.mode === 'text') {
          const response = await getSessionArchiveSubpath(previewMeta.sessionKey, previewMeta.subpath, {
            responseType: 'text',
          })
          const textContent = typeof response === 'string' ? response : ''
          if (disposed) return
          setState({
            loading: false,
            error: '',
            mode: previewMeta.mode,
            textContent,
            blobUrl: '',
          })
          return
        }

        const response = await getSessionArchiveSubpath(previewMeta.sessionKey, previewMeta.subpath, {
          responseType: 'arraybuffer',
        })
        if (!(response instanceof ArrayBuffer)) {
          throw new Error(
            intl.get('dipChatKit.archiveFileTypeMismatch').d('归档文件返回类型异常') as string,
          )
        }

        localBlobUrl = URL.createObjectURL(
          new Blob([response], { type: getBlobMimeType(previewMeta.mode, previewMeta.fileName) }),
        )
        if (disposed) {
          URL.revokeObjectURL(localBlobUrl)
          return
        }

        setState({
          loading: false,
          error: '',
          mode: previewMeta.mode,
          textContent: '',
          blobUrl: localBlobUrl,
        })
      } catch (error) {
        const errorMessage =
          error instanceof Error && error.message
            ? error.message
            : (intl.get('dipChatKit.archivePreviewLoadFailed').d('归档文件加载失败') as string)

        if (disposed) return
        if (localBlobUrl) {
          URL.revokeObjectURL(localBlobUrl)
          localBlobUrl = ''
        }
        setState({
          loading: false,
          error: errorMessage,
          mode: previewMeta.mode,
          textContent: '',
          blobUrl: '',
        })
      }
    }

    void loadPreview()

    return () => {
      disposed = true
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl)
      }
    }
  }, [previewMeta])

  if (state.loading) {
    return (
      <div className={clsx('PreviewArtifact', styles.root)}>
        <div className={styles.center}>
          <Spin />
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className={clsx('PreviewArtifact', styles.root)}>
        <div className={styles.errorText}>{state.error}</div>
      </div>
    )
  }

  if (state.mode === 'html') {
    return (
      <div className={clsx('PreviewArtifact', styles.root)}>
        <iframe
          className={styles.htmlFrame}
          title={payload.title || previewMeta?.fileName || 'artifact-html-preview'}
          srcDoc={state.textContent}
        />
      </div>
    )
  }

  if (state.mode === 'image') {
    return (
      <div className={clsx('PreviewArtifact', styles.root)}>
        <img
          className={styles.imagePreview}
          src={state.blobUrl}
          alt={previewMeta?.fileName || (intl.get('dipChatKit.artifactImage').d('归档图片') as string)}
        />
      </div>
    )
  }

  if (state.mode === 'pdf') {
    return (
      <div className={clsx('PreviewArtifact', styles.root)}>
        <iframe
          className={styles.pdfFrame}
          title={payload.title || previewMeta?.fileName || 'artifact-pdf-preview'}
          src={state.blobUrl}
        />
      </div>
    )
  }

  return (
    <div className={clsx('PreviewArtifact', styles.root)}>
      <pre className={styles.textContent}>{state.textContent}</pre>
    </div>
  )
}

export default PreviewArtifact
