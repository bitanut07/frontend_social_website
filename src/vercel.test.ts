import { describe, expect, it } from 'vitest'
import vercelConfigText from '../vercel.json?raw'

describe('Vercel SPA routing', () => {
  it('phục vụ các deep link của ứng dụng qua index.html', () => {
    const config = JSON.parse(vercelConfigText) as {
      rewrites?: Array<{ source?: string; destination?: string }>
    }

    expect(config.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/index.html',
    })
  })
})
