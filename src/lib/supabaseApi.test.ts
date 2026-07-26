import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResourceId } from '../types/api'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insertComment: vi.fn(),
  rpc: vi.fn(),
  requireSupabaseUser: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
  requireSupabaseUser: mocks.requireSupabaseUser,
}))

vi.mock('./storage', () => ({
  createPublicStorageUrl: vi.fn(),
  createSignedStorageUrl: vi.fn(),
  removeUploadedObject: vi.fn(),
  uploadAvatar: vi.fn(),
  uploadMessageAttachment: vi.fn(),
  uploadPostMedia: vi.fn(),
}))

import { supabaseApi } from './supabaseApi'

const USER_ID: ResourceId = '00000000-0000-4000-8000-000000000001'
const POST_ID: ResourceId = '20000000-0000-4000-8000-000000000001'
const COMMENT_ID: ResourceId = '30000000-0000-4000-8000-000000000001'

describe('Supabase comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSupabaseUser.mockResolvedValue({ id: USER_ID })

    mocks.insertComment.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: '30000000-0000-4000-8000-000000000001',
            post_id: POST_ID,
            user_id: USER_ID,
            body: 'Bình luận mới',
            created_at: '2026-07-25T16:00:00Z',
          },
          error: null,
        }),
      }),
    })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'comments') {
        return { insert: mocks.insertComment }
      }
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Không thể tải hồ sơ tác giả' },
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('không insert bình luận nếu lookup tác giả thất bại', async () => {
    await expect(
      supabaseApi.createPostComment(USER_ID, POST_ID, {
        body: 'Bình luận mới',
      }),
    ).rejects.toThrow('Không thể tải hồ sơ tác giả')

    expect(mocks.insertComment).not.toHaveBeenCalled()
  })

  it('xóa bình luận qua RPC hẹp với đúng comment và post', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: null })

    await supabaseApi.deletePostComment(USER_ID, POST_ID, COMMENT_ID)

    expect(mocks.requireSupabaseUser).toHaveBeenCalledWith(USER_ID)
    expect(mocks.rpc).toHaveBeenCalledWith('delete_own_comment', {
      target_comment_id: COMMENT_ID,
      target_post_id: POST_ID,
    })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('báo lỗi chung khi RPC xóa bình luận trả false', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null })

    await expect(
      supabaseApi.deletePostComment(USER_ID, POST_ID, COMMENT_ID),
    ).rejects.toThrow(
      'Không tìm thấy bình luận hoặc bạn không có quyền xóa',
    )
  })

  it('báo lỗi khi RPC xóa bình luận thất bại', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Không thể xóa bình luận' },
    })

    await expect(
      supabaseApi.deletePostComment(USER_ID, POST_ID, COMMENT_ID),
    ).rejects.toThrow('Không thể xóa bình luận')
  })
})
