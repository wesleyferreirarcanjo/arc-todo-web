import { useRef, type ReactNode } from 'react';

export const SWIPE_PX = 64;

export function swipeReaction(
  dx: number,
  dy: number,
  minPx = SWIPE_PX,
): 'passed' | 'liked' | null {
  if (Math.abs(dx) < minPx || Math.abs(dy) >= Math.abs(dx)) return null;
  return dx < 0 ? 'passed' : 'liked';
}

export function CandidateDeck(props: {
  stacked: boolean;
  onPass?: () => void;
  onLike?: () => void;
  children: ReactNode;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  function isControl(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      Boolean(target.closest('button, a, input, textarea, select, summary'))
    );
  }

  function applySwipe(dx: number, dy: number) {
    const reaction = swipeReaction(dx, dy);
    if (reaction === 'passed') props.onPass?.();
    if (reaction === 'liked') props.onLike?.();
  }

  return (
    <div
      className={props.stacked ? 'names-deck' : 'names-deck is-last'}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (isControl(event.target)) {
          start.current = null;
          return;
        }
        start.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const origin = start.current;
        start.current = null;
        if (!origin || isControl(event.target)) return;
        applySwipe(event.clientX - origin.x, event.clientY - origin.y);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
    >
      {props.children}
    </div>
  );
}
