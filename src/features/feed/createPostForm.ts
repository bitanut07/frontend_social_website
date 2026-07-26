import type { CreatePostInput, ResourceId } from '../../types/api'
import type { PostImageInputMode } from './feedTypes'

export const MAX_SELECTED_TOPICS = 5
export const MAX_POST_IMAGE_BYTES = 50 * 1024 * 1024
export const POST_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export interface CreatePostDraft {
  title: string
  caption: string
  imageFile: File | null
  imageUrl: string
  examName: string
  topicIds: ResourceId[]
}

export type CreatePostErrors = Partial<
  Record<keyof CreatePostDraft | 'form', string>
>

export const emptyCreatePostDraft: CreatePostDraft = {
  title: '',
  caption: '',
  imageFile: null,
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
  imageInputMode: PostImageInputMode = 'upload',
): CreatePostErrors {
  const errors: CreatePostErrors = {}
  const title = draft.title.trim()
  const caption = draft.caption.trim()
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

  if (imageInputMode === 'url') {
    const imageUrl = draft.imageUrl.trim()
    if (!imageUrl) {
      errors.imageUrl = 'Hãy nhập URL ảnh tác phẩm.'
    } else if (!isHttpImageUrl(imageUrl)) {
      errors.imageUrl = 'URL ảnh phải bắt đầu bằng http:// hoặc https://.'
    }
  } else {
    if (!draft.imageFile) {
      errors.imageFile = 'Hãy chọn ảnh tác phẩm để tải lên.'
    } else if (
      !POST_IMAGE_MIME_TYPES.includes(
        draft.imageFile.type as (typeof POST_IMAGE_MIME_TYPES)[number],
      )
    ) {
      errors.imageFile = 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'
    } else if (
      draft.imageFile.size <= 0 ||
      draft.imageFile.size > MAX_POST_IMAGE_BYTES
    ) {
      errors.imageFile = 'Ảnh phải có dung lượng không quá 50 MB.'
    }
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
  imageInputMode: PostImageInputMode = 'upload',
): CreatePostInput {
  const examName = draft.examName.trim()
  const imageUrl = draft.imageUrl.trim()

  return {
    title: draft.title.trim(),
    caption: draft.caption.trim(),
    ...(imageInputMode === 'url'
      ? { imageUrl }
      : draft.imageFile
        ? { imageFile: draft.imageFile }
        : {}),
    topicIds: [...new Set(draft.topicIds)],
    ...(examName ? { examName } : {}),
  }
}
