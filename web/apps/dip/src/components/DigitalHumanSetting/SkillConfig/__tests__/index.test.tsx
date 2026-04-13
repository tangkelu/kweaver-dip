vi.mock('../index.module.less', () => ({
  default: {},
}))

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDigitalHumanStore } from '../../digitalHumanStore'
import SkillConfig from '../index'

const mockDeleteSkill = vi.fn()
const mockUpdateSkills = vi.fn()

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

vi.mock('../SelectSkillModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="select-skill-modal" /> : null,
}))

vi.mock('../AddSkillDrawer', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="add-skill-drawer" /> : null),
}))

vi.mock('@/components/IconFont', () => ({
  default: () => <span data-testid="icon-font" />,
}))

const mockedUseDigitalHumanStore = vi.mocked(useDigitalHumanStore)

const addSkillBtnName = 'digitalHuman.skill.addSkillButton'

describe('DigitalHumanSetting/SkillConfig', () => {
  it('应该正确渲染空状态，显示添加技能按钮', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)

    expect(screen.getByText('digitalHuman.setting.menuSkill')).toBeInTheDocument()
    expect(screen.getByText('digitalHuman.skill.sectionDesc')).toBeInTheDocument()
    expect(screen.getByText('digitalHuman.skill.emptyNoSkills')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: addSkillBtnName })).toBeInTheDocument()
  })

  it('只读模式空状态不显示添加按钮', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig readonly />)

    expect(screen.getByText('digitalHuman.skill.emptyNoSkills')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: addSkillBtnName })).not.toBeInTheDocument()
  })

  it('已有技能时应该正确渲染表格', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [
        {
          name: '产品问答',
          description: '回答产品相关问题',
          built_in: false,
          type: 'official',
        },
      ],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)

    expect(screen.getByText('产品问答')).toBeInTheDocument()
    expect(screen.getByText('回答产品相关问题')).toBeInTheDocument()
    expect(screen.getByText('@digitalHuman.skill.tagOfficial')).toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: addSkillBtnName })).toBeInTheDocument()
  })

  it('内置技能删除按钮禁用', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [
        {
          name: '基础能力',
          description: '数字员工基本能力',
          built_in: true,
          type: 'official',
        },
      ],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)

    const buttons = screen.getAllByRole('button')
    const deleteBtn = buttons.find((btn) => !btn.textContent?.trim())
    expect(deleteBtn).toBeDisabled()
  })

  it('只读模式不显示操作列', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [
        {
          name: '产品问答',
          description: '回答产品相关问题',
          built_in: false,
          type: 'official',
        },
      ],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig readonly />)

    expect(screen.getByText('产品问答')).toBeInTheDocument()
    expect(screen.queryByText('digitalHuman.common.columnAction')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: addSkillBtnName })).not.toBeInTheDocument()
  })

  it('自定义技能显示正确标签', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [
        {
          name: '我的技能',
          description: '自定义技能',
          built_in: false,
          type: 'openclaw-managed',
        },
      ],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)

    expect(screen.getByText('@digitalHuman.skill.tagCustom')).toBeInTheDocument()
  })

  it('点击添加技能按钮应该打开弹窗', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [
        {
          name: '产品问答',
          description: '回答产品相关问题',
          built_in: false,
          type: 'official',
        },
      ],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)
    fireEvent.click(screen.getByRole('button', { name: addSkillBtnName }))

    expect(screen.getByTestId('select-skill-modal')).toBeInTheDocument()
  })

  it('空状态下点击添加技能应该打开弹窗', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)
    fireEvent.click(screen.getByRole('button', { name: addSkillBtnName }))

    expect(screen.getByTestId('select-skill-modal')).toBeInTheDocument()
  })

  it('点击删除按钮应该调用 deleteSkill', () => {
    mockedUseDigitalHumanStore.mockReturnValue({
      skills: [
        {
          name: '产品问答',
          description: '回答产品相关问题',
          built_in: false,
          type: 'official',
        },
      ],
      deleteSkill: mockDeleteSkill,
      updateSkills: mockUpdateSkills,
      digitalHumanId: 'test-id',
    })

    render(<SkillConfig />)
    const buttons = screen.getAllByRole('button')
    const removeBtn = buttons.find((btn) => !btn.textContent?.trim())
    if (removeBtn) {
      fireEvent.click(removeBtn)
    }

    expect(mockDeleteSkill).toHaveBeenCalledWith('产品问答')
  })
})
