import { ChatApiError, sendChatMessage } from '../../lib/api/chat';
import { ChoiceGroup } from '../ChoiceGroup';
import { languagePrompt } from '../../lib/names/prompts';
import type { NameCandidate } from '../../types/name-session';
import { NamesSignalHeading } from './NamesSignalHeading';

const LANGUAGE_OPTIONS = [
  { value: 'unknown', label: 'Unknown', unknown: true },
  { value: 'clear', label: 'Clear' },
  { value: 'concern', label: 'Concern' },
];

export function LanguageJudgmentBlock(props: {
  candidate: NameCandidate;
  orgId: string;
  projectId: string;
  onUpdate: (candidate: NameCandidate) => void;
}) {
  const { candidate } = props;

  return (
    <div className="names-card-block">
      <NamesSignalHeading id="language" />
      <div className="names-inline">
        {['Português', 'Inglês'].map((language) => {
          const manual = (candidate.languageChecks?.manual ?? []).find(
            (item) => item.language === language,
          );
          return (
            <div key={language} className="names-judgment">
              <span>{language}</span>
              <ChoiceGroup
                name={`language-${candidate.id}-${language}`}
                label={`${language} result`}
                value={manual?.result ?? 'unknown'}
                options={LANGUAGE_OPTIONS}
                onChange={(next) => {
                  const result = next as 'clear' | 'concern' | 'unknown';
                  const rest = (candidate.languageChecks?.manual ?? []).filter(
                    (item) => item.language !== language,
                  );
                  props.onUpdate({
                    ...candidate,
                    languageChecks: {
                      ...candidate.languageChecks,
                      manual: [
                        ...rest,
                        {
                          language,
                          result,
                          note: manual?.note ?? '',
                        },
                      ],
                    },
                  });
                }}
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={async () => {
          try {
            const reply = await sendChatMessage({
              messages: [
                {
                  role: 'user',
                  content: languagePrompt(candidate.name, ['Português', 'Inglês']),
                },
              ],
              organizationId: props.orgId,
              projectId: props.projectId,
            });
            props.onUpdate({
              ...candidate,
              languageChecks: {
                ...candidate.languageChecks,
                aiAssisted: {
                  text: reply.message,
                  languages: ['Português', 'Inglês'],
                  checkedAt: new Date().toISOString(),
                },
              },
            });
          } catch (err) {
            props.onUpdate({
              ...candidate,
              languageChecks: {
                ...candidate.languageChecks,
                aiAssisted: {
                  text:
                    err instanceof ChatApiError
                      ? err.message
                      : 'Language helper unavailable.',
                  languages: ['Português', 'Inglês'],
                  checkedAt: new Date().toISOString(),
                },
              },
            });
          }
        }}
      >
        Check language
      </button>
      {candidate.languageChecks?.aiAssisted?.text && (
        <p>{candidate.languageChecks.aiAssisted.text}</p>
      )}
      <label className="form-field">
        <span>Language note</span>
        <input
          value={
            (candidate.languageChecks?.manual ?? []).find((item) => item.note)?.note ??
            ''
          }
          onChange={(event) => {
            const manual = (candidate.languageChecks?.manual ?? []).map((item) => ({
              ...item,
              note: event.target.value,
            }));
            props.onUpdate({
              ...candidate,
              languageChecks: { ...candidate.languageChecks, manual },
            });
          }}
        />
      </label>
    </div>
  );
}
