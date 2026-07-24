import type { CreatePostInput } from '../../types/api'

export const MAX_SELECTED_TOPICS = 5

export interface CreatePostDraft {
  title: string
  caption: string
  imageUrl: string
  examName: string
  topicIds: number[]
}

export type CreatePostErrors = Partial<
  Record<keyof CreatePostDraft | 'form', string>
>

export const emptyCreatePostDraft: CreatePostDraft = {
  title: '',
  caption: '',
  imageUrl: '',
  examName: '',
  topicIds: [],
}

export function isHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateCreatePost(
  draft: CreatePostDraft,
): CreatePostErrors {
  const errors: CreatePostErrors = {}
  const title = draft.title.trim()
  const caption = draft.caption.trim()
  const imageUrl = draft.imageUrl.trim()
  const examName = draft.examName.trim()

  if (!title) {
    errors.title = 'Hãy nhập tiêu đề cho tác phẩm.'
  } else if (title.length > 120) {
    errors.title = 'Tiêu đề không được vượt quá 120 ký tự.'
  }

  if (!caption) {
    errors.caption = 'Hãy viết vài dòng giới thiệu tác phẩm.'
  } else if (caption.length > 2000) {
    errors.caption = 'Mô tả không được vượt quá 2.000 ký tự.'
  }

  if (!imageUrl) {
    errors.imageUrl = 'Hãy nhập đường dẫn ảnh tác phẩm.'
  } else if (!isHttpImageUrl(imageUrl)) {
    errors.imageUrl = 'Dùng URL đầy đủ bắt đầu bằng http:// hoặc https://.'
  } else if (imageUrl.length > 2048) {
    errors.imageUrl = 'URL ảnh không được vượt quá 2.048 ký tự.'
  }

  if (examName.length > 160) {
    errors.examName = 'Tên bài thi không được vượt quá 160 ký tự.'
  }

  const uniqueTopicIds = new Set(draft.topicIds)
  if (uniqueTopicIds.size === 0) {
    errors.topicIds = 'Chọn ít nhất một chủ đề.'
  } else if (
    uniqueTopicIds.size > MAX_SELECTED_TOPICS ||
    uniqueTopicIds.size !== draft.topicIds.length
  ) {
    errors.topicIds = 'Chọn từ một đến năm chủ đề khác nhau.'
  }

  return errors
}

export function toCreatePostInput(
  draft: CreatePostDraft,
): CreatePostInput {
  const examName = draft.examName.trim()

  return {
    title: draft.title.trim(),
    caption: draft.caption.trim(),
    imageUrl: draft.imageUrl.trim(),
    topicIds: [...new Set(draft.topicIds)],
    ...(examName ? { examName } : {}),
  }
}
