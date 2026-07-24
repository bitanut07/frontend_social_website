import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Post, Topic } from '../../types/api'
import { Feed } from './Feed'
import type { FeedProps } from './feedTypes'

const topics: Topic[] = [
  { id: 1, slug: 'thien-nhien', name: 'Thiên nhiên' },
  { id: 2, slug: 'truong-hoc', name: 'Trường học' },
]

const post: Post = {
  id: 101,
  title: 'Bình minh',
  caption: 'Một buổi sáng nhiều màu sắc.',
  imageUrl: 'https://example.com/binh-minh.jpg',
  examName: 'Sắc màu quê hương',
  author: {
    id: 7,
    username: 'minh-anh',
    displayName: 'Minh Anh',
    role: 'STUDENT',
    avatarUrl: null,
  },
  topics: [topics[0]],
  reactionCount: 4,
  viewerHasReacted: false,
  createdAt: '2026-07-24T02:00:00.000Z',
}

function createProps(overrides: Partial<FeedProps> = {}): FeedProps {
  return {
    posts: [post],
    topics,
    selectedTopicId: null,
    onTopicChange: vi.fn(),
    onCreatePost: vi.fn(),
    onToggleReaction: vi.fn(),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('Feed', () => {
  it('hiển thị trạng thái đang tải', () => {
    render(<Feed {...createProps({ isLoading: true })} />)

    expect(
      screen.getByRole('status', { name: 'Đang tải bảng tin' }),
    ).toHaveAttribute('aria-busy', 'true')
    expect(
      screen.queryByRole('article', { name: post.title }),
    ).not.toBeInTheDocument()
  })

  it('hiển thị lỗi và cho phép thử lại', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <Feed
        {...createProps({
          error: 'Máy chủ đang bận.',
          onRetry,
        })}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Máy chủ đang bận.',
    )

    await user.click(
      screen.getByRole('button', { name: 'Tải lại bảng tin' }),
    )

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('hiển thị trạng thái trống theo chủ đề đang chọn', () => {
    render(
      <Feed
        {...createProps({
          posts: [],
          selectedTopicId: topics[0].id,
        })}
      />,
    )

    const emptyState = screen.getByRole('status')
    expect(
      within(emptyState).getByRole('heading', {
        name: 'Chưa có bài vẽ',
      }),
    ).toBeVisible()
    expect(emptyState).toHaveTextContent(
      'Chưa có tác phẩm nào thuộc chủ đề Thiên nhiên.',
    )
  })

  it('cập nhật reaction ngay rồi rollback và báo lỗi khi callback bị reject', async () => {
    const user = userEvent.setup()
    let rejectReaction: ((reason?: unknown) => void) | undefined
    const reactionRequest = new Promise<void>((_, reject) => {
      rejectReaction = reject
    })
    const onToggleReaction = vi.fn(() => reactionRequest)
    render(<Feed {...createProps({ onToggleReaction })} />)

    const reactionButton = screen.getByRole('button', {
      name: `Yêu thích tác phẩm ${post.title}`,
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      '4 lượt yêu thích',
    )
    expect(reactionButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(reactionButton)

    expect(onToggleReaction).toHaveBeenCalledWith(post.id, true)
    expect(reactionButton).toHaveAccessibleName(
      `Yêu thích tác phẩm ${post.title}`,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      '5 lượt yêu thích',
    )
    expect(reactionButton).toHaveAttribute('aria-pressed', 'true')

    await act(async () => {
      rejectReaction?.(new Error('Mất kết nối'))
      await reactionRequest.catch(() => undefined)
    })

    expect(reactionButton).toHaveAccessibleName(
      `Yêu thích tác phẩm ${post.title}`,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      '4 lượt yêu thích',
    )
    expect(reactionButton).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Chưa thể cập nhật lượt yêu thích. Trạng thái cũ đã được khôi phục.',
    )
  })

  it('validate field bắt buộc và gửi dữ liệu đã trim cùng topicIds', async () => {
    const user = userEvent.setup()
    const onCreatePost = vi.fn().mockResolvedValue(undefined)
    render(<Feed {...createProps({ onCreatePost })} />)

    await user.click(
      screen.getByRole('button', { name: /Đăng tác phẩm/ }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Đăng tác phẩm mới',
    })
    const submitButton = within(dialog).getByRole('button', {
      name: 'Đăng tác phẩm',
    })

    await user.click(submitButton)

    expect(onCreatePost).not.toHaveBeenCalled()
    expect(
      within(dialog).getByText('Hãy nhập tiêu đề cho tác phẩm.'),
    ).toBeVisible()
    expect(
      within(dialog).getByText(
        'Hãy viết vài dòng giới thiệu tác phẩm.',
      ),
    ).toBeVisible()
    expect(
      within(dialog).getByText('Hãy nhập đường dẫn ảnh tác phẩm.'),
    ).toBeVisible()
    expect(
      within(dialog).getByText('Chọn ít nhất một chủ đề.'),
    ).toBeVisible()

    await user.type(
      within(dialog).getByLabelText(/^Tiêu đề/),
      '  Mầm xanh tương lai  ',
    )
    await user.type(
      within(dialog).getByLabelText(/^Mô tả/),
      '  Bức tranh về một khu vườn xanh.  ',
    )
    await user.type(
      within(dialog).getByLabelText(/^URL ảnh/),
      '  https://example.com/mam-xanh.jpg  ',
    )
    await user.type(
      within(dialog).getByLabelText(/^Bài thi hoặc cuộc thi/),
      '  Ngày hội sắc màu  ',
    )
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Thiên nhiên' }),
    )
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Trường học' }),
    )
    await user.click(submitButton)

    await waitFor(() => {
      expect(onCreatePost).toHaveBeenCalledWith({
        title: 'Mầm xanh tương lai',
        caption: 'Bức tranh về một khu vườn xanh.',
        imageUrl: 'https://example.com/mam-xanh.jpg',
        examName: 'Ngày hội sắc màu',
        topicIds: [1, 2],
      })
    })
    expect(onCreatePost).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('dialog', { name: 'Đăng tác phẩm mới' }),
    ).not.toBeInTheDocument()
  })
})
