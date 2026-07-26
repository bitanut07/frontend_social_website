import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  ApiError,
  createApiClient,
} from './api'
import type { ResourceId } from '../types/api'

const USER_1: ResourceId = '00000000-0000-4000-8000-000000000001'
const USER_2: ResourceId = '00000000-0000-4000-8000-000000000002'
const USER_3: ResourceId = '00000000-0000-4000-8000-000000000003'
const TOPIC_1: ResourceId = '10000000-0000-4000-8000-000000000001'
const TOPIC_2: ResourceId = '10000000-0000-4000-8000-000000000002'
const POST_1: ResourceId = '20000000-0000-4000-8000-000000000001'
const COMMENT_1: ResourceId = '30000000-0000-4000-8000-000000000001'
const MESSAGE_1: ResourceId = '50000000-0000-4000-8000-000000000001'
const ASSISTANT_CONVERSATION_1: ResourceId =
  '60000000-0000-4000-8000-000000000001'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

describe('Artly API client', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('dùng API local mặc định và lấy danh sách người dùng có phân trang', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [],
        pagination: {
          page: 2,
          pageSize: 40,
          totalItems: 0,
          totalPages: 0,
        },
      }),
    )

    const client = createApiClient()
    const result = await client.listUsers({ page: 2, pageSize: 40 })

    expect(API_BASE_URL).toBe('http://127.0.0.1:3000/api/v1')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/v1/users?page=2&pageSize=40',
      expect.objectContaining({
        method: 'GET',
        headers: expect.not.objectContaining({
          'X-User-ID': expect.anything(),
        }),
      }),
    )
    expect(result.pagination.page).toBe(2)
  })

  it('đăng nhập demo bằng username và password qua session API', async () => {
    const demoUser = {
      id: USER_1,
      username: 'thu.ha.cafe',
      displayName: 'Lê Thu Hà',
      role: 'STUDENT',
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: demoUser }, { status: 201 }),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.loginDemo({
      username: demoUser.username,
      password: 'artly-demo',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/demo/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          'X-User-ID': expect.anything(),
        }),
        body: JSON.stringify({
          username: demoUser.username,
          password: 'artly-demo',
        }),
      }),
    )
    expect(result).toEqual(demoUser)
  })

  it('gửi query feed và danh tính demo bằng X-User-ID', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [],
        pagination: {
          page: 3,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        },
      }),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1/' })
    await client.listPosts(USER_1, {
      page: 3,
      pageSize: 10,
      topicId: TOPIC_2,
      authorId: USER_2,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `https://artly.test/api/v1/posts?page=3&pageSize=10&topicId=${TOPIC_2}&authorId=${USER_2}`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'X-User-ID': USER_1,
        }),
      }),
    )
  })

  it('lấy bình luận bài viết có phân trang và hỗ trợ hủy request', async () => {
    const controller = new AbortController()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [],
        pagination: {
          page: 2,
          pageSize: 20,
          totalItems: 0,
          totalPages: 0,
        },
      }),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.listPostComments(
      USER_1,
      POST_1,
      { page: 2, pageSize: 20 },
      controller.signal,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      `https://artly.test/api/v1/posts/${POST_1}/comments?page=2&pageSize=20`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
        signal: controller.signal,
      }),
    )
    expect(result.pagination.page).toBe(2)
  })

  it('tạo bình luận bài viết bằng JSON và trả về comment đã bỏ lớp data', async () => {
    const comment = {
      id: '30000000-0000-4000-8000-000000000001',
      postId: POST_1,
      author: {
        id: USER_1,
        username: 'linh.ve',
        displayName: 'Nguyễn Gia Linh',
        role: 'STUDENT',
      },
      body: 'Em rất thích cách phối màu của bài này.',
      createdAt: '2026-07-25T11:00:00+07:00',
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: comment }, { status: 201 }),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.createPostComment(USER_1, POST_1, {
      body: comment.body,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `https://artly.test/api/v1/posts/${POST_1}/comments`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-ID': USER_1,
        }),
        body: JSON.stringify({ body: comment.body }),
      }),
    )
    expect(result).toEqual(comment)
  })

  it('xóa bình luận bằng DELETE, danh tính tác giả và không gửi body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    await client.deletePostComment(USER_1, POST_1, COMMENT_1)

    expect(fetchMock).toHaveBeenCalledWith(
      `https://artly.test/api/v1/posts/${POST_1}/comments/${COMMENT_1}`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
      }),
    )
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body')
  })

  it('cập nhật profile hiện tại bằng PUT và trả về user đã bỏ lớp data', async () => {
    const updatedUser = {
      id: USER_1,
      username: 'linh.art',
      displayName: 'Nguyễn Gia Linh',
      role: 'STUDENT',
      avatarUrl: 'https://images.example.com/avatar.jpg',
    }
    const input = {
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
    }
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: updatedUser }))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.updateProfile(USER_1, input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/users/me',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-ID': USER_1,
        }),
        body: JSON.stringify(input),
      }),
    )
    expect(result).toEqual(updatedUser)
  })

  it('tạo bài viết bằng JSON và trả về post đã bỏ lớp data', async () => {
    const createdPost = {
      id: POST_1,
      title: 'Buổi sáng trên cánh đồng',
      caption: 'Bài dự thi màu nước.',
      imageUrl: 'https://images.example.com/art/canh-dong.jpg',
      author: {
        id: USER_1,
        username: 'linh.ve',
        displayName: 'Nguyễn Gia Linh',
        role: 'STUDENT',
      },
      topics: [],
      reactionCount: 0,
      commentCount: 0,
      viewerHasReacted: false,
      createdAt: '2026-07-24T08:30:00+07:00',
    }
    const input = {
      title: createdPost.title,
      caption: createdPost.caption,
      imageUrl: createdPost.imageUrl,
      topicIds: [TOPIC_2],
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: createdPost }, { status: 201 }),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.createPost(USER_1, input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-ID': USER_1,
        }),
        body: JSON.stringify(input),
      }),
    )
    expect(result).toEqual(createdPost)
  })

  it('không serialize File vào JSON khi REST backend không có Storage', async () => {
    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })

    await expect(
      client.createPost(USER_1, {
        title: 'Bài dùng file',
        caption: 'REST không nhận upload file.',
        imageFile: new File(['image'], 'bai-ve.png', {
          type: 'image/png',
        }),
        topicIds: [TOPIC_2],
      }),
    ).rejects.toMatchObject({
      code: 'SUPABASE_STORAGE_REQUIRED',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [true, 'PUT'],
    [false, 'DELETE'],
  ] as const)(
    'đồng bộ reaction=%s bằng phương thức %s',
    async (reacted, method) => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: {
            reactionCount: reacted ? 13 : 12,
            viewerHasReacted: reacted,
          },
        }),
      )

      const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
      const result = await client.setPostReaction(USER_3, POST_1, reacted)

      expect(fetchMock).toHaveBeenCalledWith(
        `https://artly.test/api/v1/posts/${POST_1}/reaction`,
        expect.objectContaining({
          method,
          headers: expect.objectContaining({ 'X-User-ID': USER_3 }),
        }),
      )
      expect(result.viewerHasReacted).toBe(reacted)
    },
  )

  it('xóa bài viết bằng danh tính tác giả và DELETE resource', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    await client.deletePost(USER_1, POST_1)

    expect(fetchMock).toHaveBeenCalledWith(
      `https://artly.test/api/v1/posts/${POST_1}`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
      }),
    )
  })

  it('lấy hội thoại với peerId và gửi tin nhắn', async () => {
    const message = {
      id: MESSAGE_1,
      sender: {
        id: USER_1,
        username: 'linh.ve',
        displayName: 'Nguyễn Gia Linh',
        role: 'STUDENT',
      },
      receiver: {
        id: USER_2,
        username: 'co.mai',
        displayName: 'Cô Mai Anh',
        role: 'TEACHER',
      },
      body: 'Cô xem giúp em phần phối màu với ạ.',
      createdAt: '2026-07-24T09:12:00+07:00',
    }
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: [message],
          pagination: {
            page: 1,
            pageSize: 50,
            totalItems: 1,
            totalPages: 1,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: message }, { status: 201 }),
      )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const conversation = await client.listMessages(USER_1, {
      peerId: USER_2,
      page: 1,
      pageSize: 50,
    })
    const sent = await client.sendMessage(USER_1, {
      recipientId: USER_2,
      body: message.body,
    })

    expect(fetchMock.mock.calls[0]).toEqual([
      `https://artly.test/api/v1/messages?peerId=${USER_2}&page=1&pageSize=50`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
      }),
    ])
    expect(fetchMock.mock.calls[1]).toEqual([
      'https://artly.test/api/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
        body: JSON.stringify({
          recipientId: USER_2,
          body: message.body,
        }),
      }),
    ])
    expect(conversation.data).toEqual([message])
    expect(sent).toEqual(message)
  })

  it('không gửi ảnh qua REST backend khi chưa bật Supabase Storage', async () => {
    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })

    await expect(
      client.sendMessage(USER_1, {
        recipientId: USER_2,
        imageFile: new File(['fake-image'], 'bai-ve.png', {
          type: 'image/png',
        }),
      }),
    ).rejects.toMatchObject({
      code: 'SUPABASE_STORAGE_REQUIRED',
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gửi câu hỏi trợ lý và giữ nguyên response trực tiếp của OpenAPI', async () => {
    const answer = {
      status: 'ANSWERED',
      intent: 'COUNT_POSTS_BY_TOPIC',
      answer: 'Hiện có 8 bài viết về chủ đề “Phong cảnh”.',
      provider: 'LOCAL',
      result: {
        count: 8,
        topic: {
          id: TOPIC_2,
          slug: 'phong-canh',
          name: 'Phong cảnh',
          aliases: ['cảnh vật'],
        },
      },
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(answer))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.askAssistant(USER_1, {
      question: 'Có bao nhiêu bài nói về chủ đề phong cảnh?',
      history: [
        { role: 'USER', content: 'Mình muốn xem chủ đề phong cảnh.' },
        {
          role: 'ASSISTANT',
          content: 'Được chứ! Bạn muốn xem hay thống kê?',
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/assistant/questions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
        body: JSON.stringify({
          question: 'Có bao nhiêu bài nói về chủ đề phong cảnh?',
          history: [
            { role: 'USER', content: 'Mình muốn xem chủ đề phong cảnh.' },
            {
              role: 'ASSISTANT',
              content: 'Được chứ! Bạn muốn xem hay thống kê?',
            },
          ],
        }),
      }),
    )
    expect(result).toEqual(answer)
  })

  it('lấy danh sách và nội dung lịch sử trợ lý theo tài khoản', async () => {
    const summary = {
      id: ASSISTANT_CONVERSATION_1,
      title: 'Cách phối màu nước',
      createdAt: '2026-07-25T10:00:00Z',
      updatedAt: '2026-07-25T10:05:00Z',
    }
    const detail = {
      ...summary,
      messages: [
        {
          id: '70000000-0000-4000-8000-000000000001',
          role: 'USER',
          content: 'Phối màu nước thế nào?',
          createdAt: summary.createdAt,
        },
      ],
    }
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          data: [summary],
          pagination: {
            page: 1,
            pageSize: 30,
            totalItems: 1,
            totalPages: 1,
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: detail }))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const list = await client.listAssistantConversations(USER_1, {
      page: 1,
      pageSize: 30,
    })
    const conversation = await client.getAssistantConversation(
      USER_1,
      ASSISTANT_CONVERSATION_1,
    )

    expect(fetchMock.mock.calls[0]).toEqual([
      'https://artly.test/api/v1/assistant/conversations?page=1&pageSize=30',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
      }),
    ])
    expect(fetchMock.mock.calls[1]).toEqual([
      `https://artly.test/api/v1/assistant/conversations/${ASSISTANT_CONVERSATION_1}`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
      }),
    ])
    expect(list.data).toEqual([summary])
    expect(conversation).toEqual(detail)
  })

  it('gửi conversationId khi tiếp tục một lịch sử trợ lý', async () => {
    const answer = {
      status: 'ANSWERED',
      intent: 'CHAT',
      answer: 'Mình sẽ tiếp tục từ nội dung trước đó.',
      provider: 'MODEL_LLM',
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(answer))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    await client.askAssistant(USER_1, {
      question: 'Nói tiếp nhé',
      conversationId: ASSISTANT_CONVERSATION_1,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/assistant/questions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          question: 'Nói tiếp nhé',
          conversationId: ASSISTANT_CONVERSATION_1,
        }),
      }),
    )
  })

  it('ném ApiError có cấu trúc khi backend trả lỗi chuẩn', async () => {
    const details = {
      fields: {
        caption: ['Nội dung mô tả là bắt buộc.'],
      },
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu không hợp lệ',
            details,
          },
        },
        { status: 422 },
      ),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const request = client.createPost(USER_1, {
      title: 'Bài vẽ',
      caption: '',
      imageUrl: 'https://images.example.com/art.jpg',
      topicIds: [TOPIC_1],
    })

    await expect(request).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      details,
    })
    await expect(request).rejects.toBeInstanceOf(ApiError)
  })

  it('chuẩn hóa lỗi mạng thành ApiError để UI xử lý thống nhất', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const request = client.listTopics()

    await expect(request).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'NETWORK_ERROR',
    })
  })
})
