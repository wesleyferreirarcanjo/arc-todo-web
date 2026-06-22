export interface ChatbotSettings {
  provider: string;
  baseUrl: string;
  model: string;
  temperature: number;
  enabled: boolean;
  hasApiKey: boolean;
  maxHistoryMessages: number;
  maxHistoryTokens: number;
}

export interface UpdateChatbotSettingsInput {
  provider?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  enabled?: boolean;
  maxHistoryMessages?: number;
  maxHistoryTokens?: number;
}
