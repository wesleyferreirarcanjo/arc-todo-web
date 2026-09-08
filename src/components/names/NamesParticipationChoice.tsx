import { ChoiceGroup } from '../ChoiceGroup';
import { NAMES_JOURNEY_COPY, NAMES_SUGGEST_COPY } from '../../lib/names/hubList';
import type { ParticipationMode } from '../../types/name-session';

export function NamesParticipationChoice({
  value,
  onChange,
}: {
  value: ParticipationMode;
  onChange: (value: ParticipationMode) => void;
}) {
  return (
    <div className="form-field">
      <span>Who is choosing?</span>
      <ChoiceGroup
        name="participationMode"
        label="Who is choosing?"
        value={value}
        onChange={(next) => onChange(next as ParticipationMode)}
        options={[
          { value: 'solo', label: 'Choose on my own' },
          { value: 'team', label: 'Choose with my team' },
        ]}
      />
      <p className="page-subtitle names-participation-hint">
        {value === 'team'
          ? 'Project members keep private favorites. You share 2–5 names, then they vote. Only you or an admin pick the winner.'
          : 'Review names yourself and pick a winner when you are ready. Other project members can look, but there is no team vote.'}
      </p>
      <p className="page-subtitle">{NAMES_JOURNEY_COPY}</p>
      <p className="page-subtitle">{NAMES_SUGGEST_COPY}</p>
    </div>
  );
}
