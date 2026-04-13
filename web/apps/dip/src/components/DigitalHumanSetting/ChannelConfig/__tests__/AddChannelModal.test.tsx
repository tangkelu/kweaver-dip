import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddChannelModal from '../AddChannelModal'

vi.mock('@/stores/languageStore', () => ({
  useLanguageStore: () => ({ language: 'zh-CN' }),
}))

describe('DigitalHumanSetting/ChannelConfig/AddChannelModal', () => {
  const mockOnOk = vi.fn()
  const mockOnCancel = vi.fn()

  const labelApiKey = 'digitalHuman.channelModal.labelApiKey'
  const labelApiSecret = 'digitalHuman.channelModal.labelApiSecret'

  it('弹窗打开时默认选中飞书', () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    expect(screen.getByText('digitalHuman.channelModal.feishuBot')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')[0]).toBeChecked()
    expect(screen.getByText('digitalHuman.channelModal.feishuConfigTitle')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('digitalHuman.channelModal.placeholderFeishuAppKey')).toBeInTheDocument()
  })

  it('可以切换选中钉钉', () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    fireEvent.click(screen.getByText('digitalHuman.channelModal.dingtalkBot'))

    expect(screen.getAllByRole('radio')[1]).toBeChecked()
    expect(screen.getByText('digitalHuman.channelModal.dingtalkConfigTitle')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('digitalHuman.channelModal.placeholderDingtalkAppKey')).toBeInTheDocument()
  })

  it('点击取消按钮调用 onCancel', () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    const buttons = screen.getAllByRole('button')
    const cancelBtn = buttons[5]
    fireEvent.click(cancelBtn)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('点击重置按钮清空表单', async () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    let apiKeyInput = screen.getByLabelText(labelApiKey)
    let apiSecretInput = screen.getByLabelText(labelApiSecret)
    fireEvent.change(apiKeyInput, { target: { value: 'test-id' } })
    fireEvent.change(apiSecretInput, { target: { value: 'test-secret' } })

    expect(apiKeyInput).toHaveValue('test-id')
    expect(apiSecretInput).toHaveValue('test-secret')

    const buttons = screen.getAllByRole('button')
    const resetBtn = buttons[4]
    fireEvent.click(resetBtn)

    await waitFor(() => {
      apiKeyInput = screen.getByLabelText(labelApiKey)
      apiSecretInput = screen.getByLabelText(labelApiSecret)
      expect(apiKeyInput).toHaveValue('')
      expect(apiSecretInput).toHaveValue('')
    })
  })

  it('表单为空时点击确定不调用 onOk', async () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    const buttons = screen.getAllByRole('button')
    const okBtn = buttons[3]
    fireEvent.click(okBtn)

    await waitFor(() => {
      expect(mockOnOk).not.toHaveBeenCalled()
    })
  })

  it('填写完整信息后点击确定调用 onOk 传递正确数据', async () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    const apiKeyInput = screen.getByLabelText(labelApiKey)
    const apiSecretInput = screen.getByLabelText(labelApiSecret)
    fireEvent.change(apiKeyInput, { target: { value: 'test-app-id' } })
    fireEvent.change(apiSecretInput, { target: { value: 'test-app-secret' } })

    const buttons = screen.getAllByRole('button')
    const okBtn = buttons[3]
    fireEvent.click(okBtn)

    await waitFor(() => {
      expect(mockOnOk).toHaveBeenCalledWith({
        type: 'feishu',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      })
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  it('钉钉类型填写完整信息后调用 onOk 传递正确数据', async () => {
    render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    fireEvent.click(screen.getByText('digitalHuman.channelModal.dingtalkBot'))
    const apiKeyInput = screen.getByLabelText(labelApiKey)
    const apiSecretInput = screen.getByLabelText(labelApiSecret)
    fireEvent.change(apiKeyInput, { target: { value: 'dingtalk-id' } })
    fireEvent.change(apiSecretInput, { target: { value: 'dingtalk-secret' } })

    const buttons = screen.getAllByRole('button')
    const okBtn = buttons[3]
    fireEvent.click(okBtn)

    await waitFor(() => {
      expect(mockOnOk).toHaveBeenCalledWith({
        type: 'dingtalk',
        appId: 'dingtalk-id',
        appSecret: 'dingtalk-secret',
      })
    })
  })

  it('关闭弹窗时重置选中和表单', () => {
    const { rerender } = render(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    fireEvent.click(screen.getByText('digitalHuman.channelModal.dingtalkBot'))
    let apiKeyInput = screen.getByLabelText(labelApiKey)
    fireEvent.change(apiKeyInput, { target: { value: 'test-id' } })

    rerender(<AddChannelModal open={false} onOk={mockOnOk} onCancel={mockOnCancel} />)
    rerender(<AddChannelModal open onOk={mockOnOk} onCancel={mockOnCancel} />)

    apiKeyInput = screen.getByLabelText(labelApiKey)
    expect(screen.getAllByRole('radio')[0]).toBeChecked()
    expect(apiKeyInput).toHaveValue('')
  })
})
