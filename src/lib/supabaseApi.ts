import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ApiClient } from './api'
import { requireSupabaseUser, supabase } from './supabase'
import {
  createPublicStorageUrl,
  createSignedStorageUrl,
  removeUploadedObject,
  uploadAvatar,
  uploadMessageAttachment,
  uploadPostMedia,
  type UploadedObject,
} from './storage'
import { createResourceId, parseResourceId } from '../types/api'
import type {
  AssistantConversation,
  AssistantConversationSummary,
  AssistantResponse,
  Message,
  MessageAttachment,
  Pagination,
  PaginationParams,
  Post,
  PostComment,
  ResourceId,
  Topic,
  User,
} from '../types/api'

type Row = Record<string, unknown>

interface TopicStatsRow extends Row {
  published_post_count?: number | string
}

const MESSAGE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

function fail(message: string): never {
  throw new Error(message)
}

function pagination(
  params: PaginationParams,
  defaultPageSize: number,
  totalItems: number,
): Pagination {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? defaultPageSize)
  return {
    page,
    pageSize,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
  }
}

function range(params: PaginationParams, defaultPageSize: number) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.max(1, params.pageSize ?? defaultPageSize)
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1, page, pageSize }
}

function toUser(row: Row): User {
  const rawRole = String(row.role ?? 'STUDENT')
  return {
    id: parseResourceId(row.id),
    username: String(row.username ?? 'artly'),
    displayName: String(row.display_name ?? row.username ?? 'Thành viên Artly'),
    role: rawRole === 'TEACHER' ? 'TEACHER' : 'STUDENT',
    avatarUrl:
      typeof row.avatar_url === 'string' ? row.avatar_url : null,
  }
}

function toTopic(row: Row, aliases: string[] = []): Topic {
  return {
    id: parseResourceId(row.id),
    slug: String(row.slug),
    name: String(row.name),
    aliases,
  }
}

function toPostComment(
  row: Row,
  authors: ReadonlyMap<string, User>,
): PostComment {
  const authorId = parseResourceId(row.user_id, 'user_id')
  return {
    id: parseResourceId(row.id),
    postId: parseResourceId(row.post_id, 'post_id'),
    author: authors.get(authorId) ?? {
      id: authorId,
      username: 'artly',
      displayName: 'Thành viên Artly',
      role: 'STUDENT',
    },
    body: String(row.body ?? ''),
    createdAt: String(row.created_at),
  }
}

function normalizeTopic(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function toAssistantConversationSummary(
  row: Row,
): AssistantConversationSummary {
  return {
    id: parseResourceId(row.id),
    title:
      typeof row.title === 'string' && row.title.trim()
        ? row.title
        : 'Cuộc trò chuyện mới',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  }
}

function storedAssistantResponse(
  content: string,
  value: unknown,
): AssistantResponse {
  if (
    value &&
    typeof value === 'object' &&
    'status' in value &&
    'intent' in value &&
    'answer' in value &&
    'provider' in value
  ) {
    return value as AssistantResponse
  }

  return {
    status: 'ANSWERED',
    intent: 'CHAT',
    answer: content,
    provider: 'LOCAL',
  }
}

async function signedPostMediaUrl(row: Row) {
  if (typeof row.media_url === 'string' && row.media_url) {
    return row.media_url
  }

  if (
    typeof row.storage_bucket !== 'string' ||
    typeof row.storage_path !== 'string'
  ) {
    return ''
  }

  const { data, error } = await supabase.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, 60 * 60)

  if (error) return ''
  return data.signedUrl
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeMessageImageUrl(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    fail('URL ảnh không hợp lệ')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    fail('URL ảnh phải dùng http hoặc https')
  }

  return url.toString()
}

function requireMessageImageFile(file: File) {
  if (!MESSAGE_IMAGE_MIME_TYPES.has(file.type)) {
    fail('Chỉ hỗ trợ gửi ảnh JPEG, PNG hoặc WebP')
  }
}

function originalFileNameFromUrl(value: string) {
  try {
    const pathname = new URL(value).pathname
    const fileName = pathname.split('/').filter(Boolean).pop()
    return fileName ? decodeURIComponent(fileName).slice(0, 255) : null
  } catch {
    return null
  }
}

async function signedMessageAttachmentUrl(row: Row) {
  const fileUrl = optionalString(row.file_url)
  if (fileUrl) return fileUrl

  const bucket = optionalString(row.storage_bucket)
  const path = optionalString(row.storage_path)
  if (!bucket || !path) return ''

  try {
    return await createSignedStorageUrl(bucket, path)
  } catch {
    return ''
  }
}

function toMessageAttachment(
  row: Row,
  url: string,
): MessageAttachment | null {
  const mimeType = optionalString(row.mime_type)
  if (!url || (mimeType && !mimeType.startsWith('image/'))) {
    return null
  }

  return {
    id: parseResourceId(row.id),
    kind: 'IMAGE',
    url,
    mimeType,
    originalFileName: optionalString(row.original_file_name),
    sizeBytes: optionalNumber(row.size_bytes),
    width: optionalNumber(row.width),
    height: optionalNumber(row.height),
  }
}

async function attachmentsByMessageId(messageIds: ResourceId[]) {
  const attachments = new Map<string, MessageAttachment[]>()
  if (messageIds.length === 0) return attachments

  const { data, error } = await supabase
    .from('message_attachments')
    .select(
      'id, message_id, storage_bucket, storage_path, file_url, original_file_name, mime_type, size_bytes, width, height, created_at',
    )
    .in('message_id', messageIds)
    .order('created_at')

  if (error) fail(error.message)

  const rows = data ?? []
  const urls = await Promise.all(rows.map(signedMessageAttachmentUrl))
  rows.forEach((row, index) => {
    const messageId = parseResourceId(row.message_id, 'message_id')
    const attachment = toMessageAttachment(row, urls[index])
    if (!attachment) return
    attachments.set(messageId, [
      ...(attachments.get(messageId) ?? []),
      attachment,
    ])
  })

  return attachments
}

async function conversationIdFor(peerId: ResourceId) {
  const { data, error } = await supabase.rpc(
    'get_or_create_direct_conversation',
    { other_user_id: peerId },
  )
  if (error) fail(error.message)
  if (typeof data !== 'string') fail('Không thể mở cuộc trò chuyện')
  return parseResourceId(data, 'conversation_id')
}

async function mapMessages(
  rows: Row[],
  currentUserId: ResourceId,
  peerId: ResourceId,
): Promise<Message[]> {
  const { data: userRows, error } = await supabase
    .from('users')
    .select('id, username, display_name, role, avatar_url')
    .in('id', [currentUserId, peerId])

  if (error) fail(error.message)
  const users = new Map(
    (userRows ?? []).map((row) => [parseResourceId(row.id), toUser(row)]),
  )
  const currentUser = users.get(currentUserId)
  const peer = users.get(peerId)
  if (!currentUser || !peer) fail('Không tìm thấy thành viên trò chuyện')

  const attachments = await attachmentsByMessageId(
    rows.map((row) => parseResourceId(row.id)),
  )

  return rows.map((row) => {
    const senderId = parseResourceId(row.sender_id, 'sender_id')
    const messageId = parseResourceId(row.id)
    return {
      id: messageId,
      sender: senderId === currentUserId ? currentUser : peer,
      receiver: senderId === currentUserId ? peer : currentUser,
      body: String(row.body ?? ''),
      attachments: attachments.get(messageId) ?? [],
      createdAt: String(row.created_at),
    }
  })
}

export const supabaseApi: ApiClient = {
  async loginDemo() {
    return fail('Demo login bằng username/password chỉ dùng với backend local.')
  },

  async listUsers(params = {}) {
    const { from, to, pageSize } = range(params, 20)
    const { data, error, count } = await supabase
      .from('users')
      .select('id, username, display_name, role, avatar_url', {
        count: 'exact',
      })
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .order('display_name')
      .range(from, to)

    if (error) fail(error.message)
    return {
      data: (data ?? []).map(toUser),
      pagination: pagination(params, pageSize, count ?? 0),
    }
  },

  async updateProfile(userId, input) {
    await requireSupabaseUser(userId)

    const username = input.username.trim()
    const displayName = input.displayName.trim()
    let avatarUrl = input.avatarUrl?.trim() || null

    if (!username || !displayName) {
      fail('Tên hiển thị và username là bắt buộc')
    }

    let uploadedObject: UploadedObject | null = null

    try {
      if (input.avatarFile) {
        uploadedObject = await uploadAvatar(userId, input.avatarFile)
        avatarUrl = createPublicStorageUrl(
          uploadedObject.bucket,
          uploadedObject.path,
        )
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          username,
          display_name: displayName,
          avatar_url: avatarUrl,
        })
        .eq('id', userId)
        .select('id, username, display_name, role, avatar_url')
        .single()

      if (error) fail(error.message)
      return toUser(data)
    } catch (error) {
      if (uploadedObject) {
        await removeUploadedObject(
          uploadedObject.bucket,
          uploadedObject.path,
        ).catch(() => undefined)
      }
      throw error
    }
  },

  async listTopics(params = {}) {
    const { from, to, pageSize } = range(params, 50)
    const { data, error, count } = await supabase
      .from('topics')
      .select('id, slug, name', { count: 'exact' })
      .order('name')
      .range(from, to)

    if (error) fail(error.message)
    const topicRows = data ?? []
    const topicIds = topicRows.map((row) => parseResourceId(row.id))
    const aliasMap = new Map<string, string[]>()

    if (topicIds.length > 0) {
      const { data: aliases, error: aliasError } = await supabase
        .from('topic_aliases')
        .select('topic_id, alias')
        .in('topic_id', topicIds)

      if (aliasError) fail(aliasError.message)
      for (const alias of aliases ?? []) {
        const id = parseResourceId(alias.topic_id, 'topic_id')
        aliasMap.set(id, [
          ...(aliasMap.get(id) ?? []),
          String(alias.alias),
        ])
      }
    }

    return {
      data: topicRows.map((row) =>
        toTopic(row, aliasMap.get(parseResourceId(row.id))),
      ),
      pagination: pagination(params, pageSize, count ?? 0),
    }
  },

  async listPosts(userId, params = {}) {
    await requireSupabaseUser(userId)
    const { from, to, pageSize } = range(params, 10)
    let allowedPostIds: ResourceId[] | null = null

    if (params.topicId) {
      const { data: matches, error: topicError } = await supabase
        .from('post_topics')
        .select('post_id')
        .eq('topic_id', params.topicId)

      if (topicError) fail(topicError.message)
      allowedPostIds = (matches ?? []).map((row) =>
        parseResourceId(row.post_id, 'post_id'),
      )
      if (allowedPostIds.length === 0) {
        return {
          data: [],
          pagination: pagination(params, pageSize, 0),
        }
      }
    }

    let postQuery = supabase
      .from('posts')
      .select(
        'id, user_id, title, caption, exam_name, created_at, published_at',
        { count: 'exact' },
      )
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null)

    if (params.authorId) {
      postQuery = postQuery.eq('user_id', params.authorId)
    }

    if (allowedPostIds) {
      postQuery = postQuery.in('id', allowedPostIds)
    }

    const { data, error, count } = await postQuery
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (error) fail(error.message)
    const postRows = data ?? []
    if (postRows.length === 0) {
      return {
        data: [],
        pagination: pagination(params, pageSize, count ?? 0),
      }
    }

    const postIds = postRows.map((row) => parseResourceId(row.id))
    const authorIds = [
      ...new Set(
        postRows.map((row) => parseResourceId(row.user_id, 'user_id')),
      ),
    ]
    const [
      { data: authorRows, error: authorError },
      { data: mediaRows, error: mediaError },
      { data: linkRows, error: linkError },
      { data: reactionRows, error: reactionError },
      { data: engagementRows, error: engagementError },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, username, display_name, role, avatar_url')
        .in('id', authorIds),
      supabase
        .from('post_media')
        .select(
          'post_id, media_url, storage_bucket, storage_path, position',
        )
        .in('post_id', postIds)
        .order('position'),
      supabase
        .from('post_topics')
        .select('post_id, topics(id, slug, name)')
        .in('post_id', postIds),
      supabase
        .from('post_reactions')
        .select('post_id, user_id')
        .in('post_id', postIds),
      supabase
        .from('post_engagement_stats')
        .select('post_id, comment_count')
        .in('post_id', postIds),
    ])

    const firstError =
      authorError ??
      mediaError ??
      linkError ??
      reactionError ??
      engagementError
    if (firstError) fail(firstError.message)

    const authors = new Map(
      (authorRows ?? []).map((row) => [parseResourceId(row.id), toUser(row)]),
    )
    const media = new Map<string, Row>()
    for (const row of mediaRows ?? []) {
      const id = parseResourceId(row.post_id, 'post_id')
      if (!media.has(id)) media.set(id, row)
    }

    const topics = new Map<string, Topic[]>()
    for (const row of linkRows ?? []) {
      const joined = row.topics
      const topicRow = Array.isArray(joined) ? joined[0] : joined
      if (!topicRow || typeof topicRow !== 'object') continue
      const postId = parseResourceId(row.post_id, 'post_id')
      topics.set(postId, [
        ...(topics.get(postId) ?? []),
        toTopic(topicRow as Row),
      ])
    }

    const reactionCounts = new Map<string, number>()
    const viewerReactions = new Set<string>()
    for (const row of reactionRows ?? []) {
      const postId = parseResourceId(row.post_id, 'post_id')
      reactionCounts.set(postId, (reactionCounts.get(postId) ?? 0) + 1)
      if (parseResourceId(row.user_id, 'user_id') === userId) {
        viewerReactions.add(postId)
      }
    }

    const commentCounts = new Map<string, number>()
    for (const row of engagementRows ?? []) {
      const postId = parseResourceId(row.post_id, 'post_id')
      commentCounts.set(
        postId,
        Math.max(0, optionalNumber(row.comment_count) ?? 0),
      )
    }

    const urls = await Promise.all(
      postRows.map((row) =>
        signedPostMediaUrl(media.get(parseResourceId(row.id)) ?? {}),
      ),
    )

    const posts: Post[] = postRows.map((row, index) => {
      const postId = parseResourceId(row.id)
      const authorId = parseResourceId(row.user_id, 'user_id')
      return {
        id: postId,
        title: String(row.title ?? 'Tác phẩm chưa đặt tên'),
        caption: String(row.caption ?? ''),
        imageUrl: urls[index],
        examName:
          typeof row.exam_name === 'string' ? row.exam_name : undefined,
        author: authors.get(authorId) ?? {
          id: authorId,
          username: 'artly',
          displayName: 'Thành viên Artly',
          role: 'STUDENT',
        },
        topics: topics.get(postId) ?? [],
        reactionCount: reactionCounts.get(postId) ?? 0,
        commentCount: commentCounts.get(postId) ?? 0,
        viewerHasReacted: viewerReactions.has(postId),
        createdAt: String(row.published_at ?? row.created_at),
      }
    })

    return {
      data: posts,
      pagination: pagination(params, pageSize, count ?? 0),
    }
  },

  async createPost(userId, input) {
    await requireSupabaseUser(userId)
    if (!input.imageFile && !input.imageUrl) {
      fail('Hãy chọn ảnh tác phẩm để tải lên')
    }

    const postId = createResourceId()
    const createdAt = new Date().toISOString()
    const { error } = await supabase
      .from('posts')
      .insert({
        id: postId,
        user_id: userId,
        title: input.title,
        caption: input.caption,
        exam_name: input.examName ?? null,
        visibility: 'PUBLIC',
        status: 'DRAFT',
        published_at: null,
      })

    if (error) fail(error.message)

    let uploadedObject: UploadedObject | null = null

    try {
      if (input.imageFile) {
        uploadedObject = await uploadPostMedia(
          userId,
          postId,
          input.imageFile,
        )
      }

      const { error: relationError } = await supabase
        .from('post_topics')
        .insert(
          input.topicIds.map((topicId) => ({
            post_id: postId,
            topic_id: topicId,
            source: 'USER',
          })),
        )
      if (relationError) fail(relationError.message)

      const { error: mediaError } = await supabase
        .from('post_media')
        .insert({
          post_id: postId,
          media_type: 'IMAGE',
          storage_bucket: uploadedObject?.bucket ?? null,
          storage_path: uploadedObject?.path ?? null,
          media_url: uploadedObject ? null : input.imageUrl,
          mime_type: uploadedObject?.mimeType ?? null,
          size_bytes: uploadedObject?.sizeBytes ?? null,
          original_file_name:
            uploadedObject?.originalFileName ?? null,
          position: 0,
          alt_text: input.title,
        })
      if (mediaError) fail(mediaError.message)

      const { error: publishError } = await supabase
        .from('posts')
        .update({
          status: 'PUBLISHED',
          published_at: createdAt,
        })
        .eq('id', postId)
        .eq('user_id', userId)
      if (publishError) fail(publishError.message)

      const imageUrl = uploadedObject
        ? await createSignedStorageUrl(
            uploadedObject.bucket,
            uploadedObject.path,
          )
        : (input.imageUrl ?? '')

      const [{ data: profile }, { data: topicRows }] = await Promise.all([
        supabase
          .from('users')
          .select('id, username, display_name, role, avatar_url')
          .eq('id', userId)
          .single(),
        supabase
          .from('topics')
          .select('id, slug, name')
          .in('id', input.topicIds),
      ])

      return {
        id: postId,
        title: input.title,
        caption: input.caption,
        imageUrl,
        examName: input.examName,
        author: profile
          ? toUser(profile)
          : {
              id: userId,
              username: 'artly',
              displayName: 'Thành viên Artly',
              role: 'STUDENT',
            },
        topics: (topicRows ?? []).map((row) => toTopic(row)),
        reactionCount: 0,
        commentCount: 0,
        viewerHasReacted: false,
        createdAt,
      }
    } catch (createError) {
      await Promise.allSettled([
        ...(uploadedObject
          ? [
              removeUploadedObject(
                uploadedObject.bucket,
                uploadedObject.path,
              ),
            ]
          : []),
        supabase.from('post_media').delete().eq('post_id', postId),
        supabase.from('post_topics').delete().eq('post_id', postId),
        supabase
          .from('posts')
          .update({
            status: 'REMOVED',
            deleted_at: new Date().toISOString(),
          })
          .eq('id', postId)
          .eq('user_id', userId),
      ])
      throw createError
    }
  },

  async listPostComments(userId, postId, params = {}, signal) {
    await requireSupabaseUser(userId)
    const { from, to, pageSize } = range(params, 20)
    let query = supabase
      .from('comments')
      .select('id, post_id, user_id, body, created_at', {
        count: 'exact',
      })
      .eq('post_id', postId)
      .eq('status', 'VISIBLE')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to)

    if (signal) query = query.abortSignal(signal)
    const { data, error, count } = await query
    if (error) fail(error.message)

    const commentRows = data ?? []
    if (commentRows.length === 0) {
      return {
        data: [],
        pagination: pagination(params, pageSize, count ?? 0),
      }
    }

    const authorIds = [
      ...new Set(
        commentRows.map((row) =>
          parseResourceId(row.user_id, 'user_id'),
        ),
      ),
    ]
    const { data: authorRows, error: authorError } = await supabase
      .from('users')
      .select('id, username, display_name, role, avatar_url')
      .in('id', authorIds)

    if (authorError) fail(authorError.message)
    const authors = new Map(
      (authorRows ?? []).map((row) => [
        parseResourceId(row.id),
        toUser(row),
      ]),
    )

    return {
      data: commentRows.map((row) => toPostComment(row, authors)),
      pagination: pagination(params, pageSize, count ?? 0),
    }
  },

  async createPostComment(userId, postId, input) {
    await requireSupabaseUser(userId)
    const body = input.body.trim()
    const characterCount = Array.from(body).length
    if (characterCount < 1 || characterCount > 3000) {
      fail('Bình luận phải có từ 1 đến 3000 ký tự')
    }

    const { data: authorRow, error: authorError } = await supabase
      .from('users')
      .select('id, username, display_name, role, avatar_url')
      .eq('id', userId)
      .single()

    if (authorError) fail(authorError.message)
    const author = toUser(authorRow)
    const { data: commentRow, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        parent_comment_id: null,
        body,
        status: 'VISIBLE',
        deleted_at: null,
      })
      .select('id, post_id, user_id, body, created_at')
      .single()

    if (error) fail(error.message)
    return toPostComment(
      commentRow,
      new Map([[author.id, author]]),
    )
  },

  async deletePostComment(userId, postId, commentId) {
    await requireSupabaseUser(userId)
    const { data, error } = await supabase.rpc('delete_own_comment', {
      target_comment_id: commentId,
      target_post_id: postId,
    })

    if (error) fail(error.message)
    if (data !== true) {
      fail('Không tìm thấy bình luận hoặc bạn không có quyền xóa')
    }
  },

  async deletePost(userId, postId) {
    await requireSupabaseUser(userId)
    const { data, error } = await supabase
      .from('posts')
      .update({
        status: 'REMOVED',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error) fail(error.message)
    if (!data) fail('Không tìm thấy bài viết hoặc bạn không có quyền xóa')
  },

  async setPostReaction(userId, postId, reacted) {
    await requireSupabaseUser(userId)
    if (reacted) {
      const { data: reactionType, error: typeError } = await supabase
        .from('reaction_types')
        .select('id')
        .eq('code', 'LIKE')
        .eq('is_active', true)
        .single()
      if (typeError) fail(typeError.message)

      const { error } = await supabase.from('post_reactions').upsert(
        {
          post_id: postId,
          user_id: userId,
          reaction_type_id: parseResourceId(reactionType.id),
        },
        { onConflict: 'post_id,user_id' },
      )
      if (error) fail(error.message)
    } else {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
      if (error) fail(error.message)
    }

    const { count, error } = await supabase
      .from('post_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
    if (error) fail(error.message)

    return {
      reactionCount: count ?? 0,
      viewerHasReacted: reacted,
    }
  },

  async listMessages(userId, params, signal) {
    await requireSupabaseUser(userId)
    const conversationId = await conversationIdFor(params.peerId)
    const { from, to, pageSize } = range(params, 50)
    let query = supabase
      .from('messages')
      .select('id, sender_id, body, created_at', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (signal) query = query.abortSignal(signal)
    const { data, error, count } = await query
    if (error) fail(error.message)

    return {
      data: await mapMessages(data ?? [], userId, params.peerId),
      pagination: pagination(params, pageSize, count ?? 0),
    }
  },

  async sendMessage(userId, input) {
    await requireSupabaseUser(userId)
    const conversationId = await conversationIdFor(input.recipientId)
    const messageId = createResourceId()
    const createdAt = new Date().toISOString()
    const body = input.body?.trim() ?? ''
    const imageUrl = normalizeMessageImageUrl(input.imageUrl)
    const hasImage = Boolean(input.imageFile || imageUrl)

    if (!body && !hasImage) {
      fail('Nội dung tin nhắn là bắt buộc')
    }
    if (input.imageFile) {
      requireMessageImageFile(input.imageFile)
    }

    let uploadedObject: UploadedObject | null = null
    let messageCreated = false

    try {
      const { error } = await supabase.from('messages').insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: userId,
        message_type: hasImage ? 'IMAGE' : 'TEXT',
        body: body || null,
        metadata: hasImage ? { attachmentCount: 1 } : {},
        created_at: createdAt,
      })

      if (error) fail(error.message)
      messageCreated = true

      if (input.imageFile) {
        uploadedObject = await uploadMessageAttachment(
          conversationId,
          messageId,
          input.imageFile,
        )

        const { error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            storage_bucket: uploadedObject.bucket,
            storage_path: uploadedObject.path,
            original_file_name: uploadedObject.originalFileName,
            mime_type: uploadedObject.mimeType,
            size_bytes: uploadedObject.sizeBytes,
          })
        if (attachmentError) fail(attachmentError.message)
      } else if (imageUrl) {
        const { error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            file_url: imageUrl,
            original_file_name: originalFileNameFromUrl(imageUrl),
            mime_type: 'image/*',
          })
        if (attachmentError) fail(attachmentError.message)
      }

      const [message] = await mapMessages(
        [
          {
            id: messageId,
            sender_id: userId,
            body,
            created_at: createdAt,
          },
        ],
        userId,
        input.recipientId,
      )
      return message
    } catch (error) {
      await Promise.allSettled([
        ...(uploadedObject
          ? [
              removeUploadedObject(
                uploadedObject.bucket,
                uploadedObject.path,
              ),
            ]
          : []),
        supabase
          .from('message_attachments')
          .delete()
          .eq('message_id', messageId),
        ...(messageCreated
          ? [
              supabase
                .from('messages')
                .update({
                  status: 'REMOVED',
                  deleted_at: new Date().toISOString(),
                })
                .eq('id', messageId)
                .eq('sender_id', userId),
            ]
          : []),
      ])
      throw error
    }
  },

  async listAssistantConversations(userId, params = {}) {
    await requireSupabaseUser(userId)
    const { from, to, pageSize } = range(params, 30)
    const { data, error, count } = await supabase
      .from('assistant_conversations')
      .select('id, title, created_at, updated_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to)

    if (error) fail(error.message)
    return {
      data: (data ?? []).map(toAssistantConversationSummary),
      pagination: pagination(params, pageSize, count ?? 0),
    }
  },

  async getAssistantConversation(userId, conversationId) {
    await requireSupabaseUser(userId)
    const { data: conversationRow, error: conversationError } =
      await supabase
        .from('assistant_conversations')
        .select('id, title, created_at, updated_at')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

    if (conversationError) fail(conversationError.message)
    const { data: messageRows, error: messageError } = await supabase
      .from('assistant_messages')
      .select('id, role, content, structured_result, created_at')
      .eq('conversation_id', conversationId)
      .in('role', ['USER', 'ASSISTANT'])
      .order('created_at')
      .order('id')

    if (messageError) fail(messageError.message)
    const conversation: AssistantConversation = {
      ...toAssistantConversationSummary(conversationRow),
      messages: (messageRows ?? []).map((row) => {
        const role = row.role === 'ASSISTANT' ? 'ASSISTANT' : 'USER'
        const content = String(row.content ?? '')
        return {
          id: parseResourceId(row.id),
          role,
          content,
          createdAt: String(row.created_at),
          ...(role === 'ASSISTANT'
            ? {
                response: storedAssistantResponse(
                  content,
                  row.structured_result,
                ),
              }
            : {}),
        }
      }),
    }
    return conversation
  },

  async askAssistant(userId, input) {
    await requireSupabaseUser(userId)
    const question =
      typeof input === 'string' ? input.trim() : input.question.trim()
    const { data: topics, error: topicError } = await supabase
      .from('topics')
      .select('id, slug, name, topic_aliases(alias)')
    if (topicError) fail(topicError.message)

    const normalizedQuestion = normalizeTopic(question)
    const matched = (topics ?? [])
      .map((topic) => {
        const aliases = Array.isArray(topic.topic_aliases)
          ? topic.topic_aliases.map((item) => String(item.alias))
          : []
        const candidates = [String(topic.name), String(topic.slug), ...aliases]
        const score = Math.max(
          ...candidates.map((candidate) => {
            const normalized = normalizeTopic(candidate)
            return normalized && normalizedQuestion.includes(normalized)
              ? normalized.length
              : -1
          }),
        )
        return { topic, aliases, score }
      })
      .sort((a, b) => b.score - a.score)[0]

    if (!matched || matched.score < 0) {
      return {
        status: 'NEEDS_CLARIFICATION',
        intent: 'UNKNOWN',
        answer:
          'Bạn muốn thống kê chủ đề nào? Hãy thử hỏi “Có bao nhiêu bài về cà phê?”.',
        provider: 'LOCAL',
      }
    }

    const matchedTopicId = parseResourceId(matched.topic.id)
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_topic_post_stats',
      {
        requested_topic_id: matchedTopicId,
        from_date: null,
        to_date: null,
      },
    )
    if (statsError) fail(statsError.message)

    const first = (Array.isArray(stats) ? stats[0] : stats) as
      | TopicStatsRow
      | undefined
    const count = Number(first?.published_post_count ?? 0)
    const topic = toTopic(matched.topic, matched.aliases)
    const response: AssistantResponse = {
      status: 'ANSWERED',
      intent: 'COUNT_POSTS_BY_TOPIC',
      answer: `Hiện có ${count} bài viết về chủ đề “${topic.name}”.`,
      provider: 'LOCAL',
      result: { count, topic },
    }
    return response
  },
}

export async function subscribeToDirectMessages(
  peerId: ResourceId,
  onChange: () => void,
): Promise<RealtimeChannel> {
  const conversationId = await conversationIdFor(peerId)
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      onChange,
    )
    .subscribe()
}

export function subscribeToNotifications(
  userId: ResourceId,
  onChange: () => void,
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe()
}

export async function unreadNotificationCount(userId: ResourceId) {
  await requireSupabaseUser(userId)
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) fail(error.message)
  return count ?? 0
}
