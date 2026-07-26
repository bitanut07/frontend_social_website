import { describe, expect, it, vi } from 'vitest'
import type { ApiClient } from './api'
import { createAssistantAwareApi } from './assistantAwareApi'

const USER_ID = '10000000-0000-4000-8000-000000000001'
const CONVERSATION_ID = '70000000-0000-4000-8000-000000000001'

describe('createAssistantAwareApi', () => {
  it('keeps Supabase data methods but routes every assistant method to Goravel', async () => {
    const primaryApi = {
      listUsers: vi.fn().mockResolvedValue({ data: [] }),
      askAssistant: vi.fn(),
      listAssistantConversations: vi.fn(),
      getAssistantConversation: vi.fn(),
    } as unknown as ApiClient
    const assistantApi = {
      askAssistant: vi.fn().mockResolvedValue({ answer: 'Xin chào' }),
      listAssistantConversations: vi
        .fn()
        .mockResolvedValue({ data: [] }),
      getAssistantConversation: vi.fn().mockResolvedValue({ messages: [] }),
    } as unknown as ApiClient
    const api = createAssistantAwareApi(primaryApi, assistantApi)

    await api.listUsers()
    await api.askAssistant(USER_ID, { question: 'Bạn là ai?' })
    await api.listAssistantConversations(USER_ID)
    await api.getAssistantConversation(USER_ID, CONVERSATION_ID)

    expect(primaryApi.listUsers).toHaveBeenCalledOnce()
    expect(primaryApi.askAssistant).not.toHaveBeenCalled()
    expect(primaryApi.listAssistantConversations).not.toHaveBeenCalled()
    expect(primaryApi.getAssistantConversation).not.toHaveBeenCalled()
    expect(assistantApi.askAssistant).toHaveBeenCalledWith(USER_ID, {
      question: 'Bạn là ai?',
    })
    expect(assistantApi.listAssistantConversations).toHaveBeenCalledWith(
      USER_ID,
      undefined,
    )
    expect(assistantApi.getAssistantConversation).toHaveBeenCalledWith(
      USER_ID,
      CONVERSATION_ID,
    )
  })
})
