import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Message, User } from '../../types/api'
import { ChatPanel } from './ChatPanel'

const USER_ID_1 = '00000000-0000-4000-8000-000000000001'
const USER_ID_2 = '00000000-0000-4000-8000-000000000002'
const MESSAGE_ID_1 = '50000000-0000-4000-8000-000000000001'
const MESSAGE_ID_2 = '50000000-0000-4000-8000-000000000002'
const MESSAGE_ID_3 = '50000000-0000-4000-8000-000000000003'

const student: User = {
  id: USER_ID_1,
  username: 'linh.ve',
  displayName: 'Nguyễn Gia Linh',
  role: 'STUDENT',
  isSuperAdmin: false,
}

const teacher: User = {
  id: USER_ID_2,
  username: 'co.mai',
  displayName: 'Cô Mai Anh',
  role: 'TEACHER',
  isSuperAdmin: false,
}

const messages: Message[] = [
  {
    id: MESSAGE_ID_2,
    sender: student,
    receiver: teacher,
    body: 'Em cảm ơn cô ạ.',
    createdAt: '2026-07-24T09:12:00+07:00',
  },
  {
    id: MESSAGE_ID_1,
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

  it('ẩn attachment khi data backend không hỗ trợ Storage', () => {
    render(
      <ChatPanel
        allowImageAttachments={false}
        currentUser={student}
        draft=""
        messages={messages}
        peers={[student, teacher]}
        selectedPeerId={teacher.id}
        onDraftChange={vi.fn()}
        onImageChange={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Đính kèm ảnh' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Chọn ảnh để gửi'),
    ).not.toBeInTheDocument()
  })

  it('hiển thị ảnh trong hội thoại và cho gửi ảnh không cần nội dung chữ', async () => {
    const user = userEvent.setup()
    const imageFile = new File(['fake-image'], 'bai-ve.png', {
      type: 'image/png',
    })
    const onImageChange = vi.fn()
    const onSend = vi.fn()

    render(
      <ChatPanel
        currentUser={student}
        draft=""
        imageFile={imageFile}
        messages={[
          {
            id: MESSAGE_ID_3,
            sender: teacher,
            receiver: student,
            body: 'Ảnh bài em gửi đây nhé.',
            attachments: [
              {
                id: '90000000-0000-4000-8000-000000000001',
                kind: 'IMAGE',
                url: 'https://images.example.com/bai-ve.png',
                originalFileName: 'bai-ve.png',
              },
            ],
            createdAt: '2026-07-24T09:14:00+07:00',
          },
        ]}
        peers={[student, teacher]}
        selectedPeerId={teacher.id}
        onDraftChange={vi.fn()}
        onImageChange={onImageChange}
        onSend={onSend}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Ảnh đã gửi: bai-ve.png' }),
    ).toHaveAttribute('src', 'https://images.example.com/bai-ve.png')
    expect(screen.getByText('bai-ve.png')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(onSend).toHaveBeenCalledOnce()

    const nextImage = new File(['next-image'], 'phac-thao.webp', {
      type: 'image/webp',
    })
    await user.upload(screen.getByLabelText('Chọn ảnh để gửi'), nextImage)

    expect(onImageChange).toHaveBeenCalledWith(nextImage)
  })
})
