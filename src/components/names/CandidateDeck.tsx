import type { ReactNode } from 'react';

export function CandidateDeck(props: {
  stacked: boolean;
  children: ReactNode;
}) {
  return (
    <div className={props.stacked ? 'names-deck' : 'names-deck is-last'}>
      {props.children}
    </div>
  );
}
