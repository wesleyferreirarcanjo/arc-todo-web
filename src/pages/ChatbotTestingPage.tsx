import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatbotSettingsNav } from '../components/ChatbotSettingsNav';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  ChatApiError,
  sendChatMessage,
  streamChatMessage,
  type ChatMessage,
  type ChatRequest,
} from '../lib/api/chat';
import { fetchChatbotSettings } from '../lib/api/chatbotSettings';
import {
  getConversation,
  listConversations,
  type ConversationDetail,
  type ConversationSummary,
} from '../lib/api/conversations';
import type { ChatbotSettings } from '../types/chatbotSettings';

interface TestScenario {
  id: string;
  label: string;
  description: string;
  priorMessages: ChatMessage[];
  finalPrompt: string;
}

const SCENARIOS: TestScenario[] = [
  {
    id: 'follow-up-reference',
    label: 'Follow-up reference',
    description:
      'Tests whether the assistant resolves a pronoun from prior task discussion.',
    priorMessages: [
      {
        role: 'user',
        content:
          'We have a task called "Deploy staging API" that is blocked waiting on database migrations.',
      },
      {
        role: 'assistant',
        content:
          'Got it. "Deploy staging API" is blocked on database migrations. I can help track status or create follow-up tasks.',
      },
    ],
    finalPrompt: 'What is blocking it, and what should we do first?',
  },
  {
    id: 'priority-reasoning',
    label: 'Priority reasoning',
    description:
      'Tests context retention when changing priority based on earlier constraints.',
    priorMessages: [
      {
        role: 'user',
        content:
          'The login bug affects all enterprise customers and must ship before Friday.',
      },
      {
        role: 'assistant',
        content:
          'Understood — login bug is critical for enterprise customers with a Friday deadline.',
      },
      {
        role: 'user',
        content: 'Also note the dashboard export issue only affects internal admins.',
      },
      {
        role: 'assistant',
        content:
          'Noted. Dashboard export is lower impact since it only affects internal admins.',
      },
    ],
    finalPrompt:
      'Given what we discussed, which issue should be higher priority and why?',
  },
  {
    id: 'project-scope',
    label: 'Project scope',
    description:
      'Tests project-scoped answers when workspace org/project IDs are sent.',
    priorMessages: [
      {
        role: 'user',
        content: 'Summarize open work for the current project.',
      },
      {
        role: 'assistant',
        content:
          'I can list tasks for the active project. Tell me if you want only in-progress items.',
      },
    ],
    finalPrompt: 'Show in-progress tasks and mention anything due this week.',
  },
];

interface RunResult {
  request: ChatRequest;
  scenarioLabel: string;
  mode: 'stream' | 'sync';
  response: string;
  usedTools: string[];
  elapsedMs: number;
  tokenCount: number;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = /key|secret|token|authorization/i.test(key)
        ? '[REDACTED]'
        : redactSecrets(nested);
    }
    return out;
  }
  return value;
}

function toChatMessages(detail: ConversationDetail): ChatMessage[] {
  return detail.messages.map((message) => ({
    role: message.role,
    content: message.content,
    usedTools: message.usedTools,
  }));
}

function ConfigStatusCard({ settings }: { settings: ChatbotSettings | null }) {
  if (!settings) {
    return (
      <div className="notice-card chatbot-testing-status-card">
        <h3>Chatbot status</h3>
        <p className="subtitle">Settings unavailable.</p>
      </div>
    );
  }

  const configIssues: string[] = [];
  if (!settings.enabled) configIssues.push('Chatbot is disabled.');
  if (!settings.hasApiKey) configIssues.push('No API key configured.');
  if (!settings.model.trim()) configIssues.push('Model is not set.');

  return (
    <div className="notice-card chatbot-testing-status-card">
      <div className="chatbot-testing-status-header">
        <h3>Chatbot status</h3>
        <span
          className={`rag-index-status-badge status-${
            settings.enabled && settings.hasApiKey ? 'completed' : 'failed'
          }`}
        >
          {settings.enabled && settings.hasApiKey ? 'ready' : 'misconfigured'}
        </span>
      </div>
      <p className="subtitle">
        Provider: {settings.provider} · Model: {settings.model} · Temperature:{' '}
        {settings.temperature}
      </p>
      <p className="subtitle">
        History limits: {settings.maxHistoryMessages} messages /{' '}
        {settings.maxHistoryTokens.toLocaleString()} tokens
      </p>
      {configIssues.length > 0 ? (
        <ul className="chatbot-testing-config-issues">
          {configIssues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="subtitle">Configuration looks usable for test runs.</p>
      )}
    </div>
  );
}

function PriorMessagesPreview({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return <p className="subtitle">No prior messages in this run.</p>;
  }

  return (
    <div className="chatbot-testing-message-list">
      {messages.map((message, index) => (
        <article key={`${message.role}-${index}`} className="chatbot-testing-message-card">
          <span className="task-badge">{message.role}</span>
          <p className="chatbot-testing-message-text">{message.content}</p>
        </article>
      ))}
    </div>
  );
}

function ResultCard({ result }: { result: RunResult }) {
  return (
    <div className="notice-card chatbot-testing-results-card">
      <div className="chatbot-testing-result-header">
        <div>
          <h3>Run result</h3>
          <p className="subtitle">
            Scenario: {result.scenarioLabel} · Mode: {result.mode} ·{' '}
            {formatMs(result.elapsedMs)}
          </p>
        </div>
      </div>

      <div className="token-summary-grid chatbot-testing-metric-grid">
        <article className="token-summary-card">
          <span className="token-summary-label">Messages sent</span>
          <strong className="token-summary-value">
            {result.request.messages.length}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Response length</span>
          <strong className="token-summary-value">{result.tokenCount}</strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Tools used</span>
          <strong className="token-summary-value">
            {result.usedTools.length}
          </strong>
        </article>
        <article className="token-summary-card">
          <span className="token-summary-label">Elapsed</span>
          <strong className="token-summary-value">{formatMs(result.elapsedMs)}</strong>
        </article>
      </div>

      <p className="subtitle chatbot-testing-request-summary">
        Org: {result.request.organizationId ?? 'none'} · Project:{' '}
        {result.request.projectId ?? 'none'}
        {result.scenarioLabel.startsWith('Conversation:')
          ? ` · ${result.scenarioLabel}`
          : ''}
      </p>

      <section className="chatbot-testing-result-section">
        <h4>Assistant response</h4>
        <p className="chatbot-testing-response-text">
          {result.response || '(empty response)'}
        </p>
      </section>

      <section className="chatbot-testing-result-section">
        <h4>Used tools</h4>
        {result.usedTools.length === 0 ? (
          <p className="subtitle">No tools reported.</p>
        ) : (
          <div className="chatbot-testing-tool-list">
            {result.usedTools.map((tool) => (
              <span key={tool} className="task-badge">
                {tool}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="chatbot-testing-result-section">
        <h4>Request payload</h4>
        <pre className="chatbot-testing-json">
          {JSON.stringify(redactSecrets(result.request), null, 2)}
        </pre>
      </section>
    </div>
  );
}

export function ChatbotTestingPage() {
  const { currentOrgId, currentProjectId } = useWorkspace();
  const abortRef = useRef<AbortController | null>(null);

  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadedConversation, setLoadedConversation] =
    useState<ConversationDetail | null>(null);

  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [useStreaming, setUseStreaming] = useState(true);
  const [conversationId, setConversationId] = useState('');
  const [finalPrompt, setFinalPrompt] = useState(SCENARIOS[0].finalPrompt);

  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [running, setRunning] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const selectedScenario = useMemo(
    () => SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [chatbotSettings, conversationList] = await Promise.all([
        fetchChatbotSettings(),
        listConversations({
          organizationId: currentOrgId ?? undefined,
          projectId: currentProjectId ?? undefined,
        }),
      ]);
      setSettings(chatbotSettings);
      setConversations(conversationList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatbot testing data');
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, currentProjectId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    setFinalPrompt(selectedScenario.finalPrompt);
  }, [selectedScenario]);

  useEffect(() => {
    if (!conversationId) {
      setLoadedConversation(null);
      return;
    }

    let cancelled = false;
    setLoadingConversation(true);
    setError(null);

    void getConversation(conversationId)
      .then((detail) => {
        if (!cancelled) {
          setLoadedConversation(detail);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadedConversation(null);
          setError(
            err instanceof Error ? err.message : 'Failed to load conversation',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingConversation(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  function buildRequest(prompt: string): ChatRequest {
    const priorMessages = loadedConversation
      ? toChatMessages(loadedConversation)
      : selectedScenario.priorMessages;

    const messages: ChatMessage[] = [
      ...priorMessages,
      { role: 'user', content: prompt.trim() },
    ];

    return {
      messages,
      organizationId: currentOrgId ?? undefined,
      projectId: currentProjectId ?? undefined,
      taskRefs: loadedConversation?.taskRefs,
    };
  }

  async function handleRun(event: React.FormEvent) {
    event.preventDefault();
    if (!finalPrompt.trim() || running) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const request = buildRequest(finalPrompt);
    const startedAt = performance.now();
    const mode = useStreaming ? 'stream' : 'sync';

    setRunning(true);
    setError(null);
    setRawError(null);
    setResult(null);
    setStreamingText('');

    try {
      if (useStreaming) {
        let streamedContent = '';
        const response = await streamChatMessage(
          request,
          {
            onToken: (delta) => {
              streamedContent += delta;
              setStreamingText(streamedContent);
            },
          },
          controller.signal,
        );

        const elapsedMs = Math.round(performance.now() - startedAt);
        setResult({
          request,
          scenarioLabel: loadedConversation
            ? `Conversation: ${loadedConversation.title}`
            : selectedScenario.label,
          mode,
          response: response.message,
          usedTools: response.usedTools ?? [],
          elapsedMs,
          tokenCount: response.message.length,
        });
      } else {
        const response = await sendChatMessage(request);
        const elapsedMs = Math.round(performance.now() - startedAt);
        setResult({
          request,
          scenarioLabel: loadedConversation
            ? `Conversation: ${loadedConversation.title}`
            : selectedScenario.label,
          mode,
          response: response.message,
          usedTools: response.usedTools ?? [],
          elapsedMs,
          tokenCount: response.message.length,
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const message =
        err instanceof Error ? err.message : 'Chatbot test request failed';
      setError(message);

      const detail = redactSecrets(
        err instanceof ChatApiError
          ? {
              status: err.status,
              message: err.message,
              ...(err.detail !== undefined ? { detail: err.detail } : {}),
            }
          : { message: err instanceof Error ? err.message : String(err) },
      );

      setRawError(JSON.stringify(detail, null, 2));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  const previewMessages = loadedConversation
    ? toChatMessages(loadedConversation)
    : selectedScenario.priorMessages;

  return (
    <section className="page-section chatbot-testing-page">
      <div className="page-header">
        <div>
          <h2>Chatbot Testing</h2>
          <p className="subtitle">
            Run predefined or conversation-backed prompts against the chatbot service
            and inspect responses, tools, and timing.
          </p>
        </div>
      </div>

      <ChatbotSettingsNav />

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="subtitle">Loading chatbot testing console...</p> : null}

      {!loading ? (
        <>
          <ConfigStatusCard settings={settings} />

          <form
            className="settings-form-card settings-form-card-wide chatbot-testing-console"
            onSubmit={(event) => void handleRun(event)}
          >
            <section className="settings-section-card">
              <div className="settings-section-header">
                <h3>Test setup</h3>
                <p>
                  Choose a predefined scenario or load an existing conversation, then
                  run with streaming or synchronous mode.
                </p>
              </div>
              <div className="settings-fields-grid">
                <label className="form-field">
                  <span>Scenario</span>
                  <select
                    value={scenarioId}
                    disabled={Boolean(conversationId)}
                    onChange={(event) => setScenarioId(event.target.value)}
                  >
                    {SCENARIOS.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Existing conversation</span>
                  <select
                    value={conversationId}
                    onChange={(event) => setConversationId(event.target.value)}
                  >
                    <option value="">Use scenario history only</option>
                    {conversations.map((conversation) => (
                      <option key={conversation.id} value={conversation.id}>
                        {conversation.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="toggle-row">
                  <span>Streaming mode</span>
                  <input
                    type="checkbox"
                    checked={useStreaming}
                    onChange={(event) => setUseStreaming(event.target.checked)}
                  />
                </label>

                <label className="form-field setting-field-wide">
                  <span>Final user prompt</span>
                  <textarea
                    rows={3}
                    value={finalPrompt}
                    onChange={(event) => setFinalPrompt(event.target.value)}
                    placeholder="Enter the message to send after prior context..."
                  />
                </label>
              </div>
            </section>

            <section className="settings-section-card">
              <div className="settings-section-header">
                <h3>Context preview</h3>
                <p>
                  {conversationId
                    ? loadingConversation
                      ? 'Loading conversation history...'
                      : loadedConversation
                        ? `${loadedConversation.messages.length} persisted messages will precede the final prompt.`
                        : 'Conversation failed to load.'
                    : selectedScenario.description}
                </p>
              </div>
              {!conversationId ? (
                <PriorMessagesPreview messages={previewMessages} />
              ) : loadingConversation ? (
                <p className="subtitle">Loading conversation...</p>
              ) : (
                <PriorMessagesPreview messages={previewMessages} />
              )}
            </section>

            <div className="form-actions settings-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={running || !finalPrompt.trim() || loadingConversation}
              >
                {running
                  ? useStreaming
                    ? 'Streaming...'
                    : 'Running...'
                  : 'Run test'}
              </button>
            </div>
          </form>

          {running && useStreaming && streamingText ? (
            <div className="notice-card chatbot-testing-results-card">
              <h3>Streaming output</h3>
              <p className="chatbot-testing-response-text">{streamingText}</p>
            </div>
          ) : null}

          {result ? <ResultCard result={result} /> : null}

          {rawError ? (
            <div className="notice-card chatbot-testing-error-card">
              <h3>Error details</h3>
              <pre className="chatbot-testing-json">{rawError}</pre>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
