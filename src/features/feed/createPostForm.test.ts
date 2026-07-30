import { describe, expect, it } from 'vitest'
import {
  MAX_POST_IMAGES,
  emptyCreatePostDraft,
  toCreatePostInput,
  validateCreatePost,
} from './createPostForm'

function imageFile(name: string) {
  return new File(['image bytes'], name, { type: 'image/png' })
}

describe('createPostForm nhiều ảnh', () => {
  it('chuyển toàn bộ file đã chọn vào dữ liệu tạo bài', () => {
    const imageFiles = [imageFile('mot.png'), imageFile('hai.png')]
    const input = toCreatePostInput({
      ...emptyCreatePostDraft,
      title: 'Bộ tranh',
      caption: 'Hai góc nhìn.',
      imageFiles,
      topicIds: ['10000000-0000-4000-8000-000000000001'],
    })

    expect(input.imageFiles).toEqual(imageFiles)
  })

  it('không cho chọn quá giới hạn ảnh của một bài post', () => {
    const errors = validateCreatePost({
      ...emptyCreatePostDraft,
      title: 'Bộ tranh',
      caption: 'Nhiều góc nhìn.',
      imageFiles: Array.from({ length: MAX_POST_IMAGES + 1 }, (_, index) =>
        imageFile(`${index}.png`),
      ),
      topicIds: ['10000000-0000-4000-8000-000000000001'],
    })

    expect(errors.imageFiles).toBe(
      `Mỗi bài chỉ được đăng tối đa ${MAX_POST_IMAGES} ảnh.`,
    )
  })
})
