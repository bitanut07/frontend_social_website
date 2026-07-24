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
const MESSAGE_1: ResourceId = '50000000-0000-4000-8000-000000000001'

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
    await client.listPosts(USER_1, {
      page: 3,
      pageSize: 10,
      topicId: TOPIC_2,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `https://artly.test/api/v1/posts?page=3&pageSize=10&topicId=${TOPIC_2}`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'X-User-ID': USER_1,
        }),
      }),
    )
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
    const result = await client.askAssistant(
      USER_1,
      'Có bao nhiêu bài nói về chủ đề phong cảnh?',
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://artly.test/api/v1/assistant/questions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-User-ID': USER_1 }),
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
