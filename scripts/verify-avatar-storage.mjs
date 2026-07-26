import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error(
    'Thiếu SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY hoặc SUPABASE_SECRET_KEY.',
  )
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
}
const admin = createClient(supabaseUrl, secretKey, clientOptions)
const userClient = createClient(
  supabaseUrl,
  publishableKey,
  clientOptions,
)

const testId = crypto.randomUUID()
const email = `artly-avatar-storage-${testId}@example.com`
const password = `Artly!9-${crypto.randomUUID()}`
const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

let userId
let ownerPath
let foreignPath
let failure
const cleanupErrors = []

function storageBody() {
  return new Blob([pngBytes], { type: 'image/png' })
}

function requireSuccess(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

try {
  const { data: buckets, error: bucketError } =
    await admin.storage.listBuckets()
  requireSuccess(bucketError, 'Không thể đọc danh sách bucket')

  const avatarsBucket = buckets.find((bucket) => bucket.id === 'avatars')
  if (
    !avatarsBucket ||
    !avatarsBucket.public ||
    avatarsBucket.file_size_limit !== 5 * 1024 * 1024 ||
    !['image/jpeg', 'image/png', 'image/webp'].every((mimeType) =>
      avatarsBucket.allowed_mime_types?.includes(mimeType),
    )
  ) {
    throw new Error('Bucket avatars chưa đúng cấu hình public/size/MIME.')
  }

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        accountType: 'STUDENT',
        full_name: 'Avatar Storage Smoke Test',
      },
    })
  requireSuccess(createUserError, 'Không thể tạo tài khoản test')
  userId = createdUser.user?.id
  if (!userId) {
    throw new Error('Supabase không trả về UUID tài khoản test.')
  }

  const { error: signInError } =
    await userClient.auth.signInWithPassword({ email, password })
  requireSuccess(signInError, 'Không thể đăng nhập tài khoản test')

  ownerPath = `${userId}/${crypto.randomUUID()}.png`
  const { error: ownerUploadError } = await userClient.storage
    .from('avatars')
    .upload(ownerPath, storageBody(), {
      contentType: 'image/png',
      upsert: false,
    })
  requireSuccess(ownerUploadError, 'Owner không upload được avatar')

  foreignPath = `${crypto.randomUUID()}/${crypto.randomUUID()}.png`
  const { error: foreignUploadError } = await userClient.storage
    .from('avatars')
    .upload(foreignPath, storageBody(), {
      contentType: 'image/png',
      upsert: false,
    })
  if (!foreignUploadError) {
    throw new Error('Policy cho phép upload vào folder UUID của user khác.')
  }

  const {
    data: { publicUrl },
  } = userClient.storage.from('avatars').getPublicUrl(ownerPath)
  const publicResponse = await fetch(publicUrl, { cache: 'no-store' })
  if (!publicResponse.ok) {
    throw new Error(
      `Không đọc được avatar public (HTTP ${publicResponse.status}).`,
    )
  }

  const { data: updatedProfile, error: profileError } = await userClient
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', userId)
    .select('avatar_url')
    .single()
  requireSuccess(profileError, 'Không cập nhật được users.avatar_url')
  if (updatedProfile.avatar_url !== publicUrl) {
    throw new Error('users.avatar_url không lưu đúng URL vừa upload.')
  }

  console.log(
    JSON.stringify(
      {
        bucketConfigured: true,
        ownerUploadAllowed: true,
        foreignFolderDenied: true,
        profileUpdated: true,
        publicReadAllowed: true,
      },
      null,
      2,
    ),
  )
} catch (error) {
  failure = error
} finally {
  if (ownerPath) {
    const { error } = await admin.storage
      .from('avatars')
      .remove([ownerPath])
    if (error) cleanupErrors.push(`owner object: ${error.message}`)
  }
  if (foreignPath) {
    const { error } = await admin.storage
      .from('avatars')
      .remove([foreignPath])
    if (error) cleanupErrors.push(`foreign object: ${error.message}`)
  }

  await userClient.auth.signOut({ scope: 'local' })

  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) cleanupErrors.push(`test user: ${error.message}`)
  }
}

if (cleanupErrors.length > 0) {
  throw new Error(`Không dọn sạch smoke test: ${cleanupErrors.join('; ')}`)
}
if (failure) {
  throw failure
}
