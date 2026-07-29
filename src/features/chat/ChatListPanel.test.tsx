import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Message, User } from '../../types/api'
import { ChatListPanel } from './ChatListPanel'

const currentUser: User = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'minh.an',
  displayName: 'Trần Minh An',
  role: 'STUDENT',
  isSuperAdmin: false,
}

const olderPeer: User = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'co.lan',
  displayName: 'Cô Lan',
  role: 'TEACHER',
  isSuperAdmin: false,
}

const newerPeer: User = {
  id: '00000000-0000-4000-8000-000000000003',
  username: 'thu.ha',
  displayName: 'Lê Thu Hà',
  role: 'STUDENT',
  isSuperAdmin: false,
}

const olderMessage: Message = {
  id: '50000000-0000-4000-8000-000000000001',
  sender: currentUser,
  receiver: olderPeer,
  body: 'Tin cũ hơn',
  createdAt: '2026-07-29T08:00:00.000Z',
}

const newIncomingMessage: Message = {
  id: '50000000-0000-4000-8000-000000000002',
  sender: newerPeer,
  receiver: currentUser,
  body: 'Tin nhắn mới',
  createdAt: '2026-07-29T09:00:00.000Z',
}

describe('ChatListPanel', () => {
  it('đưa hội thoại mới lên đầu và bỏ khỏi bộ lọc chưa đọc sau khi đã đọc', async () => {
    const user = userEvent.setup()
    const props = {
      currentUser,
      peers: [olderPeer, newerPeer],
      messages: [olderMessage, newIncomingMessage],
      selectedPeerId: null,
      onSelectPeer: vi.fn(),
    }
    const { rerender } = render(
      <ChatListPanel {...props} readMessageIds={new Set()} />,
    )

    const list = screen.getByRole('list', { name: 'Danh sách người chat' })
    const conversations = within(list).getAllByRole('button')
    expect(conversations[0]).toHaveAccessibleName(
      `Mở chat với ${newerPeer.displayName}`,
    )
    expect(conversations[0]).toHaveAttribute('data-unread', 'true')
    expect(
      within(conversations[0]).getByLabelText('Có tin nhắn chưa đọc'),
    ).toBeVisible()

    rerender(
      <ChatListPanel
        {...props}
        readMessageIds={new Set([newIncomingMessage.id])}
      />,
    )

    expect(conversations[0]).toHaveAttribute('data-unread', 'false')
    expect(
      screen.queryByLabelText('Có tin nhắn chưa đọc'),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chưa đọc' }))
    expect(
      screen.getByText('Không tìm thấy cuộc trò chuyện'),
    ).toBeVisible()
  })
})
