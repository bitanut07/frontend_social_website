import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Post } from '../../types/api'
import { PostMediaGallery } from './PostMediaGallery'

const post: Post = {
  id: '20000000-0000-4000-8000-000000000001',
  title: 'Bộ tranh mùa hạ',
  caption: 'Những khoảnh khắc nhiều màu sắc.',
  imageUrl: 'https://images.example.com/anh-1.jpg',
  imageUrls: [
    'https://images.example.com/anh-1.jpg',
    'https://images.example.com/anh-2.jpg',
    'https://images.example.com/anh-3.jpg',
    'https://images.example.com/anh-4.jpg',
    'https://images.example.com/anh-5.jpg',
    'https://images.example.com/anh-6.jpg',
    'https://images.example.com/anh-7.jpg',
  ],
  author: {
    id: '00000000-0000-4000-8000-000000000001',
    username: 'minh-anh',
    displayName: 'Minh Anh',
    role: 'STUDENT',
    isSuperAdmin: false,
  },
  topics: [],
  reactionCount: 0,
  commentCount: 0,
  viewerHasReacted: false,
  createdAt: '2026-07-30T00:00:00.000Z',
}

describe('PostMediaGallery', () => {
  it('giữ trọn tỉ lệ ảnh đơn thay vì cắt ảnh thành hình vuông', () => {
    render(
      <PostMediaGallery
        post={{ ...post, imageUrls: [post.imageUrl] }}
      />,
    )

    const image = screen.getByRole('img', {
      name: 'Tác phẩm “Bộ tranh mùa hạ” của Minh Anh, ảnh 1 trên 1',
    })
    expect(image).toHaveClass('object-contain')
    expect(image).not.toHaveClass('object-cover')
  })

  it('hiển thị tối đa năm ảnh trong lưới và báo số ảnh còn lại', () => {
    render(<PostMediaGallery post={post} />)

    expect(
      screen.getAllByRole('button', { name: /Mở ảnh \d trên 7/ }),
    ).toHaveLength(5)
    expect(screen.getByText('+2')).toBeVisible()
  })

  it('mở lightbox, zoom ảnh và chuyển ảnh bằng bàn phím', async () => {
    const user = userEvent.setup()
    render(<PostMediaGallery post={post} />)

    const secondTrigger = screen.getByRole('button', {
      name: 'Mở ảnh 2 trên 7 của bài Bộ tranh mùa hạ',
    })
    await user.click(secondTrigger)

    const dialog = screen.getByRole('dialog', {
      name: 'Xem ảnh của bài Bộ tranh mùa hạ',
    })
    expect(within(dialog).getByText('2 / 7')).toBeVisible()
    expect(
      within(dialog).getByRole('img', {
        name: 'Tác phẩm “Bộ tranh mùa hạ” của Minh Anh, ảnh 2 trên 7',
      }),
    ).toHaveAttribute('src', 'https://images.example.com/anh-2.jpg')

    await user.click(
      within(dialog).getByRole('button', { name: 'Phóng to ảnh' }),
    )
    expect(within(dialog).getByText('125%')).toBeVisible()

    const viewport = within(dialog).getByRole('group', {
      name: 'Vùng ảnh có thể kéo để di chuyển',
    })
    const lightboxImage = within(dialog).getByRole('img', {
      name: 'Tác phẩm “Bộ tranh mùa hạ” của Minh Anh, ảnh 2 trên 7',
    })
    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 400 },
    })
    Object.defineProperties(lightboxImage, {
      clientWidth: { configurable: true, value: 600 },
      clientHeight: { configurable: true, value: 400 },
    })

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(viewport, {
      pointerId: 1,
      clientX: 140,
      clientY: 130,
    })
    expect(lightboxImage).toHaveStyle({
      transform: 'translate3d(40px, 30px, 0) scale(1.25)',
    })
    fireEvent.pointerUp(viewport, { pointerId: 1 })

    await user.click(
      within(dialog).getByRole('button', { name: 'Thu nhỏ ảnh' }),
    )
    expect(within(dialog).getByText('100%')).toBeVisible()
    expect(lightboxImage).toHaveStyle({
      transform: 'translate3d(0px, 0px, 0) scale(1)',
    })

    await user.keyboard('{ArrowRight}')
    expect(within(dialog).getByText('3 / 7')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(secondTrigger).toHaveFocus()
  })
})
