import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  ApiError,
  createApiClient,
} from './api'

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
    await client.listPosts(7, { page: 3, pageSize: 10, topicId: 2 })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/posts?page=3&pageSize=10&topicId=2',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'X-User-ID': '7',
        }),
      }),
    )
  })

  it('tạo bài viết bằng JSON và trả về post đã bỏ lớp data', async () => {
    const createdPost = {
      id: 18,
      title: 'Buổi sáng trên cánh đồng',
      caption: 'Bài dự thi màu nước.',
      imageUrl: 'https://images.example.com/art/canh-dong.jpg',
      author: {
        id: 1,
        username: 'linh.ve',
        displayName: 'Nguyễn Gia Linh',
        role: 'STUDENT',
      },
      topics: [],
      reactionCount: 0,
      viewerHasReacted: false,
      createdAt: '2026-07-24T08:30:00+07:00',
    }
    const input = {
      title: createdPost.title,
      caption: createdPost.caption,
      imageUrl: createdPost.imageUrl,
      topicIds: [2],
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: createdPost }, { status: 201 }),
    )

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.createPost(1, input)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-ID': '1',
        }),
        body: JSON.stringify(input),
      }),
    )
    expect(result).toEqual(createdPost)
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
      const result = await client.setPostReaction(4, 18, reacted)

      expect(fetchMock).toHaveBeenCalledWith(
        'https://artly.test/api/v1/posts/18/reaction',
        expect.objectContaining({
          method,
          headers: expect.objectContaining({ 'X-User-ID': '4' }),
        }),
      )
      expect(result.viewerHasReacted).toBe(reacted)
    },
  )

  it('lấy hội thoại với peerId và gửi tin nhắn', async () => {
    const message = {
      id: 36,
      sender: {
        id: 1,
        username: 'linh.ve',
        displayName: 'Nguyễn Gia Linh',
        role: 'STUDENT',
      },
      receiver: {
        id: 2,
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
    const conversation = await client.listMessages(1, {
      peerId: 2,
      page: 1,
      pageSize: 50,
    })
    const sent = await client.sendMessage(1, {
      recipientId: 2,
      body: message.body,
    })

    expect(fetchMock.mock.calls[0]).toEqual([
      'https://artly.test/api/v1/messages?peerId=2&page=1&pageSize=50',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-User-ID': '1' }),
      }),
    ])
    expect(fetchMock.mock.calls[1]).toEqual([
      'https://artly.test/api/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-User-ID': '1' }),
        body: JSON.stringify({
          recipientId: 2,
          body: message.body,
        }),
      }),
    ])
    expect(conversation.data).toEqual([message])
    expect(sent).toEqual(message)
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
          id: 2,
          slug: 'phong-canh',
          name: 'Phong cảnh',
          aliases: ['cảnh vật'],
        },
      },
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(answer))

    const client = createApiClient({ baseUrl: 'https://artly.test/api/v1' })
    const result = await client.askAssistant(
      1,
      'Có bao nhiêu bài nói về chủ đề phong cảnh?',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/assistant/questions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-User-ID': '1' }),
        body: JSON.stringify({
          question: 'Có bao nhiêu bài nói về chủ đề phong cảnh?',
        }),
      }),
    )
    expect(result).toEqual(answer)
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
    const request = client.createPost(1, {
      title: 'Bài vẽ',
      caption: '',
      imageUrl: 'https://images.example.com/art.jpg',
      topicIds: [1],
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
