import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Form } from 'antd'
import { describe, expect, it, vi } from 'vitest'

import NameDescriptionFields from '../NameDescriptionFields'

vi.mock('@/stores/languageStore', () => ({
  useLanguageStore: () => ({ language: 'zh-CN' }),
}))

const renderWithForm = () => {
  return render(
    <Form>
      <NameDescriptionFields />
      <button type="submit">提交</button>
    </Form>,
  )
}

describe('DigitalHumanSetting/BasicSetting/NameDescriptionFields', () => {
  it('渲染名称和简介输入框，并带正确长度限制', () => {
    renderWithForm()

    const nameInput = screen.getByPlaceholderText('digitalHuman.basic.namePlaceholder')
    const descInput = screen.getByPlaceholderText('digitalHuman.basic.bioPlaceholder')

    expect(nameInput).toHaveAttribute('maxlength', '128')
    expect(descInput).toHaveAttribute('maxlength', '400')
  })

  it('名称为空时提交会出现必填校验', async () => {
    renderWithForm()
    fireEvent.click(screen.getByRole('button', { name: '提交' }))

    await waitFor(() => {
      expect(screen.getByText('digitalHuman.setting.nameRequired')).toBeInTheDocument()
    })
  })
})
