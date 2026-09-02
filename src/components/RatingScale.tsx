import { useId, useRef, type KeyboardEvent } from 'react';

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export type RatingScaleValue = (typeof RATING_VALUES)[number];

export function isRatingScaleValue(value: unknown): value is RatingScaleValue {
  return RATING_VALUES.includes(value as RatingScaleValue);
}

function nextRating(value: unknown, delta: number): RatingScaleValue {
  if (!isRatingScaleValue(value)) {
    return 1;
  }
  return RATING_VALUES[Math.min(4, Math.max(0, value - 1 + delta))]!;
}

export function RatingScale({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number) => void;
  description?: string;
}) {
  const reactId = useId();
  const labelId = `${reactId}-label`;
  const descriptionId = `${reactId}-description`;
  const radiosRef = useRef(new Map<RatingScaleValue, HTMLInputElement>());

  function commit(next: RatingScaleValue) {
    onChange(next);
    radiosRef.current.get(next)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: RatingScaleValue | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = nextRating(value, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = nextRating(value, -1);
    } else if (event.key === 'Home') {
      next = 1;
    } else if (event.key === 'End') {
      next = 5;
    }
    if (next == null) {
      return;
    }
    event.preventDefault();
    if (next !== value) {
      commit(next);
    }
  }

  return (
    <div className="rating-scale">
      <span id={labelId} className="rating-scale-label">
        {label}
      </span>
      {description ? (
        <p id={descriptionId} className="rating-scale-description">
          {description}
        </p>
      ) : null}
      <div
        className="rating-scale-group"
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={onKeyDown}
      >
        {RATING_VALUES.map((rating) => {
          const selected = value === rating;
          const filled = isRatingScaleValue(value) && rating <= value;
          return (
            <label
              key={rating}
              className={`rating-scale-option${filled ? ' is-filled' : ''}${selected ? ' is-selected' : ''}`}
            >
              <input
                ref={(node) => {
                  if (node) {
                    radiosRef.current.set(rating, node);
                  } else {
                    radiosRef.current.delete(rating);
                  }
                }}
                type="radio"
                name={reactId}
                value={rating}
                checked={selected}
                onChange={() => commit(rating)}
              />
              <span className="rating-scale-value">{rating}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
