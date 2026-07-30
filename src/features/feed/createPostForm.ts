import type { CreatePostInput, ResourceId } from '../../types/api'
import type { PostImageInputMode } from './feedTypes'

export const MAX_SELECTED_TOPICS = 5
export const MAX_POST_IMAGES = 10
export const MAX_POST_IMAGE_BYTES = 50 * 1024 * 1024
export const POST_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export interface CreatePostDraft {
  title: string
  caption: string
  imageFiles: File[]
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
  imageFiles: [],
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
    if (draft.imageFiles.length === 0) {
      errors.imageFiles = 'Hãy chọn ảnh tác phẩm để tải lên.'
    } else if (draft.imageFiles.length > MAX_POST_IMAGES) {
      errors.imageFiles =
        `Mỗi bài chỉ được đăng tối đa ${MAX_POST_IMAGES} ảnh.`
    } else {
      const unsupportedFile = draft.imageFiles.find(
        (file) =>
          !POST_IMAGE_MIME_TYPES.includes(
            file.type as (typeof POST_IMAGE_MIME_TYPES)[number],
          ),
      )
      const oversizedFile = draft.imageFiles.find(
        (file) =>
          file.size <= 0 || file.size > MAX_POST_IMAGE_BYTES,
      )

      if (unsupportedFile) {
        errors.imageFiles = 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'
      } else if (oversizedFile) {
        errors.imageFiles = 'Mỗi ảnh phải có dung lượng không quá 50 MB.'
      }
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
  const imageFiles = [...draft.imageFiles]

  return {
    title: draft.title.trim(),
    caption: draft.caption.trim(),
    ...(imageInputMode === 'url'
      ? { imageUrl }
      : imageFiles.length === 1
        ? { imageFile: imageFiles[0] }
        : imageFiles.length > 1
          ? { imageFiles }
          : {}),
    topicIds: [...new Set(draft.topicIds)],
    ...(examName ? { examName } : {}),
  }
}
