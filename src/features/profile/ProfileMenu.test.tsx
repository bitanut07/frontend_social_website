import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProfileMenu } from './ProfileMenu'
import type { User } from '../../types/api'

const user: User = {
  id: '00000000-0000-4000-8000-000000000001',
  username: 'minh.an',
  displayName: 'Trần Minh An',
  role: 'STUDENT',
  avatarUrl: null,
}

describe('ProfileMenu', () => {
  it('hiển thị đăng xuất và không hiển thị switch account', async () => {
    const userEventApi = userEvent.setup()
    const signOut = vi.fn().mockResolvedValue(undefined)

    render(
      <ProfileMenu
        currentUser={user}
        onEditProfile={vi.fn()}
        onOpenProfile={vi.fn()}
        onSignOut={signOut}
      />,
    )

    await userEventApi.click(
      screen.getByRole('button', {
        name: 'Mở menu tài khoản Trần Minh An',
      }),
    )

    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeVisible()
    expect(screen.queryByText('Tài khoản demo')).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()

    await userEventApi.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))

    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
