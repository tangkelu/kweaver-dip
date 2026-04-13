import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDigitalHumanStore } from '../../digitalHumanStore'
import ChannelConfig from '../index'

const mockUpdateChannel = vi.fn()
const mockDeleteChannel = vi.fn()

vi.mock('@/stores/languageStore', () => ({
  useLanguageStore: () => ({ language: 'zh-CN' }),
}))

vi.mock('../../digitalHumanStore', () => ({
  useDigitalHumanStore: vi.fn(),
}))

vi.mock('@/components/ScrollBarContainer', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-bar-container">{children}</div>
  ),
}))

vi.mock('../AddChannelModal', () => ({
  default: () => <div data-testid="add-channel-modal" />,
}))

vi.mock('@/components/IconFont', () => ({
  default: () => <span />,
}))

vi.mock('@/assets/icons/dingding.svg', () => ({
  default: '',
}))

vi.mock('@/assets/icons/feishu.svg', () => ({
  default: '',
}))

const mockedUseDigitalHumanStore = vi.mocked(useDigitalHumanStore)

const addChannelBtnName = 'digitalHuman.channel.addButton'

describe('DigitalHumanSetting/ChannelConfig', () => {
  it('应该正确渲染空状态，显示添加按钮', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: null,
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig />)

    expect(screen.getByText('digitalHuman.setting.menuChannel')).toBeInTheDocument()
    expect(screen.getByText('digitalHuman.channel.sectionDesc')).toBeInTheDocument()
    expect(screen.getByText('digitalHuman.channel.emptyNoChannel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: addChannelBtnName })).toBeInTheDocument()
  })

  it('只读模式不显示添加按钮', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: null,
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig readonly />)

    expect(screen.queryByRole('button', { name: addChannelBtnName })).not.toBeInTheDocument()
  })

  it('已有通道时应该正确渲染表格', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: {
        type: 'feishu',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      },
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig />)

    expect(screen.getByText('digitalHuman.channel.typeFeishu')).toBeInTheDocument()
    expect(screen.getByText('digitalHuman.channel.descFeishu')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(screen.getByRole('button', { name: addChannelBtnName })).toBeInTheDocument()
  })

  it('只读模式不显示操作列', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: {
        type: 'feishu',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      },
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig readonly />)

    expect(screen.getByText('digitalHuman.channel.typeFeishu')).toBeInTheDocument()
    expect(screen.queryByText('digitalHuman.common.columnAction')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /digitalHuman.common.remove/ })).not.toBeInTheDocument()
  })

  it('钉钉类型应该显示正确标签和描述', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: {
        type: 'dingtalk',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      },
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig />)

    expect(screen.getByText('digitalHuman.channel.typeDingtalk')).toBeInTheDocument()
    expect(screen.getByText('digitalHuman.channel.descDingtalk')).toBeInTheDocument()
  })

  it('点击添加通道按钮应该打开弹窗', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: {
        type: 'feishu',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      },
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig />)
    fireEvent.click(screen.getByRole('button', { name: addChannelBtnName }))

    expect(screen.getByTestId('add-channel-modal')).toBeInTheDocument()
  })

  it('点击删除按钮应该调用 deleteChannel', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      channel: {
        type: 'feishu',
        appId: 'test-app-id',
        appSecret: 'test-app-secret',
      },
      updateChannel: mockUpdateChannel,
      deleteChannel: mockDeleteChannel,
    })

    render(<ChannelConfig />)
    const buttons = screen.getAllByRole('button')
    const removeBtn = buttons.find((btn) => !btn.textContent)
    if (removeBtn === undefined) {
      throw new Error('expected remove button in operation column')
    }
    fireEvent.click(removeBtn)

    expect(mockDeleteChannel).toHaveBeenCalled()
  })
})
