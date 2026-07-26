import {
  act,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const apiMock = vi.hoisted(() => ({
  loginDemo: vi.fn(),
  listUsers: vi.fn(),
  updateProfile: vi.fn(),
  listTopics: vi.fn(),
  listPosts: vi.fn(),
  createPost: vi.fn(),
  listPostComments: vi.fn(),
  createPostComment: vi.fn(),
  deletePostComment: vi.fn(),
  deletePost: vi.fn(),
  setPostReaction: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  listAssistantConversations: vi.fn(),
  getAssistantConversation: vi.fn(),
  askAssistant: vi.fn(),
}))

vi.mock('./lib/api', () => ({
  api: apiMock,
}))

const USER_ID_1 = '00000000-0000-4000-8000-000000000001'
const USER_ID_2 = '00000000-0000-4000-8000-000000000002'
const TOPIC_ID_3 = '10000000-0000-4000-8000-000000000003'
const POST_ID_1 = '20000000-0000-4000-8000-000000000001'
const ASSISTANT_CONVERSATION_ID =
  '60000000-0000-4000-8000-000000000001'

const users = [
  {
    id: USER_ID_1,
    username: 'minh.an',
    displayName: 'Trần Minh An',
    role: 'STUDENT' as const,
  },
  {
    id: USER_ID_2,
    username: 'co.lan',
    displayName: 'Cô Nguyễn Hoài Lan',
    role: 'TEACHER' as const,
  },
]

const topics = [
  {
    id: TOPIC_ID_3,
    slug: 'moi-truong',
    name: 'Môi trường',
    aliases: ['bảo vệ môi trường'],
  },
]

const firstPost = {
  id: POST_ID_1,
  title: 'Mầm xanh tương lai',
  caption: 'Bài thi vẽ về môi trường.',
  imageUrl: 'http://localhost:5173/demo-art/mam-xanh-tuong-lai.png',
  examName: 'Sắc màu xanh 2026',
  author: users[0],
  topics,
  reactionCount: 2,
  commentCount: 1,
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
    window.localStorage.clear()
    window.localStorage.setItem('artly.demoUserId', USER_ID_1)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:avatar-preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    apiMock.listUsers.mockResolvedValue({
      data: users,
      pagination: { ...emptyPagination, totalItems: users.length, totalPages: 1 },
    })
    apiMock.loginDemo.mockResolvedValue(users[0])
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
    apiMock.listPostComments.mockResolvedValue({
      data: [],
      pagination: {
        ...emptyPagination,
        pageSize: 20,
        totalItems: firstPost.commentCount,
        totalPages: 1,
      },
    })
    apiMock.listAssistantConversations.mockResolvedValue({
      data: [],
      pagination: { ...emptyPagination, pageSize: 30 },
    })
    apiMock.deletePostComment.mockResolvedValue(undefined)
    apiMock.deletePost.mockResolvedValue(undefined)
    apiMock.updateProfile.mockResolvedValue(users[0])
  })

  it('tải bảng tin theo tài khoản hiện tại và không cho switch account trong menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Artly' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Mầm xanh tương lai')).toBeVisible()
    expect(apiMock.listPosts).toHaveBeenCalledWith(USER_ID_1, {
      page: 1,
      pageSize: 10,
    })

    await user.click(
      screen.getByRole('button', {
        name: 'Mở menu tài khoản Trần Minh An',
      }),
    )

    expect(screen.getByRole('menuitem', { name: 'Xem profile' })).toBeVisible()
    expect(
      screen.queryByRole('menuitemradio', {
        name: 'Cô Nguyễn Hoài Lan',
      }),
    ).not.toBeInTheDocument()
    expect(apiMock.listPosts).not.toHaveBeenCalledWith(USER_ID_2, {
      page: 1,
      pageSize: 10,
    })
  })

  it('đăng nhập demo rồi đăng xuất để quay lại màn hình đăng nhập', async () => {
    const user = userEvent.setup()
    window.localStorage.removeItem('artly.demoUserId')

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Đăng nhập Artly',
      }),
    ).toBeVisible()

    await user.type(screen.getByLabelText('Username'), 'minh.an')
    await user.type(screen.getByLabelText('Mật khẩu'), 'artly-demo')
    await user.click(screen.getByRole('button', { name: 'Đăng nhập demo' }))

    expect(await screen.findByText('Mầm xanh tương lai')).toBeVisible()
    expect(apiMock.loginDemo).toHaveBeenCalledWith({
      username: 'minh.an',
      password: 'artly-demo',
    })
    expect(window.localStorage.getItem('artly.demoUserId')).toBe(USER_ID_1)

    await user.click(
      screen.getByRole('button', {
        name: 'Mở menu tài khoản Trần Minh An',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'Đăng nhập Artly',
      }),
    ).toBeVisible()
    expect(window.localStorage.getItem('artly.demoUserId')).toBeNull()
  })

  it('mở profile dạng lưới và cập nhật thông tin profile', async () => {
    const user = userEvent.setup()
    const updatedUser = {
      ...users[0],
      username: 'minh.art',
      displayName: 'Minh Artly',
      avatarUrl: 'https://images.example.com/avatar.jpg',
    }
    apiMock.updateProfile.mockResolvedValue(updatedUser)

    render(<App />)
    await screen.findByText('Mầm xanh tương lai')

    await user.click(
      screen.getByRole('button', {
        name: 'Mở menu tài khoản Trần Minh An',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Xem profile' }))

    await waitFor(() => {
      expect(apiMock.listPosts).toHaveBeenLastCalledWith(USER_ID_1, {
        page: 1,
        pageSize: 30,
        authorId: USER_ID_1,
      })
    })
    expect(
      screen.getByRole('heading', { level: 2, name: 'minh.an' }),
    ).toBeVisible()
    expect(
      screen.getByLabelText('Bài viết hình ảnh của Trần Minh An'),
    ).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Chỉnh sửa profile' }),
    )

    expect(
      screen.queryByLabelText(/Kéo thả ảnh vào đây hoặc chọn ảnh/),
    ).not.toBeInTheDocument()
    const usernameInput = screen.getByLabelText('Username')
    const usernamePattern = usernameInput.getAttribute('pattern')
    expect(usernamePattern).toBeTruthy()
    expect(() => new RegExp(usernamePattern!, 'v')).not.toThrow()

    await user.clear(screen.getByLabelText('Tên hiển thị'))
    await user.type(screen.getByLabelText('Tên hiển thị'), 'Minh Artly')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'minh.art')
    await user.type(
      screen.getByLabelText('URL avatar'),
      updatedUser.avatarUrl,
    )
    await user.click(screen.getByRole('button', { name: 'Lưu profile' }))

    await waitFor(() => {
      expect(apiMock.updateProfile).toHaveBeenCalledWith(USER_ID_1, {
        displayName: 'Minh Artly',
        username: 'minh.art',
        avatarUrl: updatedUser.avatarUrl,
      })
    })
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'minh.art',
      }),
    ).toBeVisible()
  })

  it('chờ tài khoản hợp lệ trước khi tải bảng tin', async () => {
    const databaseUserId = '8b484b4f-c468-49f6-a2b7-cdd7e2bfc380'
    const databaseUser = {
      ...users[0],
      id: databaseUserId,
    }
    window.localStorage.setItem('artly.demoUserId', databaseUserId)
    apiMock.listUsers.mockResolvedValue({
      data: [databaseUser],
      pagination: { ...emptyPagination, totalItems: 1, totalPages: 1 },
    })
    apiMock.listPosts.mockResolvedValue({
      data: [{ ...firstPost, author: databaseUser }],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    })

    render(<App />)

    expect(await screen.findByText('Mầm xanh tương lai')).toBeVisible()
    expect(apiMock.listPosts).toHaveBeenCalled()
    expect(
      apiMock.listPosts.mock.calls.every(
        ([viewerId]) => viewerId === databaseUserId,
      ),
    ).toBe(true)
  })

  it('mở modal chat từ icon header và chỉ tải API sau khi chọn người', async () => {
    const user = userEvent.setup()

    render(<App />)
    await screen.findByText('Mầm xanh tương lai')

    await user.click(screen.getByRole('button', { name: 'Mở chat' }))

    expect(
      screen.getByRole('dialog', { name: 'Danh sách chat' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Chats' }),
    ).toBeVisible()
    expect(apiMock.listMessages).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', {
        name: `Mở chat với ${users[1].displayName}`,
      }),
    ).toBeVisible()

    await user.click(
      screen.getByRole('button', {
        name: `Mở chat với ${users[1].displayName}`,
      }),
    )

    await waitFor(() => {
      expect(apiMock.listMessages).toHaveBeenCalledWith(
        USER_ID_1,
        {
          peerId: USER_ID_2,
          page: 1,
          pageSize: 50,
        },
        expect.any(AbortSignal),
      )
    })
    expect(screen.getByRole('dialog', { name: 'Hộp chat' })).toBeVisible()
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: users[1].displayName,
      }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Đóng chat' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Đính kèm ảnh' }),
    ).not.toBeInTheDocument()
  })

  it('dùng URL ảnh cho form đăng bài của REST backend', async () => {
    const user = userEvent.setup()

    render(<App />)
    await screen.findByText('Mầm xanh tương lai')

    await user.click(
      screen.getByRole('button', { name: /Đăng tác phẩm/ }),
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Đăng tác phẩm mới',
    })
    expect(within(dialog).getByLabelText('URL ảnh tác phẩm')).toBeVisible()
    expect(
      within(dialog).queryByLabelText('Chọn ảnh tác phẩm từ máy'),
    ).not.toBeInTheDocument()
  })

  it('hiển thị hội thoại nhiều lượt và gửi lịch sử cho trợ lý', async () => {
    const user = userEvent.setup()
    apiMock.askAssistant
      .mockResolvedValueOnce({
        status: 'ANSWERED',
        intent: 'COUNT_POSTS_BY_TOPIC',
        answer: 'Hiện có 1 bài viết về chủ đề “Môi trường”.',
        provider: 'LOCAL',
        result: { count: 1, topic: topics[0] },
        conversation: {
          id: ASSISTANT_CONVERSATION_ID,
          title: 'Có bao nhiêu bài về chủ đề môi trường?',
          createdAt: '2026-07-25T10:00:00Z',
          updatedAt: '2026-07-25T10:00:00Z',
        },
      })
      .mockResolvedValueOnce({
        status: 'ANSWERED',
        intent: 'CHAT',
        answer: 'Được chứ! Bạn muốn bắt đầu với màu nước hay màu sáp?',
        provider: 'MODEL_LLM',
        conversation: {
          id: ASSISTANT_CONVERSATION_ID,
          title: 'Có bao nhiêu bài về chủ đề môi trường?',
          createdAt: '2026-07-25T10:00:00Z',
          updatedAt: '2026-07-25T10:01:00Z',
        },
      })

    render(<App />)
    await screen.findByText('Mầm xanh tương lai')

    await user.click(
      screen.getByRole('button', { name: 'Mở trợ lý Artly' }),
    )
    await user.type(
      screen.getByLabelText('Nhắn tin cho Trợ lý Artly'),
      'Có bao nhiêu bài về chủ đề môi trường?',
    )
    await user.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(
      await screen.findByText('Hiện có 1 bài viết về chủ đề “Môi trường”.'),
    ).toBeVisible()
    expect(
      screen.getByLabelText(
        'Bạn: Có bao nhiêu bài về chủ đề môi trường?',
      ),
    ).toBeVisible()
    expect(apiMock.askAssistant).toHaveBeenCalledWith(
      USER_ID_1,
      {
        question: 'Có bao nhiêu bài về chủ đề môi trường?',
      },
    )

    await user.type(
      screen.getByLabelText('Nhắn tin cho Trợ lý Artly'),
      'Gợi ý cho mình một cách vẽ nhé',
    )
    await user.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))

    expect(
      await screen.findByText(
        'Được chứ! Bạn muốn bắt đầu với màu nước hay màu sáp?',
      ),
    ).toBeVisible()
    expect(apiMock.askAssistant).toHaveBeenNthCalledWith(2, USER_ID_1, {
      question: 'Gợi ý cho mình một cách vẽ nhé',
      conversationId: ASSISTANT_CONVERSATION_ID,
    })
  })

  it('tải lịch sử, chọn lại hội thoại và tạo chat mới', async () => {
    const user = userEvent.setup()
    const summary = {
      id: ASSISTANT_CONVERSATION_ID,
      title: 'Bầu trời màu xanh',
      createdAt: '2026-07-25T10:00:00Z',
      updatedAt: '2026-07-25T10:05:00Z',
    }
    apiMock.listAssistantConversations.mockResolvedValue({
      data: [summary],
      pagination: {
        page: 1,
        pageSize: 30,
        totalItems: 1,
        totalPages: 1,
      },
    })
    apiMock.getAssistantConversation.mockResolvedValue({
      ...summary,
      messages: [
        {
          id: '70000000-0000-4000-8000-000000000001',
          role: 'USER',
          content: 'Vì sao bầu trời màu xanh?',
          createdAt: '2026-07-25T10:00:00Z',
        },
        {
          id: '70000000-0000-4000-8000-000000000002',
          role: 'ASSISTANT',
          content: 'Vì ánh sáng xanh bị tán xạ trong khí quyển.',
          createdAt: '2026-07-25T10:00:10Z',
          response: {
            status: 'ANSWERED',
            intent: 'CHAT',
            answer: 'Vì ánh sáng xanh bị tán xạ trong khí quyển.',
            provider: 'MODEL_LLM',
          },
        },
      ],
    })

    render(<App />)
    await screen.findByText('Mầm xanh tương lai')
    await user.click(
      screen.getByRole('button', { name: 'Mở trợ lý Artly' }),
    )

    await user.click(
      await screen.findByRole('button', { name: 'Bầu trời màu xanh' }),
    )

    expect(
      await screen.findByLabelText('Bạn: Vì sao bầu trời màu xanh?'),
    ).toBeVisible()
    expect(
      screen.getByText('Vì ánh sáng xanh bị tán xạ trong khí quyển.'),
    ).toBeVisible()
    expect(apiMock.getAssistantConversation).toHaveBeenCalledWith(
      USER_ID_1,
      ASSISTANT_CONVERSATION_ID,
    )

    await user.click(screen.getByRole('button', { name: 'Chat mới' }))

    expect(
      screen.queryByLabelText('Bạn: Vì sao bầu trời màu xanh?'),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Chào bạn! Mình là Artly/)).toBeVisible()
  })

  it('xóa bài của tài khoản hiện tại và loại bài khỏi bảng tin', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('Mầm xanh tương lai')

    await user.click(
      screen.getByRole('button', {
        name: 'Xóa bài viết Mầm xanh tương lai',
      }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Xóa bài viết' }),
    )

    await waitFor(() => {
      expect(apiMock.deletePost).toHaveBeenCalledWith(
        USER_ID_1,
        POST_ID_1,
      )
      expect(
        screen.queryByRole('article', {
          name: 'Mầm xanh tương lai',
        }),
      ).not.toBeInTheDocument()
    })
  })

  it('đồng bộ badge bình luận theo tổng authoritative từ API danh sách', async () => {
    const user = userEvent.setup()
    apiMock.listPostComments.mockResolvedValueOnce({
      data: [],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 7,
        totalPages: 1,
      },
    })
    render(<App />)

    const postArticle = await screen.findByRole('article', {
      name: 'Mầm xanh tương lai',
    })
    const commentsButton = within(postArticle).getByRole('button', {
      name: 'Bình luận về tác phẩm Mầm xanh tương lai',
    })
    expect(commentsButton).toHaveAccessibleDescription('1 bình luận')

    await user.click(commentsButton)

    await waitFor(() => {
      expect(commentsButton).toHaveAccessibleDescription('7 bình luận')
    })
  })

  it('tải và đăng bình luận rồi cập nhật chính xác số bình luận', async () => {
    const user = userEvent.setup()
    apiMock.createPostComment
      .mockResolvedValueOnce({
        id: '30000000-0000-4000-8000-000000000001',
        postId: POST_ID_1,
        author: users[0],
        body: 'Màu xanh rất hài hòa.',
        createdAt: '2026-07-25T08:30:00+07:00',
      })
      .mockResolvedValueOnce({
        id: '30000000-0000-4000-8000-000000000002',
        postId: POST_ID_1,
        author: users[0],
        body: 'Mình cũng thích phần ánh sáng.',
        createdAt: '2026-07-25T08:31:00+07:00',
      })
    render(<App />)

    const postArticle = await screen.findByRole('article', {
      name: 'Mầm xanh tương lai',
    })
    const commentsButton = within(postArticle).getByRole('button', {
      name: 'Bình luận về tác phẩm Mầm xanh tương lai',
    })
    expect(commentsButton).toHaveAccessibleDescription('1 bình luận')

    await user.click(commentsButton)

    await waitFor(() => {
      expect(apiMock.listPostComments).toHaveBeenCalledWith(
        USER_ID_1,
        POST_ID_1,
        { page: 1, pageSize: 20 },
        expect.any(AbortSignal),
      )
    })

    const commentsRegion = within(postArticle).getByRole('region', {
      name: 'Bình luận của tác phẩm Mầm xanh tương lai',
    })
    await user.type(
      within(commentsRegion).getByLabelText(
        'Viết bình luận cho Mầm xanh tương lai',
      ),
      '  Màu xanh rất hài hòa.  ',
    )
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: 'Đăng bình luận',
      }),
    )

    await waitFor(() => {
      expect(apiMock.createPostComment).toHaveBeenCalledWith(
        USER_ID_1,
        POST_ID_1,
        { body: 'Màu xanh rất hài hòa.' },
      )
    })
    expect(
      within(commentsRegion).getByText('Màu xanh rất hài hòa.'),
    ).toBeVisible()
    expect(commentsButton).toHaveAccessibleDescription('2 bình luận')

    await user.type(
      within(commentsRegion).getByLabelText(
        'Viết bình luận cho Mầm xanh tương lai',
      ),
      'Mình cũng thích phần ánh sáng.',
    )
    await user.click(
      within(commentsRegion).getByRole('button', {
        name: 'Đăng bình luận',
      }),
    )

    await waitFor(() => {
      expect(apiMock.createPostComment).toHaveBeenNthCalledWith(
        2,
        USER_ID_1,
        POST_ID_1,
        { body: 'Mình cũng thích phần ánh sáng.' },
      )
    })
    expect(commentsButton).toHaveAccessibleDescription('3 bình luận')
  })

  it('xóa bình luận của tài khoản hiện tại và đồng bộ số lượng bài viết', async () => {
    const user = userEvent.setup()
    const commentId = '30000000-0000-4000-8000-000000000001'
    apiMock.listPostComments
      .mockResolvedValueOnce({
        data: [
          {
            id: commentId,
            postId: POST_ID_1,
            author: users[0],
            body: 'Bình luận sẽ được xóa.',
            createdAt: '2026-07-25T08:30:00+07:00',
          },
        ],
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
    render(<App />)

    const postArticle = await screen.findByRole('article', {
      name: 'Mầm xanh tương lai',
    })
    const commentsButton = within(postArticle).getByRole('button', {
      name: 'Bình luận về tác phẩm Mầm xanh tương lai',
    })
    expect(commentsButton).toHaveAccessibleDescription('1 bình luận')

    await user.click(commentsButton)
    const commentsRegion = within(postArticle).getByRole('region', {
      name: 'Bình luận của tác phẩm Mầm xanh tương lai',
    })
    expect(
      await within(commentsRegion).findByText(
        'Bình luận sẽ được xóa.',
      ),
    ).toBeVisible()

    await user.click(
      within(commentsRegion).getByRole('button', {
        name:
          'Xóa bình luận số 1 của Trần Minh An: Bình luận sẽ được xóa.',
      }),
    )
    const dialog = within(commentsRegion).getByRole('alertdialog', {
      name: 'Xóa bình luận?',
    })
    await user.click(
      within(dialog).getByRole('button', { name: 'Xóa' }),
    )

    await waitFor(() => {
      expect(apiMock.deletePostComment).toHaveBeenCalledWith(
        USER_ID_1,
        POST_ID_1,
        commentId,
      )
      expect(
        within(commentsRegion).queryByText('Bình luận sẽ được xóa.'),
      ).not.toBeInTheDocument()
    })
    expect(commentsButton).toHaveAccessibleDescription('0 bình luận')
  })

  it('chờ xóa hoàn tất trước khi tải bình luận từ phiên bảng tin mới', async () => {
    const user = userEvent.setup()
    const commentId = '30000000-0000-4000-8000-000000000001'
    let resolveDelete: (() => void) | undefined
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    apiMock.listPostComments
      .mockResolvedValueOnce({
        data: [
          {
            id: commentId,
            postId: POST_ID_1,
            author: users[0],
            body: 'Bình luận đang xóa qua hai phiên.',
            createdAt: '2026-07-25T08:30:00+07:00',
          },
        ],
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
    apiMock.deletePostComment.mockReturnValueOnce(deleteRequest)
    render(<App />)

    let postArticle = await screen.findByRole('article', {
      name: 'Mầm xanh tương lai',
    })
    await user.click(
      within(postArticle).getByRole('button', {
        name: 'Bình luận về tác phẩm Mầm xanh tương lai',
      }),
    )
    let commentsRegion = within(postArticle).getByRole('region', {
      name: 'Bình luận của tác phẩm Mầm xanh tương lai',
    })
    await within(commentsRegion).findByText(
      'Bình luận đang xóa qua hai phiên.',
    )
    await user.click(
      within(commentsRegion).getByRole('button', {
        name:
          'Xóa bình luận số 1 của Trần Minh An: Bình luận đang xóa qua hai phiên.',
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Mở menu tài khoản Trần Minh An',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Xem profile' }))
    const profileRegion = await screen.findByRole('region', {
      name: 'minh.an',
    })
    await user.click(
      within(profileRegion).getByRole('button', { name: 'Bảng tin' }),
    )

    postArticle = await screen.findByRole('article', {
      name: 'Mầm xanh tương lai',
    })
    await user.click(
      within(postArticle).getByRole('button', {
        name: 'Bình luận về tác phẩm Mầm xanh tương lai',
      }),
    )
    commentsRegion = within(postArticle).getByRole('region', {
      name: 'Bình luận của tác phẩm Mầm xanh tương lai',
    })
    expect(
      within(commentsRegion).getByRole('status', {
        name: 'Đang tải bình luận',
      }),
    ).toBeVisible()
    expect(apiMock.listPostComments).toHaveBeenCalledTimes(1)

    resolveDelete?.()

    expect(
      await within(commentsRegion).findByRole('status', {
        name: 'Chưa có bình luận',
      }),
    ).toBeVisible()
    expect(apiMock.listPostComments).toHaveBeenCalledTimes(2)
  })

  it('tải lại profile và bỏ qua kết quả cũ khi xóa bình luận đang chờ', async () => {
    const user = userEvent.setup()
    const commentId = '30000000-0000-4000-8000-000000000001'
    let resolveDelete: (() => void) | undefined
    let resolveStaleProfile:
      | ((response: {
          data: (typeof firstPost)[]
          pagination: typeof emptyPagination
        }) => void)
      | undefined
    const deleteRequest = new Promise<void>((resolve) => {
      resolveDelete = resolve
    })
    const staleProfileRequest = new Promise<{
      data: (typeof firstPost)[]
      pagination: typeof emptyPagination
    }>((resolve) => {
      resolveStaleProfile = resolve
    })
    const feedResponse = {
      data: [firstPost],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    }
    const freshProfilePost = {
      ...firstPost,
      title: 'Hồ sơ đã đồng bộ bình luận',
      commentCount: 0,
    }
    apiMock.listPosts
      .mockResolvedValueOnce(feedResponse)
      .mockReturnValueOnce(staleProfileRequest)
      .mockResolvedValueOnce({
        data: [freshProfilePost],
        pagination: {
          page: 1,
          pageSize: 30,
          totalItems: 1,
          totalPages: 1,
        },
      })
    apiMock.listPostComments.mockResolvedValueOnce({
      data: [
        {
          id: commentId,
          postId: POST_ID_1,
          author: users[0],
          body: 'Bình luận xóa trong lúc mở profile.',
          createdAt: '2026-07-25T08:30:00+07:00',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
      },
    })
    apiMock.deletePostComment.mockReturnValueOnce(deleteRequest)
    render(<App />)

    const postArticle = await screen.findByRole('article', {
      name: 'Mầm xanh tương lai',
    })
    await user.click(
      within(postArticle).getByRole('button', {
        name: 'Bình luận về tác phẩm Mầm xanh tương lai',
      }),
    )
    const commentsRegion = within(postArticle).getByRole('region', {
      name: 'Bình luận của tác phẩm Mầm xanh tương lai',
    })
    await within(commentsRegion).findByText(
      'Bình luận xóa trong lúc mở profile.',
    )
    await user.click(
      within(commentsRegion).getByRole('button', {
        name:
          'Xóa bình luận số 1 của Trần Minh An: Bình luận xóa trong lúc mở profile.',
      }),
    )
    await user.click(
      within(commentsRegion).getByRole('button', { name: 'Xóa' }),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Mở menu tài khoản Trần Minh An',
      }),
    )
    await user.click(screen.getByRole('menuitem', { name: 'Xem profile' }))
    await waitFor(() => {
      expect(apiMock.listPosts).toHaveBeenNthCalledWith(2, USER_ID_1, {
        page: 1,
        pageSize: 30,
        authorId: USER_ID_1,
      })
    })

    resolveDelete?.()

    await waitFor(() => {
      expect(apiMock.listPosts).toHaveBeenNthCalledWith(3, USER_ID_1, {
        page: 1,
        pageSize: 30,
        authorId: USER_ID_1,
      })
    })
    expect(
      await screen.findByText('Hồ sơ đã đồng bộ bình luận'),
    ).toBeVisible()

    await act(async () => {
      resolveStaleProfile?.({
        data: [
          {
            ...firstPost,
            title: 'Hồ sơ cũ không được ghi đè',
            commentCount: 1,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 30,
          totalItems: 1,
          totalPages: 1,
        },
      })
      await staleProfileRequest
    })

    expect(
      screen.queryByText('Hồ sơ cũ không được ghi đè'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Hồ sơ đã đồng bộ bình luận')).toBeVisible()
  })
})
