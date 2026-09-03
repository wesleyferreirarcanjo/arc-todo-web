import {
  googleAppQueryUrl,
  googleImagesQueryUrl,
  googleQueryUrl,
} from '../../lib/names/catalog';
import {
  keptVerdict,
  unknownBrandLabels,
} from '../../lib/names/funnel';
import type { NameCandidate, ProjectNameSession } from '../../types/name-session';
import { AutomatedEvidence } from './AutomatedEvidence';
import { BrandFootprintBlock } from './BrandFootprintBlock';
import { CandidateNotesBlock } from './CandidateNotesBlock';
import { HeardSpellingBlock } from './HeardSpellingBlock';
import { LanguageJudgmentBlock } from './LanguageJudgmentBlock';

export function CandidateCard(props: {
  candidate: NameCandidate;
  session: ProjectNameSession;
  orgId: string;
  projectId: string;
  sessionId: string;
  isBlind: boolean;
  busy: string | null;
  onBusy: (value: string | null) => void;
  onSession: (session: ProjectNameSession) => void;
  onUpdate: (candidate: NameCandidate) => void;
  onReject: () => void;
}) {
  const { candidate, isBlind } = props;
  const kept = props.session.shortlistIds.includes(candidate.id);
  const unknown = unknownBrandLabels(candidate, props.session.namingGoal);
  const next =
    unknown[0] != null
      ? `Open ${unknown[0]} and mark Clear or Collision.`
      : 'Score this name 1–10 on the shortlist, then Pick if it is the winner.';

  if (isBlind) {
    return (
      <article className="names-card names-card-detail">
        <strong>{candidate.name}</strong>
        <p>Answer this name in Feedback round first.</p>
      </article>
    );
  }

  return (
    <article className="names-card names-card-detail">
      <div className="names-check-summary">
        <p className="names-card-verdict-line">
          {keptVerdict(candidate, props.session.namingGoal)}
        </p>
        <p className="names-check-next">Next: {next}</p>
      </div>
      <div className="names-card-links">
        <a
          className="names-text-link"
          href={candidate.googleQueryUrl || googleQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          View all on Google
        </a>
        <a
          className="names-text-link"
          href={googleAppQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          {candidate.name} app
        </a>
        <a
          className="names-text-link"
          href={googleImagesQueryUrl(candidate.name)}
          target="_blank"
          rel="noreferrer"
        >
          Images
        </a>
      </div>
      <AutomatedEvidence
        candidate={candidate}
        session={props.session}
        orgId={props.orgId}
        projectId={props.projectId}
        sessionId={props.sessionId}
        busy={props.busy}
        onBusy={props.onBusy}
        onSession={props.onSession}
      />
      <BrandFootprintBlock
        candidate={candidate}
        namingGoal={props.session.namingGoal}
        onUpdate={props.onUpdate}
      />
      <HeardSpellingBlock
        candidate={candidate}
        kept={kept}
        onUpdate={props.onUpdate}
      />
      <LanguageJudgmentBlock
        candidate={candidate}
        orgId={props.orgId}
        projectId={props.projectId}
        onUpdate={props.onUpdate}
      />
      <CandidateNotesBlock
        candidate={candidate}
        onUpdate={props.onUpdate}
        onReject={props.onReject}
      />
    </article>
  );
}
