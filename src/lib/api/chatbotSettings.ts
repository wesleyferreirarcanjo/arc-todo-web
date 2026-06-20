import { apiRequest } from './client';
import type {
  ChatbotSettings,
  UpdateChatbotSettingsInput,
} from '../../types/chatbotSettings';

export function fetchChatbotSettings(): Promise<ChatbotSettings> {
  return apiRequest<ChatbotSettings>('/chatbot-settings');
}

export function updateChatbotSettings(
  input: UpdateChatbotSettingsInput,
): Promise<ChatbotSettings> {
  return apiRequest<ChatbotSettings>('/chatbot-settings', {
    method: 'PUT',
    body: input,
  });
}
