import { Button, Checkbox, message, Spin } from 'antd'
import { memo, useEffect, useMemo, useState } from 'react'
import intl from 'react-intl-universal'
import {
  type BuiltInDigitalHuman,
  createBuiltInDigitalHuman,
  getBuiltInDigitalHumanList,
} from '@/apis/dip-studio/digital-human'
import defaultDigitalHumanAvatar from '@/assets/images/bkn-creator.png'
import Empty from '@/components/Empty'
import { resolveDigitalHumanIconSrc } from '@/utils/digital-human/resolveDigitalHumanIcon'

type SelectPresetDigitalHumanStepProps = {
  onSkip: () => void
  onConfirmSuccess: () => void
}

const SelectPresetDigitalHumanStep = ({
  onSkip,
  onConfirmSuccess,
}: SelectPresetDigitalHumanStepProps) => {
  const [selected, setSelected] = useState(true)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<BuiltInDigitalHuman[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setListLoading(true)
      setListError(null)
      try {
        const data = await getBuiltInDigitalHumanList()
        if (cancelled) return
        setTemplates(Array.isArray(data) ? data : [])
      } catch (error: any) {
        if (cancelled) return
        setTemplates([])
        setListError(error?.description || intl.get('initialConfiguration.selectPreset.listLoadFailed'))
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const first = templates[0]
  const avatarSrc = useMemo(
    () => resolveDigitalHumanIconSrc(first?.icon_id, defaultDigitalHumanAvatar),
    [first?.icon_id],
  )

  const canSubmit = selected && Boolean(first) && !listLoading && listError === null
  const primaryDisabled = !canSubmit

  const handleConfirm = async () => {
    if (!first || primaryDisabled) return
    setCreating(true)
    try {
      await createBuiltInDigitalHuman(first.id)
      onConfirmSuccess()
    } catch (e: unknown) {
      const desc = e && typeof e === 'object' && 'description' in e ? String(e.description) : ''
      message.error(desc || intl.get('initialConfiguration.selectPreset.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-full flex flex-col">
      <div className="font-bold text-[--dip-text-color] text-[26px]">
        {intl.get('initialConfiguration.selectPreset.title')}
      </div>
      <div className="text-black/50 mt-3">
        {intl.get('initialConfiguration.selectPreset.subtitle')}
      </div>

      <div className="flex flex-col items-center justify-center min-h-[208px]">
        {listLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[208px]">
            <Spin />
          </div>
        ) : listError ? (
          <Empty
            title={intl.get('initialConfiguration.selectPreset.loadFailedTitle')}
            desc={listError}
            type="failed"
          />
        ) : !first ? (
          <Empty title={intl.get('initialConfiguration.selectPreset.emptyTitle')} />
        ) : (
          <div className="self-center">
            <button
              type="button"
              className="flex flex-col items-center justify-center mt-4 w-[264px] bg-black/[0.02] rounded-md px-5 py-4 text-left relative hover:bg-black/[0.03] transition-colors"
              onClick={() => setSelected((v) => !v)}
            >
              <div className="absolute top-3 right-3">
                <Checkbox checked={selected} onChange={(e) => setSelected(e.target.checked)} />
              </div>

              <div className="w-[64px] h-[64px] rounded-full overflow-hidden flex items-center justify-center">
                <img src={avatarSrc} alt={first.name} className="w-full h-full object-cover" />
              </div>

              <div className="text-base font-medium text-[--dip-text-color] mt-1">{first.name}</div>
              <div className="mt-2 text-black/65 leading-6 text-center">
                {first.description?.trim()}
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <Button onClick={onSkip} style={{ width: '88px' }}>
          {intl.get('initialConfiguration.selectPreset.skip')}
        </Button>
        <Button
          type="primary"
          onClick={() => void handleConfirm()}
          disabled={primaryDisabled}
          loading={creating}
        >
          {intl.get('initialConfiguration.selectPreset.installNow')}
        </Button>
      </div>
    </div>
  )
}

export default memo(SelectPresetDigitalHumanStep)
