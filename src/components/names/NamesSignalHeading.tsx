import { InfoPopover } from '../InfoPopover';
import { SIGNAL_COPY, type NameSignalId } from '../../lib/names/signalCopy';

export function NamesSignalHeading({ id }: { id: NameSignalId }) {
  const copy = SIGNAL_COPY[id];
  return (
    <div className="names-signal-heading">
      <p className="names-brief-label">{copy.name}</p>
      <InfoPopover label={copy.name}>
        <p>{copy.howToRead}</p>
        <p>{copy.honestLimit}</p>
      </InfoPopover>
    </div>
  );
}
