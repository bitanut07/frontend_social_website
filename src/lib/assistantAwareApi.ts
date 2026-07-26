import type { ApiClient } from './api'

export function createAssistantAwareApi(
  primaryApi: ApiClient,
  assistantApi: ApiClient,
): ApiClient {
  return {
    ...primaryApi,
    askAssistant: (userId, input) =>
      assistantApi.askAssistant(userId, input),
    listAssistantConversations: (userId, params) =>
      assistantApi.listAssistantConversations(userId, params),
    getAssistantConversation: (userId, conversationId) =>
      assistantApi.getAssistantConversation(userId, conversationId),
  }
}
