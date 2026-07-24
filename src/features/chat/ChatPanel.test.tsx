import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Message, User } from '../../types/api'
import { ChatPanel } from './ChatPanel'

const student: User = {
  id: 1,
  username: 'linh.ve',
  displayName: 'Nguyễn Gia Linh',
  role: 'STUDENT',
}

const teacher: User = {
  id: 2,
  username: 'co.mai',
  displayName: 'Cô Mai Anh',
  role: 'TEACHER',
}

const messages: Message[] = [
  {
    id: 2,
    sender: student,
    receiver: teacher,
    body: 'Em cảm ơn cô ạ.',
    createdAt: '2026-07-24T09:12:00+07:00',
  },
  {
    id: 1,
    sender: teacher,
    receiver: student,
    body: 'Em thử tăng độ tương phản nhé.',
    createdAt: '2026-07-24T09:10:00+07:00',
  },
]

describe('ChatPanel', () => {
  it('hiển thị tin nhắn theo thứ tự thời gian và gửi draft hợp lệ', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()

    render(
      <ChatPanel
        currentUser={student}
        draft="Em sẽ thử ạ."
        messages={messages}
        peers={[student, teacher]}
        selectedPeerId={teacher.id}
        onDraftChange={vi.fn()}
        onSelectPeer={vi.fn()}
        onSend={onSend}
      />,
    )

    const conversation = screen.getByRole('list', {
      name: `Cuộc trò chuyện với ${teacher.displayName}`,
    })
    const items = within(conversation).getAllByRole('listitem')

    expect(items[0]).toHaveTextContent('Em thử tăng độ tương phản nhé.')
    expect(items[1]).toHaveTextContent('Em cảm ơn cô ạ.')

    await user.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(onSend).toHaveBeenCalledOnce()
  })

  it('cho phép thử tải lại sau lỗi', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(
      <ChatPanel
        currentUser={student}
        draft=""
        error="Mất kết nối tới máy chủ."
        messages={[]}
        peers={[teacher]}
        selectedPeerId={teacher.id}
        onDraftChange={vi.fn()}
        onRetry={onRetry}
        onSelectPeer={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Mất kết nối tới máy chủ.',
    )
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('giữ lịch sử khi gửi lỗi và hiển thị lỗi cạnh ô soạn tin', () => {
    render(
      <ChatPanel
        currentUser={student}
        draft="Tin nhắn chưa gửi"
        messages={messages}
        peers={[student, teacher]}
        selectedPeerId={teacher.id}
        sendError="Chưa thể gửi tin nhắn."
        onDraftChange={vi.fn()}
        onSelectPeer={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('list', {
        name: `Cuộc trò chuyện với ${teacher.displayName}`,
      }),
    ).toHaveTextContent('Em cảm ơn cô ạ.')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chưa thể gửi tin nhắn.',
    )
  })
})
