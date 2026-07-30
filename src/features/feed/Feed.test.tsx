import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CreatePostCommentInput,
  PaginationParams,
  Post,
  PostComment,
  PostCommentListResponse,
  ResourceId,
  Topic,
} from '../../types/api'
import { Feed } from './Feed'
import type { FeedProps } from './feedTypes'

const USER_ID_1 = '00000000-0000-4000-8000-000000000001'
const USER_ID_2 = '00000000-0000-4000-8000-000000000002'
const TOPIC_ID_1 = '10000000-0000-4000-8000-000000000001'
const TOPIC_ID_2 = '10000000-0000-4000-8000-000000000002'
const POST_ID_1 = '20000000-0000-4000-8000-000000000001'
const COMMENT_ID_1 = '30000000-0000-4000-8000-000000000001'
const COMMENT_ID_2 = '30000000-0000-4000-8000-000000000002'
const COMMENT_ID_3 = '30000000-0000-4000-8000-000000000003'

const topics: Topic[] = [
  { id: TOPIC_ID_1, slug: 'thien-nhien', name: 'Thiên nhiên' },
  { id: TOPIC_ID_2, slug: 'truong-hoc', name: 'Trường học' },
]

const post: Post = {
  id: POST_ID_1,
  title: 'Bình minh',
  caption: 'Một buổi sáng nhiều màu sắc.',
  imageUrl: 'https://example.com/binh-minh.jpg',
  examName: 'Sắc màu quê hương',
  author: {
    id: USER_ID_1,
    username: 'minh-anh',
    displayName: 'Minh Anh',
    role: 'STUDENT',
    isSuperAdmin: false,
    avatarUrl: null,
  },
  topics: [topics[0]],
  reactionCount: 4,
  commentCount: 2,
  viewerHasReacted: false,
  createdAt: '2026-07-24T02:00:00.000Z',
}

interface CommentFeedCallbacks {
  onListPostComments: (
    postId: ResourceId,
    params?: PaginationParams,
    signal?: AbortSignal,
  ) => Promise<PostCommentListResponse>
  onCreatePostComment: (
    postId: ResourceId,
    input: CreatePostCommentInput,
  ) => Promise<PostComment>
  onDeletePostComment: (
    postId: ResourceId,
    commentId: ResourceId,
  ) => Promise<void>
}

type TestFeedProps = FeedProps & CommentFeedCallbacks

function createProps(
  overrides: Partial<TestFeedProps> = {},
): TestFeedProps {
  return {
    posts: [post],
    topics,
    selectedTopicId: null,
    currentUserId: USER_ID_1,
    onTopicChange: vi.fn(),
    onCreatePost: vi.fn(),
    onDeletePost: vi.fn(),
    onToggleReaction: vi.fn(),
    onListPostComments: vi.fn().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    }),
    onCreatePostComment: vi.fn(),
    onDeletePostComment: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function deleteCommentButtonName(
  position: number,
  comment: PostComment,
) {
  const normalizedBody = comment.body.trim().replace(/\s+/gu, ' ')
  const characters = Array.from(normalizedBody)
  const excerpt = characters.slice(0, 72).join('')
  const suffix = characters.length > 72 ? '…' : ''
  return `Xóa bình luận số ${position} của ${comment.author.displayName}: ${excerpt}${suffix}`
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

  it('hiển thị fallback thay vì ảnh có src rỗng', () => {
    const { container } = render(
      <Feed
        {...createProps({
          posts: [{ ...post, imageUrl: '' }],
        })}
      />,
    )

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: `Không tải được ảnh tác phẩm ${post.title}`,
      }),
    ).toBeVisible()
  })

  it('chỉ cho tác giả xác nhận xóa bài viết của mình', async () => {
    const user = userEvent.setup()
    const onDeletePost = vi.fn().mockResolvedValue(undefined)
    render(<Feed {...createProps({ onDeletePost })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Xóa bài viết ${post.title}`,
      }),
    )

    const dialog = screen.getByRole('alertdialog', {
      name: 'Xóa bài viết?',
    })
    expect(dialog).toHaveTextContent(
      'Bài viết sẽ biến mất khỏi bảng tin',
    )

    await user.click(
      within(dialog).getByRole('button', { name: 'Xóa bài viết' }),
    )

    await waitFor(() => {
      expect(onDeletePost).toHaveBeenCalledWith(post.id)
    })
  })

  it('không hiển thị nút xóa bài của tác giả khác', () => {
    render(
      <Feed
        {...createProps({
          currentUserId: '00000000-0000-4000-8000-000000000099',
        })}
      />,
    )

    expect(
      screen.queryByRole('button', {
        name: `Xóa bài viết ${post.title}`,
      }),
    ).not.toBeInTheDocument()
  })

  it('hiển thị quyền xóa bài của người khác cho super admin', () => {
    render(
      <Feed
        {...createProps({
          canDeleteAnyPost: true,
          currentUserId: '00000000-0000-4000-8000-000000000099',
        })}
      />,
    )

    expect(
      screen.getByRole('button', {
        name: `Xóa bài viết ${post.title}`,
      }),
    ).toBeVisible()
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

  it('chỉ tải bình luận khi mở, sắp xếp mới nhất trước và tải thêm theo trang', async () => {
    const user = userEvent.setup()
    let resolveFirstPage:
      | ((response: PostCommentListResponse) => void)
      | undefined
    const firstPageRequest = new Promise<PostCommentListResponse>(
      (resolve) => {
        resolveFirstPage = resolve
      },
    )
    const olderComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận cũ hơn',
      createdAt: '2026-07-24T03:00:00.000Z',
    }
    const newestComment: PostComment = {
      id: COMMENT_ID_2,
      postId: POST_ID_1,
      author: {
        id: USER_ID_2,
        username: 'co-lan',
        displayName: 'Cô Lan',
        role: 'TEACHER',
        isSuperAdmin: false,
      },
      body: 'Bình luận mới nhất',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const oldestComment: PostComment = {
      id: COMMENT_ID_3,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận từ trang hai',
      createdAt: '2026-07-24T01:00:00.000Z',
    }
    const onListPostComments = vi
      .fn()
      .mockReturnValueOnce(firstPageRequest)
      .mockResolvedValueOnce({
        data: [oldestComment],
        pagination: {
          page: 2,
          pageSize: 20,
          totalItems: 3,
          totalPages: 2,
        },
      })
    render(<Feed {...createProps({ onListPostComments })} />)

    const commentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    expect(commentsButton).toHaveAttribute('aria-expanded', 'false')
    expect(commentsButton).toHaveAttribute(
      'aria-controls',
      `post-comments-${post.id}`,
    )
    expect(onListPostComments).not.toHaveBeenCalled()

    await user.click(commentsButton)

    expect(commentsButton).toHaveAttribute('aria-expanded', 'true')
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    expect(
      within(commentsRegion).getByRole('status', {
        name: 'Đang tải bình luận',
      }),
    ).toHaveAttribute('aria-busy', 'true')
    expect(onListPostComments).toHaveBeenCalledWith(
      post.id,
      { page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    )

    await act(async () => {
      resolveFirstPage?.({
        data: [olderComment, newestComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 3,
          totalPages: 2,
        },
      })
      await firstPageRequest
    })

    const firstPageItems =
      within(commentsRegion).getAllByRole('listitem')
    expect(firstPageItems[0]).toHaveTextContent('Bình luận mới nhất')
    expect(firstPageItems[1]).toHaveTextContent('Bình luận cũ hơn')

    await user.click(
      within(commentsRegion).getByRole('button', {
        name: 'Xem thêm bình luận',
      }),
    )

    await waitFor(() => {
      expect(onListPostComments).toHaveBeenLastCalledWith(
        post.id,
        { page: 2, pageSize: 20 },
        expect.any(AbortSignal),
      )
    })
    expect(
      within(commentsRegion).getByText('Bình luận từ trang hai'),
    ).toBeVisible()
  })

  it('hiển thị avatar tác giả bình luận và fallback khi ảnh tải lỗi', async () => {
    const user = userEvent.setup()
    const avatarUrl = 'https://example.com/co-lan-avatar.jpg'
    const avatarComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: {
        id: USER_ID_2,
        username: 'co-lan',
        displayName: 'Cô Lan',
        role: 'TEACHER',
        isSuperAdmin: false,
        avatarUrl,
      },
      body: 'Cô rất thích cách phối màu này.',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const onListPostComments = vi.fn().mockResolvedValue({
      data: [avatarComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    render(<Feed {...createProps({ onListPostComments })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )

    const commentBody = await screen.findByText(
      'Cô rất thích cách phối màu này.',
    )
    const commentItem = commentBody.closest('li')
    if (!commentItem) throw new Error('Không tìm thấy comment item')

    const avatar = commentItem.querySelector('img')
    expect(avatar).toHaveAttribute('src', avatarUrl)
    expect(avatar).toHaveAttribute('alt', '')
    expect(avatar).toHaveAttribute('loading', 'lazy')
    expect(avatar).toHaveAttribute('referrerpolicy', 'no-referrer')

    if (!avatar) throw new Error('Không tìm thấy avatar bình luận')
    fireEvent.error(avatar)

    expect(commentItem.querySelector('img')).not.toBeInTheDocument()
    expect(within(commentItem).getByText('CL')).toBeVisible()
  })

  it('chỉ cho tác giả xóa bình luận sau khi xác nhận và cập nhật số lượng', async () => {
    const user = userEvent.setup()
    let resolveDelete: (() => void) | undefined
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const ownComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận mình muốn xóa',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const otherComment: PostComment = {
      id: COMMENT_ID_2,
      postId: POST_ID_1,
      author: {
        id: USER_ID_2,
        username: 'co-lan',
        displayName: 'Cô Lan',
        role: 'TEACHER',
        isSuperAdmin: false,
      },
      body: 'Bình luận của người khác',
      createdAt: '2026-07-24T04:00:00.000Z',
    }
    const onListPostComments = vi
      .fn()
      .mockResolvedValueOnce({
        data: [ownComment, otherComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 2,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        data: [otherComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      })
    const onDeletePostComment = vi.fn(() => deleteRequest)
    render(
      <Feed
        {...createProps({
          onDeletePostComment,
          onListPostComments,
        })}
      />,
    )

    const commentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    await user.click(commentsButton)
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(ownComment.body)

    const deleteTrigger = within(commentsRegion).getByRole('button', {
      name: deleteCommentButtonName(1, ownComment),
    })
    expect(
      within(commentsRegion).queryByRole('button', {
        name: deleteCommentButtonName(2, otherComment),
      }),
    ).not.toBeInTheDocument()

    await user.click(deleteTrigger)
    let dialog = within(commentsRegion).getByRole('alertdialog', {
      name: 'Xóa bình luận?',
    })
    expect(onDeletePostComment).not.toHaveBeenCalled()
    const cancelButton = within(dialog).getByRole('button', {
      name: 'Hủy',
    })
    const firstConfirmButton = within(dialog).getByRole('button', {
      name: 'Xóa',
    })
    expect(cancelButton).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(firstConfirmButton).toHaveFocus()
    await user.tab()
    expect(cancelButton).toHaveFocus()
    await user.click(cancelButton)
    expect(
      within(commentsRegion).queryByRole('alertdialog'),
    ).not.toBeInTheDocument()
    expect(deleteTrigger).toHaveFocus()

    await user.click(deleteTrigger)
    await user.keyboard('{Escape}')
    expect(
      within(commentsRegion).queryByRole('alertdialog'),
    ).not.toBeInTheDocument()
    expect(deleteTrigger).toHaveFocus()

    await user.click(deleteTrigger)
    dialog = within(commentsRegion).getByRole('alertdialog', {
      name: 'Xóa bình luận?',
    })
    const confirmButton = within(dialog).getByRole('button', {
      name: 'Xóa',
    })
    await user.click(confirmButton)

    expect(onDeletePostComment).toHaveBeenCalledWith(
      post.id,
      ownComment.id,
    )
    expect(confirmButton).toHaveAttribute('aria-busy', 'true')
    expect(confirmButton).toBeDisabled()
    expect(within(commentsRegion).getByText(ownComment.body)).toBeVisible()
    expect(commentsButton).toHaveAccessibleDescription('2 bình luận')

    await act(async () => {
      resolveDelete?.()
      await deleteRequest
    })

    expect(
      within(commentsRegion).queryByText(ownComment.body),
    ).not.toBeInTheDocument()
    expect(within(commentsRegion).getByText(otherComment.body)).toBeVisible()
    expect(commentsButton).toHaveAccessibleDescription('1 bình luận')
    expect(
      within(commentsRegion).getByLabelText(
        `Viết bình luận cho ${post.title}`,
      ),
    ).toHaveFocus()
    expect(onListPostComments).toHaveBeenLastCalledWith(
      post.id,
      { page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    )
  })

  it('hiển thị xác nhận xóa như modal và đóng an toàn khi nhấn lớp nền', async () => {
    const user = userEvent.setup()
    const ownComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận cần xác nhận bằng modal',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const onListPostComments = vi.fn().mockResolvedValue({
      data: [ownComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    render(
      <Feed
        {...createProps({
          onListPostComments,
        })}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(ownComment.body)
    const deleteTrigger = within(commentsRegion).getByRole('button', {
      name: deleteCommentButtonName(1, ownComment),
    })

    await user.click(deleteTrigger)
    const dialog = within(commentsRegion).getByRole('alertdialog', {
      name: 'Xóa bình luận?',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const backdrop = dialog.parentElement
    if (!backdrop) throw new Error('Không tìm thấy lớp nền modal')
    fireEvent.click(backdrop)

    expect(
      within(commentsRegion).queryByRole('alertdialog'),
    ).not.toBeInTheDocument()
    expect(deleteTrigger).toHaveFocus()
  })

  it('giữ focus ở trạng thái cập nhật trong lúc tải lại sau khi xóa', async () => {
    const user = userEvent.setup()
    let resolveRefresh:
      | ((response: PostCommentListResponse) => void)
      | undefined
    const refreshRequest = new Promise<PostCommentListResponse>(
      (resolve) => {
        resolveRefresh = resolve
      },
    )
    const ownComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận chờ tải lại sau khi xóa',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const onListPostComments = vi
      .fn()
      .mockResolvedValueOnce({
        data: [ownComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      })
      .mockReturnValueOnce(refreshRequest)
    render(
      <Feed
        {...createProps({
          onDeletePostComment: vi.fn().mockResolvedValue(undefined),
          onListPostComments,
        })}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(ownComment.body)
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, ownComment),
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    const refreshStatus = await within(commentsRegion).findByRole(
      'status',
      {
        name: 'Đang cập nhật bình luận sau khi xóa',
      },
    )
    expect(refreshStatus).toHaveFocus()
    expect(document.body).not.toHaveFocus()

    await act(async () => {
      resolveRefresh?.({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      })
      await refreshRequest
    })

    await waitFor(() => {
      expect(
        within(commentsRegion).getByLabelText(
          `Viết bình luận cho ${post.title}`,
        ),
      ).toHaveFocus()
    })
    expect(
      within(commentsRegion).queryByRole('status', {
        name: 'Đang cập nhật bình luận sau khi xóa',
      }),
    ).not.toBeInTheDocument()
  })

  it('giữ nguyên bình luận và số lượng khi xóa thất bại', async () => {
    const user = userEvent.setup()
    const ownComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận vẫn phải còn lại',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const onListPostComments = vi.fn().mockResolvedValue({
      data: [ownComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    const onDeletePostComment = vi
      .fn()
      .mockRejectedValue(new Error('Máy chủ bận'))
    render(
      <Feed
        {...createProps({
          onDeletePostComment,
          onListPostComments,
        })}
      />,
    )

    const commentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    await user.click(commentsButton)
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(ownComment.body)
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, ownComment),
      }),
    )
    const dialog = within(commentsRegion).getByRole('alertdialog', {
      name: 'Xóa bình luận?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Xóa' }),
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Chưa thể xóa bình luận',
    )
    expect(within(commentsRegion).getByText(ownComment.body)).toBeVisible()
    expect(commentsButton).toHaveAccessibleDescription('2 bình luận')
  })

  it('không giảm số bình luận xuống dưới 0 khi dữ liệu ban đầu lệch', async () => {
    const user = userEvent.setup()
    const ownComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận chưa được phản ánh trong bộ đếm',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const onListPostComments = vi
      .fn()
      .mockResolvedValueOnce({
        data: [ownComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      })
    render(
      <Feed
        {...createProps({
          posts: [{ ...post, commentCount: 0 }],
          onListPostComments,
        })}
      />,
    )

    const commentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    await user.click(commentsButton)
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(ownComment.body)
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, ownComment),
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    await waitFor(() => {
      expect(
        within(commentsRegion).queryByText(ownComment.body),
      ).not.toBeInTheDocument()
    })
    expect(commentsButton).toHaveAccessibleDescription('0 bình luận')
  })

  it('giữ cùng phiên bình luận khi đóng và mở lại trong lúc đang xóa', async () => {
    const user = userEvent.setup()
    let resolveDelete: (() => void) | undefined
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const ownComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận đang chờ xóa',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const onListPostComments = vi
      .fn()
      .mockResolvedValueOnce({
        data: [ownComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      })
    const onDeletePostComment = vi.fn(() => deleteRequest)
    render(
      <Feed
        {...createProps({
          posts: [{ ...post, commentCount: 1 }],
          onDeletePostComment,
          onListPostComments,
        })}
      />,
    )

    const commentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    await user.click(commentsButton)
    let commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(ownComment.body)
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, ownComment),
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    await user.click(commentsButton)
    expect(commentsButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(commentsButton)
    commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })

    expect(onListPostComments).toHaveBeenCalledTimes(1)
    expect(onDeletePostComment).toHaveBeenCalledTimes(1)
    expect(
      within(commentsRegion).getByRole('button', {
        name: 'Đang xóa…',
      }),
    ).toHaveAttribute('aria-busy', 'true')

    await act(async () => {
      resolveDelete?.()
      await deleteRequest
    })

    await waitFor(() => {
      expect(onListPostComments).toHaveBeenCalledTimes(2)
      expect(
        within(commentsRegion).queryByText(ownComment.body),
      ).not.toBeInTheDocument()
    })
    expect(commentsButton).toHaveAccessibleDescription('0 bình luận')
  })

  it('tạo phiên bình luận mới khi đổi tài khoản trong lúc xóa đang chờ', async () => {
    const user = userEvent.setup()
    let resolveDelete: (() => void) | undefined
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const oldUserComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận của tài khoản cũ',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const newUserComment: PostComment = {
      id: COMMENT_ID_2,
      postId: POST_ID_1,
      author: {
        id: USER_ID_2,
        username: 'co-lan',
        displayName: 'Cô Lan',
        role: 'TEACHER',
        isSuperAdmin: false,
      },
      body: 'Bình luận của tài khoản mới',
      createdAt: '2026-07-24T06:00:00.000Z',
    }
    const oldUserList = vi.fn().mockResolvedValue({
      data: [oldUserComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    const newUserList = vi.fn().mockResolvedValue({
      data: [newUserComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    const onDeletePostComment = vi.fn(() => deleteRequest)
    const { rerender } = render(
      <Feed
        {...createProps({
          onDeletePostComment,
          onListPostComments: oldUserList,
        })}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    let commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(oldUserComment.body)
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, oldUserComment),
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    rerender(
      <Feed
        {...createProps({
          currentUserId: USER_ID_2,
          onDeletePostComment,
          onListPostComments: newUserList,
        })}
      />,
    )
    const newCommentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    expect(newCommentsButton).toHaveAttribute('aria-expanded', 'false')

    await act(async () => {
      resolveDelete?.()
      await deleteRequest
    })

    await user.click(newCommentsButton)
    commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    expect(
      await within(commentsRegion).findByText(newUserComment.body),
    ).toBeVisible()
    expect(
      within(commentsRegion).queryByText(oldUserComment.body),
    ).not.toBeInTheDocument()
    expect(oldUserList).toHaveBeenCalledTimes(1)
    expect(newUserList).toHaveBeenCalledTimes(1)
  })

  it('tải lại trang đầu sau khi xóa để không hụt bình luận ở biên phân trang', async () => {
    const user = userEvent.setup()
    const allComments: PostComment[] = Array.from(
      { length: 21 },
      (_, index) => ({
        id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as ResourceId,
        postId: POST_ID_1,
        author: post.author,
        body: `Bình luận phân trang ${index + 1}`,
        createdAt: new Date(
          Date.UTC(2026, 6, 24, 5, 0, 21 - index),
        ).toISOString(),
      }),
    )
    const onListPostComments = vi
      .fn()
      .mockResolvedValueOnce({
        data: allComments.slice(0, 20),
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 21,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        data: allComments.slice(1),
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 20,
          totalPages: 1,
        },
      })
    render(
      <Feed
        {...createProps({
          posts: [{ ...post, commentCount: 21 }],
          onListPostComments,
        })}
      />,
    )

    const commentsButton = screen.getByRole('button', {
      name: `Bình luận về tác phẩm ${post.title}`,
    })
    await user.click(commentsButton)
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(allComments[0].body)
    expect(
      within(commentsRegion).queryByText(allComments[20].body),
    ).not.toBeInTheDocument()

    await user.click(
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, allComments[0]),
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    expect(
      await within(commentsRegion).findByText(allComments[20].body),
    ).toBeVisible()
    expect(
      within(commentsRegion).queryByText(allComments[0].body),
    ).not.toBeInTheDocument()
    expect(
      within(commentsRegion).queryByRole('button', {
        name: 'Xem thêm bình luận',
      }),
    ).not.toBeInTheDocument()
    expect(onListPostComments).toHaveBeenNthCalledWith(
      2,
      post.id,
      { page: 1, pageSize: 20 },
      expect.any(AbortSignal),
    )
  })

  it('khóa tải thêm, đăng và lần xóa khác trong khi đang xóa bình luận', async () => {
    const user = userEvent.setup()
    let resolveDelete: (() => void) | undefined
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const firstComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận thứ nhất',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const secondComment: PostComment = {
      id: COMMENT_ID_2,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận thứ hai',
      createdAt: '2026-07-24T04:00:00.000Z',
    }
    const onListPostComments = vi.fn().mockResolvedValue({
      data: [firstComment, secondComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 21,
        totalPages: 2,
      },
    })
    const onCreatePostComment = vi.fn()
    const onDeletePostComment = vi.fn(() => deleteRequest)
    render(
      <Feed
        {...createProps({
          onCreatePostComment,
          onDeletePostComment,
          onListPostComments,
        })}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText(firstComment.body)
    const deleteTriggers = [
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(1, firstComment),
      }),
      within(commentsRegion).getByRole('button', {
        name: deleteCommentButtonName(2, secondComment),
      }),
    ]
    expect(deleteTriggers[0]).not.toHaveAccessibleName(
      deleteCommentButtonName(2, secondComment),
    )
    await user.click(deleteTriggers[0])
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    const loadMoreButton = within(commentsRegion).getByRole('button', {
      name: 'Xem thêm bình luận',
    })
    const submitButton = within(commentsRegion).getByRole('button', {
      name: 'Đăng bình luận',
    })
    expect(loadMoreButton).toBeDisabled()
    expect(submitButton).toBeDisabled()
    expect(deleteTriggers[1]).toBeDisabled()

    fireEvent.click(loadMoreButton)
    fireEvent.submit(submitButton.closest('form')!)
    fireEvent.click(deleteTriggers[1])
    expect(onListPostComments).toHaveBeenCalledTimes(1)
    expect(onCreatePostComment).not.toHaveBeenCalled()
    expect(onDeletePostComment).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveDelete?.()
      await deleteRequest
    })
  })

  it('không cho tải thêm và đăng bình luận chạy đồng thời', async () => {
    const user = userEvent.setup()
    let resolveLoadMore:
      | ((response: PostCommentListResponse) => void)
      | undefined
    let resolveCreate: ((comment: PostComment) => void) | undefined
    const loadMoreRequest = new Promise<PostCommentListResponse>(
      (resolve) => {
        resolveLoadMore = resolve
      },
    )
    const createRequest = new Promise<PostComment>((resolve) => {
      resolveCreate = resolve
    })
    const firstComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận trang đầu',
      createdAt: '2026-07-24T05:00:00.000Z',
    }
    const secondComment: PostComment = {
      id: COMMENT_ID_2,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận trang hai',
      createdAt: '2026-07-24T04:00:00.000Z',
    }
    const createdComment: PostComment = {
      id: COMMENT_ID_3,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bình luận sau khi tải xong',
      createdAt: '2026-07-24T06:00:00.000Z',
    }
    const onListPostComments = vi
      .fn()
      .mockResolvedValueOnce({
        data: [firstComment],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 41,
          totalPages: 3,
        },
      })
      .mockReturnValueOnce(loadMoreRequest)
    const onCreatePostComment = vi.fn(() => createRequest)
    render(
      <Feed
        {...createProps({
          onCreatePostComment,
          onListPostComments,
        })}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    await within(commentsRegion).findByText('Bình luận trang đầu')
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    await user.type(composer, 'Bình luận sau khi tải xong')

    await user.click(
      within(commentsRegion).getByRole('button', {
        name: 'Xem thêm bình luận',
      }),
    )

    const submitButton = within(commentsRegion).getByRole('button', {
      name: 'Đăng bình luận',
    })
    const deleteTrigger = within(commentsRegion).getByRole('button', {
      name: deleteCommentButtonName(1, firstComment),
    })
    expect(submitButton).toBeDisabled()
    expect(deleteTrigger).toBeDisabled()
    fireEvent.submit(submitButton.closest('form')!)
    fireEvent.click(deleteTrigger)
    expect(onCreatePostComment).not.toHaveBeenCalled()

    await act(async () => {
      resolveLoadMore?.({
        data: [secondComment],
        pagination: {
          page: 2,
          pageSize: 20,
          totalItems: 41,
          totalPages: 3,
        },
      })
      await loadMoreRequest
    })

    await user.click(submitButton)

    const loadMoreButton = within(commentsRegion).getByRole('button', {
      name: 'Xem thêm bình luận',
    })
    expect(loadMoreButton).toBeDisabled()
    expect(deleteTrigger).toBeDisabled()
    fireEvent.click(loadMoreButton)
    fireEvent.click(deleteTrigger)
    expect(onListPostComments).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolveCreate?.(createdComment)
      await createRequest
    })

    expect(
      within(commentsRegion).getByText('Bình luận sau khi tải xong'),
    ).toBeVisible()
    expect(onListPostComments).toHaveBeenCalledTimes(2)
  })

  it('báo lỗi tải bình luận, cho thử lại và hiển thị trạng thái trống', async () => {
    const user = userEvent.setup()
    const onListPostComments = vi
      .fn()
      .mockRejectedValueOnce(new Error('Mất kết nối'))
      .mockResolvedValueOnce({
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      })
    render(<Feed {...createProps({ onListPostComments })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )

    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    expect(
      await within(commentsRegion).findByRole('alert'),
    ).toHaveTextContent('Chưa thể tải bình luận')

    await user.click(
      within(commentsRegion).getByRole('button', {
        name: 'Thử tải lại bình luận',
      }),
    )

    expect(
      await within(commentsRegion).findByRole('status', {
        name: 'Chưa có bình luận',
      }),
    ).toHaveTextContent('Hãy là người đầu tiên')
    expect(onListPostComments).toHaveBeenCalledTimes(2)
  })

  it('trim nội dung, đăng bằng Enter và đưa bình luận mới lên đầu', async () => {
    const user = userEvent.setup()
    const createdComment: PostComment = {
      id: COMMENT_ID_3,
      postId: POST_ID_1,
      author: post.author,
      body: 'Nhìn màu trời đẹp quá!',
      createdAt: '2026-07-24T06:00:00.000Z',
    }
    const existingComment: PostComment = {
      id: COMMENT_ID_1,
      postId: POST_ID_1,
      author: post.author,
      body: 'Bức tranh có chiều sâu.',
      createdAt: '2026-07-24T07:00:00.000Z',
    }
    const onListPostComments = vi.fn().mockResolvedValue({
      data: [existingComment],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    const onCreatePostComment = vi
      .fn()
      .mockResolvedValue(createdComment)
    render(
      <Feed
        {...createProps({
          onCreatePostComment,
          onListPostComments,
        })}
      />,
    )

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    expect(
      await within(commentsRegion).findByText(
        'Bức tranh có chiều sâu.',
      ),
    ).toBeVisible()
    await user.type(composer, '  Nhìn màu trời đẹp quá!  ')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(onCreatePostComment).toHaveBeenCalledWith(post.id, {
        body: 'Nhìn màu trời đẹp quá!',
      })
    })
    expect(composer).toHaveValue('')
    expect(
      within(commentsRegion).getByText('Nhìn màu trời đẹp quá!'),
    ).toBeVisible()
    expect(within(commentsRegion).getAllByRole('listitem')[0]).toHaveTextContent(
      'Nhìn màu trời đẹp quá!',
    )
    expect(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    ).toHaveAccessibleDescription('3 bình luận')
  })

  it('không gửi khoảng trắng, giữ Shift+Enter và bỏ qua Enter khi đang IME', async () => {
    const user = userEvent.setup()
    const onCreatePostComment = vi.fn()
    render(<Feed {...createProps({ onCreatePostComment })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    const submitButton = within(commentsRegion).getByRole('button', {
      name: 'Đăng bình luận',
    })

    await user.type(composer, '   ')
    expect(submitButton).toBeDisabled()

    await user.clear(composer)
    await user.type(composer, 'Dòng một')
    await user.keyboard('{Shift>}{Enter}{/Shift}Dòng hai')
    expect(composer).toHaveValue('Dòng một\nDòng hai')
    expect(onCreatePostComment).not.toHaveBeenCalled()

    fireEvent.compositionStart(composer)
    fireEvent.keyDown(composer, {
      key: 'Enter',
      code: 'Enter',
      isComposing: true,
    })
    fireEvent.compositionEnd(composer)
    expect(onCreatePostComment).not.toHaveBeenCalled()
  })

  it('cho phép nội dung đã trim đủ 3.000 Unicode code point và giữ nguyên khoảng trắng thô', async () => {
    const user = userEvent.setup()
    const threeThousandEmoji = '🎨'.repeat(3_000)
    const rawDraft = `  ${threeThousandEmoji}  `
    const onCreatePostComment = vi.fn().mockResolvedValue({
      id: COMMENT_ID_3,
      postId: POST_ID_1,
      author: post.author,
      body: threeThousandEmoji,
      createdAt: '2026-07-24T06:00:00.000Z',
    })
    render(<Feed {...createProps({ onCreatePostComment })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    await within(commentsRegion).findByRole('status', {
      name: 'Chưa có bình luận',
    })

    fireEvent.change(composer, {
      target: { value: rawDraft },
    })

    expect(composer).not.toHaveAttribute('maxlength')
    expect(composer).toHaveValue(rawDraft)
    expect(composer).toHaveAccessibleDescription(/3000\/3\.000/)
    const submitButton = within(commentsRegion).getByRole('button', {
      name: 'Đăng bình luận',
    })
    expect(submitButton).toBeEnabled()

    await user.click(submitButton)

    expect(onCreatePostComment).toHaveBeenCalledWith(post.id, {
      body: threeThousandEmoji,
    })
  })

  it('giữ nguyên draft quá 3.000 ký tự và báo lỗi validation có thể truy cập', async () => {
    const user = userEvent.setup()
    const onCreatePostComment = vi.fn()
    render(<Feed {...createProps({ onCreatePostComment })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    await within(commentsRegion).findByRole('status', {
      name: 'Chưa có bình luận',
    })
    const overLimitDraft = `  ${'🎨'.repeat(3_001)}  `

    fireEvent.change(composer, {
      target: { value: overLimitDraft },
    })

    expect(composer).toHaveValue(overLimitDraft)
    expect(composer).toHaveAttribute('aria-invalid', 'true')
    expect(within(commentsRegion).getByRole('alert')).toHaveTextContent(
      'Bình luận tối đa 3.000 ký tự',
    )
    expect(composer).toHaveAccessibleDescription(
      /Bình luận tối đa 3\.000 ký tự/,
    )
    const submitButton = within(commentsRegion).getByRole('button', {
      name: 'Đăng bình luận',
    })
    expect(submitButton).toBeDisabled()
    fireEvent.submit(submitButton.closest('form')!)
    expect(onCreatePostComment).not.toHaveBeenCalled()
  })

  it('từ chối paste quá lớn mà không ghi đè bản nháp hiện có', async () => {
    const user = userEvent.setup()
    const onCreatePostComment = vi.fn()
    render(<Feed {...createProps({ onCreatePostComment })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    await within(commentsRegion).findByRole('status', {
      name: 'Chưa có bình luận',
    })
    const existingDraft = 'Bản nháp đang giữ'
    const oversizedPaste = 'x'.repeat(1_000_000)
    await user.type(composer, existingDraft)

    fireEvent.paste(composer, {
      clipboardData: {
        getData: () => oversizedPaste,
      },
    })

    expect(composer).toHaveValue(existingDraft)
    expect(within(commentsRegion).getByRole('alert')).toHaveTextContent(
      'Bản nháp quá lớn',
    )
    expect(composer).toHaveAttribute('aria-invalid', 'true')
    expect(composer).toHaveAccessibleDescription(/Bản nháp quá lớn/)

    fireEvent.change(composer, {
      target: { value: oversizedPaste },
    })

    expect(composer).toHaveValue(existingDraft)
    expect(onCreatePostComment).not.toHaveBeenCalled()
  })

  it('hiển thị trạng thái đang gửi và giữ bản nháp khi đăng lỗi', async () => {
    const user = userEvent.setup()
    let rejectComment: ((reason?: unknown) => void) | undefined
    const createRequest = new Promise<PostComment>((_, reject) => {
      rejectComment = reject
    })
    const onCreatePostComment = vi.fn(() => createRequest)
    render(<Feed {...createProps({ onCreatePostComment })} />)

    await user.click(
      screen.getByRole('button', {
        name: `Bình luận về tác phẩm ${post.title}`,
      }),
    )
    const commentsRegion = screen.getByRole('region', {
      name: `Bình luận của tác phẩm ${post.title}`,
    })
    const composer = within(commentsRegion).getByLabelText(
      `Viết bình luận cho ${post.title}`,
    )
    const submitButton = within(commentsRegion).getByRole('button', {
      name: 'Đăng bình luận',
    })
    await user.type(composer, 'Mình vẫn muốn giữ nội dung này')
    await user.click(submitButton)

    expect(submitButton).toHaveAttribute('aria-busy', 'true')
    expect(submitButton).toBeDisabled()

    await act(async () => {
      rejectComment?.(new Error('Máy chủ bận'))
      await createRequest.catch(() => undefined)
    })

    expect(within(commentsRegion).getByRole('alert')).toHaveTextContent(
      'Chưa thể đăng bình luận',
    )
    expect(composer).toHaveValue('Mình vẫn muốn giữ nội dung này')
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
      within(dialog).getByText('Hãy chọn ảnh tác phẩm để tải lên.'),
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
    const imageFile = new File(
      ['mock image bytes'],
      'mam-xanh.png',
      { type: 'image/png' },
    )
    await user.upload(
      within(dialog).getByLabelText('Chọn ảnh tác phẩm từ máy'),
      imageFile,
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
        imageFile,
        examName: 'Ngày hội sắc màu',
        topicIds: [TOPIC_ID_1, TOPIC_ID_2],
      })
    })
    expect(onCreatePost).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('dialog', { name: 'Đăng tác phẩm mới' }),
    ).not.toBeInTheDocument()
  })

  it('gửi imageUrl thay vì file khi dùng REST backend', async () => {
    const user = userEvent.setup()
    const onCreatePost = vi.fn().mockResolvedValue(undefined)
    render(
      <Feed
        {...createProps({ onCreatePost })}
        imageInputMode="url"
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /Đăng tác phẩm/ }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Đăng tác phẩm mới',
    })
    expect(
      within(dialog).queryByLabelText('Chọn ảnh tác phẩm từ máy'),
    ).not.toBeInTheDocument()

    await user.type(
      within(dialog).getByLabelText(/^Tiêu đề/),
      '  Góc cà phê cuối tuần  ',
    )
    await user.type(
      within(dialog).getByLabelText(/^Mô tả/),
      '  Một bài kiểm thử bằng URL ảnh.  ',
    )
    await user.type(
      within(dialog).getByLabelText('URL ảnh tác phẩm'),
      'https://images.example.com/goc-ca-phe.webp',
    )
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Thiên nhiên' }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Đăng tác phẩm' }),
    )

    await waitFor(() => {
      expect(onCreatePost).toHaveBeenCalledWith({
        title: 'Góc cà phê cuối tuần',
        caption: 'Một bài kiểm thử bằng URL ảnh.',
        imageUrl: 'https://images.example.com/goc-ca-phe.webp',
        topicIds: [TOPIC_ID_1],
      })
    })
  })

  it('giữ focus ở lỗi async và cho đóng dialog bằng Escape', async () => {
    const user = userEvent.setup()
    const onCreatePost = vi
      .fn()
      .mockRejectedValue(new Error('Máy chủ từ chối bài viết.'))
    render(<Feed {...createProps({ onCreatePost })} />)

    await user.click(
      screen.getByRole('button', { name: /Đăng tác phẩm/ }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Đăng tác phẩm mới',
    })
    await user.type(
      within(dialog).getByLabelText(/^Tiêu đề/),
      'Bài kiểm thử lỗi',
    )
    await user.type(
      within(dialog).getByLabelText(/^Mô tả/),
      'Kiểm tra focus sau lỗi bất đồng bộ.',
    )
    await user.upload(
      within(dialog).getByLabelText('Chọn ảnh tác phẩm từ máy'),
      new File(['image'], 'qc.png', { type: 'image/png' }),
    )
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Thiên nhiên' }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Đăng tác phẩm' }),
    )

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Máy chủ từ chối bài viết.')
    expect(alert).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('dialog', { name: 'Đăng tác phẩm mới' }),
    ).not.toBeInTheDocument()
  })

  it('nhận ảnh bằng thao tác kéo thả và hiển thị trạng thái sẵn sàng', async () => {
    const user = userEvent.setup()
    render(<Feed {...createProps()} />)

    await user.click(
      screen.getByRole('button', { name: /Đăng tác phẩm/ }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Đăng tác phẩm mới',
    })
    const imageFile = new File(['dragged image'], 'tac-pham.webp', {
      type: 'image/webp',
    })
    const dropzone = within(dialog).getByRole('region', {
      name: 'Vùng kéo thả ảnh tác phẩm',
    })

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [imageFile],
      },
    })

    expect(within(dialog).getByText('Sẵn sàng tải lên')).toBeVisible()
    expect(within(dialog).getByText('tac-pham.webp')).toBeVisible()
    expect(
      within(dialog).getByRole('button', {
        name: 'Xóa ảnh tac-pham.webp',
      }),
    ).toBeVisible()
  })

  it('chọn và gửi nhiều ảnh theo đúng thứ tự trong một bài post', async () => {
    const user = userEvent.setup()
    const onCreatePost = vi.fn().mockResolvedValue(undefined)
    render(<Feed {...createProps({ onCreatePost })} />)

    await user.click(
      screen.getByRole('button', { name: /Đăng tác phẩm/ }),
    )
    const dialog = screen.getByRole('dialog', {
      name: 'Đăng tác phẩm mới',
    })
    const firstImage = new File(['first'], 'goc-nhin-mot.png', {
      type: 'image/png',
    })
    const secondImage = new File(['second'], 'goc-nhin-hai.webp', {
      type: 'image/webp',
    })

    await user.upload(
      within(dialog).getByLabelText('Chọn ảnh tác phẩm từ máy'),
      [firstImage, secondImage],
    )

    expect(within(dialog).getByText('2/10 ảnh')).toBeVisible()
    expect(within(dialog).getByText(firstImage.name)).toBeVisible()
    expect(within(dialog).getByText(secondImage.name)).toBeVisible()

    await user.type(
      within(dialog).getByLabelText(/^Tiêu đề/),
      'Hai góc nhìn',
    )
    await user.type(
      within(dialog).getByLabelText(/^Mô tả/),
      'Một tác phẩm được kể bằng hai khung hình.',
    )
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Thiên nhiên' }),
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Đăng tác phẩm' }),
    )

    await waitFor(() => {
      expect(onCreatePost).toHaveBeenCalledWith({
        title: 'Hai góc nhìn',
        caption: 'Một tác phẩm được kể bằng hai khung hình.',
        imageFiles: [firstImage, secondImage],
        topicIds: [TOPIC_ID_1],
      })
    })
  })
})
