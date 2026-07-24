import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AssistantResponse } from '../../types/api'
import {
  AssistantPanel,
  DEFAULT_ASSISTANT_PROMPT,
} from './AssistantPanel'

const answeredResponse: AssistantResponse = {
  status: 'ANSWERED',
  intent: 'COUNT_POSTS_BY_TOPIC',
  answer: 'Hiện có 8 bài viết về chủ đề “Phong cảnh”.',
  provider: 'LOCAL',
  result: {
    count: 8,
    topic: {
      id: 2,
      slug: 'phong-canh',
      name: 'Phong cảnh',
    },
  },
}

describe('AssistantPanel', () => {
  it('hiển thị câu trả lời dạng văn bản và gửi câu hỏi', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AssistantPanel
        isOpen
        question="Có bao nhiêu bài về phong cảnh?"
        response={answeredResponse}
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Trợ lý thống kê' }),
    ).toBeVisible()
    expect(screen.getByText(answeredResponse.answer)).toBeVisible()
    expect(screen.getByLabelText('Câu hỏi của bạn')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('đưa gợi ý tiếng Việt vào callback được điều khiển từ cha', async () => {
    const user = userEvent.setup()
    const onQuestionChange = vi.fn()
    const onUseSuggestion = vi.fn()

    render(
      <AssistantPanel
        isOpen
        question=""
        response={null}
        onOpenChange={vi.fn()}
        onQuestionChange={onQuestionChange}
        onSubmit={vi.fn()}
        onUseSuggestion={onUseSuggestion}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `“${DEFAULT_ASSISTANT_PROMPT}”`,
      }),
    )

    expect(onQuestionChange).toHaveBeenCalledWith(DEFAULT_ASSISTANT_PROMPT)
    expect(onUseSuggestion).toHaveBeenCalledWith(DEFAULT_ASSISTANT_PROMPT)
  })
})
