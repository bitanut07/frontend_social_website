import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AssistantResponse } from '../../types/api'
import {
  AssistantPanel,
  DEFAULT_ASSISTANT_PROMPT,
} from './AssistantPanel'
import type { AssistantChatMessage } from './types'

const answeredResponse: AssistantResponse = {
  status: 'ANSWERED',
  intent: 'COUNT_POSTS_BY_TOPIC',
  answer: 'Hiện có 8 bài viết về chủ đề “Phong cảnh”.',
  provider: 'LOCAL',
  result: {
    count: 8,
    topic: {
      id: '10000000-0000-4000-8000-000000000002',
      slug: 'phong-canh',
      name: 'Phong cảnh',
    },
  },
}

const conversation: AssistantChatMessage[] = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    role: 'USER',
    content: 'Có bao nhiêu bài về phong cảnh?',
  },
  {
    id: '70000000-0000-4000-8000-000000000002',
    role: 'ASSISTANT',
    content: answeredResponse.answer,
    response: answeredResponse,
  },
]

describe('AssistantPanel', () => {
  it('hiển thị lịch sử bằng bong bóng hai phía và gửi bằng nút composer', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <AssistantPanel
        isOpen
        messages={conversation}
        question="Mình muốn hỏi thêm"
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Trợ lý Artly' }),
    ).toBeVisible()
    expect(
      screen.getByRole('log', {
        name: 'Cuộc trò chuyện với Trợ lý Artly',
      }),
    ).toBeVisible()
    expect(
      screen.getByLabelText('Bạn: Có bao nhiêu bài về phong cảnh?'),
    ).toBeVisible()
    expect(screen.getByText(answeredResponse.answer)).toBeVisible()
    expect(screen.getByText('Phong cảnh · 8 bài viết')).toBeVisible()
    expect(screen.getByLabelText('Nhắn tin cho Trợ lý Artly')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('hiển thị câu trả lời model dưới dạng văn bản thuần an toàn', () => {
    const unsafeAnswer =
      'Mình là Artly. <script>alert(1)</script> Bạn thích vẽ gì?'

    render(
      <AssistantPanel
        isOpen
        messages={[
          {
            id: '70000000-0000-4000-8000-000000000003',
            role: 'USER',
            content: 'Bạn là ai?',
          },
          {
            id: '70000000-0000-4000-8000-000000000004',
            role: 'ASSISTANT',
            content: unsafeAnswer,
            response: {
              status: 'ANSWERED',
              intent: 'CHAT',
              answer: unsafeAnswer,
              provider: 'MODEL_LLM',
            },
          },
        ]}
        question=""
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText(unsafeAnswer)).toBeVisible()
    expect(document.querySelector('script')).not.toBeInTheDocument()
  })

  it('đưa gợi ý tiếng Việt vào composer khi hội thoại còn trống', async () => {
    const user = userEvent.setup()
    const onQuestionChange = vi.fn()
    const onUseSuggestion = vi.fn()

    render(
      <AssistantPanel
        isOpen
        messages={[]}
        question=""
        onOpenChange={vi.fn()}
        onQuestionChange={onQuestionChange}
        onSubmit={vi.fn()}
        onUseSuggestion={onUseSuggestion}
      />,
    )

    expect(
      screen.getByText(/Chào bạn! Mình là Artly/),
    ).toBeVisible()
    expect(
      screen.getByText(/bài tập, kiến thức, viết lách, công nghệ/),
    ).toBeVisible()
    await user.click(
      screen.getByRole('button', {
        name: DEFAULT_ASSISTANT_PROMPT,
      }),
    )

    expect(onQuestionChange).toHaveBeenCalledWith(DEFAULT_ASSISTANT_PROMPT)
    expect(onUseSuggestion).toHaveBeenCalledWith(DEFAULT_ASSISTANT_PROMPT)
  })

  it('gửi bằng Enter, còn Shift + Enter dùng để xuống dòng', () => {
    const onSubmit = vi.fn()

    render(
      <AssistantPanel
        isOpen
        messages={[]}
        question="Chào Artly"
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const input = screen.getByLabelText('Nhắn tin cho Trợ lý Artly')
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('hiển thị bong bóng đang nhập và lỗi có thể gửi lại', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const { rerender } = render(
      <AssistantPanel
        isOpen
        isLoading
        messages={[conversation[0]]}
        question=""
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('status', { name: 'Artly đang nhập' }),
    ).toBeVisible()

    rerender(
      <AssistantPanel
        isOpen
        error="Mất kết nối tới Artly."
        messages={[conversation[0]]}
        question=""
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onRetry={onRetry}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Gửi lại' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('mở danh sách lịch sử trên mobile và trả focus về vùng chat sau khi chọn', async () => {
    const user = userEvent.setup()
    const onSelectConversation = vi.fn()

    render(
      <AssistantPanel
        conversations={[
          {
            id: '60000000-0000-4000-8000-000000000001',
            title: 'Cách phối màu nước',
            createdAt: '2026-07-25T10:00:00Z',
            updatedAt: '2026-07-25T10:05:00Z',
          },
        ]}
        isOpen
        messages={[]}
        question=""
        onOpenChange={vi.fn()}
        onQuestionChange={vi.fn()}
        onSelectConversation={onSelectConversation}
        onSubmit={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Lịch sử chat' }))

    expect(
      screen.getByRole('navigation', {
        name: 'Lịch sử trò chuyện với Artly',
      }),
    ).toBeVisible()
    expect(
      screen.queryByRole('log', {
        name: 'Cuộc trò chuyện với Trợ lý Artly',
      }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Cách phối màu nước' }),
    )

    expect(onSelectConversation).toHaveBeenCalledWith(
      '60000000-0000-4000-8000-000000000001',
    )
    expect(
      screen.getByRole('log', {
        name: 'Cuộc trò chuyện với Trợ lý Artly',
      }),
    ).toBeVisible()
  })
})
