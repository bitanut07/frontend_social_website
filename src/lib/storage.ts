import { supabase } from './supabase'
import type { ResourceId } from '../types/api'

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const POST_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'video/mp4',
  'video/webm',
])
const MESSAGE_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'video/mp4',
  'application/pdf',
])

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}

const ALLOWED_SOURCE_EXTENSIONS: Record<string, ReadonlySet<string>> = {
  'image/jpeg': new Set(['jpg', 'jpeg']),
  'image/png': new Set(['png']),
  'image/webp': new Set(['webp']),
  'video/mp4': new Set(['mp4']),
  'video/webm': new Set(['webm']),
  'application/pdf': new Set(['pdf']),
  'text/plain': new Set(['txt']),
}

interface UploadRule {
  mimeTypes: Set<string>
  maxBytes: number
}

const UPLOAD_RULES: Record<string, UploadRule> = {
  avatars: {
    mimeTypes: IMAGE_MIME_TYPES,
    maxBytes: 5 * 1024 * 1024,
  },
  'post-media': {
    mimeTypes: POST_MIME_TYPES,
    maxBytes: 50 * 1024 * 1024,
  },
  'message-attachments': {
    mimeTypes: MESSAGE_MIME_TYPES,
    maxBytes: 50 * 1024 * 1024,
  },
  'chatbot-files': {
    mimeTypes: new Set([
      ...IMAGE_MIME_TYPES,
      'application/pdf',
      'text/plain',
    ]),
    maxBytes: 20 * 1024 * 1024,
  },
}

function validateFile(bucket: string, file: File) {
  const rule = UPLOAD_RULES[bucket]
  if (!rule) {
    throw new Error('Bucket tải lên không được hỗ trợ')
  }
  if (!rule.mimeTypes.has(file.type)) {
    throw new Error('Định dạng tệp không được hỗ trợ')
  }
  if (!EXTENSIONS[file.type]) {
    throw new Error('Không xác định được phần mở rộng an toàn')
  }
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (
    !extension ||
    !ALLOWED_SOURCE_EXTENSIONS[file.type]?.has(extension)
  ) {
    throw new Error('Phần mở rộng tệp không khớp với định dạng nội dung')
  }
  if (file.size <= 0 || file.size > rule.maxBytes) {
    throw new Error('Kích thước tệp vượt quá giới hạn cho phép')
  }
}

export interface UploadedObject {
  bucket: string
  path: string
  mimeType: string
  sizeBytes: number
  originalFileName: string
}

async function upload(
  bucket: string,
  pathPrefix: string,
  file: File,
): Promise<UploadedObject> {
  validateFile(bucket, file)
  const extension = EXTENSIONS[file.type]
  const path = `${pathPrefix}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  return {
    bucket,
    path,
    mimeType: file.type,
    sizeBytes: file.size,
    originalFileName: file.name,
  }
}

export function uploadAvatar(userId: ResourceId, file: File) {
  return upload('avatars', userId, file)
}

export function uploadPostMedia(
  userId: ResourceId,
  postId: ResourceId,
  file: File,
) {
  return upload('post-media', `${userId}/${postId}`, file)
}

export function uploadMessageAttachment(
  conversationId: ResourceId,
  messageId: ResourceId,
  file: File,
) {
  return upload(
    'message-attachments',
    `${conversationId}/${messageId}`,
    file,
  )
}

export function uploadAssistantFile(
  userId: ResourceId,
  conversationId: ResourceId,
  file: File,
) {
  return upload(
    'chatbot-files',
    `${userId}/${conversationId}`,
    file,
  )
}

export async function removeUploadedObject(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    throw new Error(error.message)
  }
}

export async function createSignedStorageUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    throw new Error(error.message)
  }

  return data.signedUrl
}

export function createPublicStorageUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
