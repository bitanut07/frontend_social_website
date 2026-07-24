import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const apiMock = vi.hoisted(() => ({
  listUsers: vi.fn(),
  listTopics: vi.fn(),
  listPosts: vi.fn(),
  createPost: vi.fn(),
  setPostReaction: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  askAssistant: vi.fn(),
}))

vi.mock('./lib/api', () => ({
  api: apiMock,
}))

const users = [
  {
    id: 1,
    username: 'minh.an',
    displayName: 'Trần Minh An',
    role: 'STUDENT' as const,
  },
  {
    id: 2,
    username: 'co.lan',
    displayName: 'Cô Nguyễn Hoài Lan',
    role: 'TEACHER' as const,
  },
]

const topics = [
  {
    id: 3,
    slug: 'moi-truong',
    name: 'Môi trường',
    aliases: ['bảo vệ môi trường'],
  },
]

const firstPost = {
  id: 1,
  title: 'Mầm xanh tương lai',
  caption: 'Bài thi vẽ về môi trường.',
  imageUrl: 'http://localhost:5173/demo-art/mam-xanh-tuong-lai.png',
  examName: 'Sắc màu xanh 2026',
  author: users[0],
  topics,
  reactionCount: 2,
  viewerHasReacted: false,
  createdAt: '2026-07-24T08:30:00+07:00',
}

const emptyPagination = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.listUsers.mockResolvedValue({
      data: users,
      pagination: { ...emptyPagination, totalItems: users.length, totalPages: 1 },
    })
    apiMock.listTopics.mockResolvedValue({
      data: topics,
      pagination: { ...emptyPagination, totalItems: topics.length, totalPages: 1 },
    })
    apiMock.listPosts.mockResolvedValue({
      data: [firstPost],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    })
    apiMock.listMessages.mockResolvedValue({
      data: [],
      pagination: { ...emptyPagination, pageSize: 50 },
    })
  })

  it('tải bảng tin theo tài khoản demo và cho phép đổi tài khoản', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Artly' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Mầm xanh tương lai')).toBeVisible()
    expect(apiMock.listPosts).toHaveBeenCalledWith(1, {
      page: 1,
      pageSize: 10,
    })

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Tài khoản demo' }),
      '2',
    )

    await waitFor(() => {
      expect(apiMock.listPosts).toHaveBeenLastCalledWith(2, {
        page: 1,
        pageSize: 10,
      })
    })
  })

  it('gửi câu hỏi đến trợ lý và hiển thị câu trả lời thống kê', async () => {
    const user = userEvent.setup()
    apiMock.askAssistant.mockResolvedValue({
      status: 'ANSWERED',
      intent: 'COUNT_POSTS_BY_TOPIC',
      answer: 'Hiện có 1 bài viết về chủ đề “Môi trường”.',
      provider: 'LOCAL',
      result: { count: 1, topic: topics[0] },
    })

    render(<App />)
    await screen.findByText('Mầm xanh tương lai')

    await user.click(
      screen.getByRole('button', { name: 'Mở trợ lý thống kê' }),
    )
    await user.type(
      screen.getByLabelText('Câu hỏi của bạn'),
      'Có bao nhiêu bài về chủ đề môi trường?',
    )
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(
      await screen.findByText('Hiện có 1 bài viết về chủ đề “Môi trường”.'),
    ).toBeVisible()
    expect(apiMock.askAssistant).toHaveBeenCalledWith(
      1,
      'Có bao nhiêu bài về chủ đề môi trường?',
    )
  })
})
