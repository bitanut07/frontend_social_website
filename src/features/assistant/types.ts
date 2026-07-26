import type {
  AssistantConversationRole,
  AssistantResponse,
  ResourceId,
} from '../../types/api'

export interface AssistantChatMessage {
  id: ResourceId
  role: AssistantConversationRole
  content: string
  response?: AssistantResponse
}
