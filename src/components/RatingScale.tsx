import { useId, useRef, type KeyboardEvent } from 'react';

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;
export const RATING_VALUES_10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type RatingScaleMax = 5 | 10;
export type RatingScaleValue = (typeof RATING_VALUES_10)[number];

export function isRatingScaleValue(
  value: unknown,
  max: RatingScaleMax = 5,
): value is RatingScaleValue {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= max
  );
}

function nextRating(
  value: unknown,
  delta: number,
  max: RatingScaleMax,
): RatingScaleValue {
  if (!isRatingScaleValue(value, max)) {
    return 1;
  }
  return Math.min(max, Math.max(1, value + delta)) as RatingScaleValue;
}

export function RatingScale({
  label,
  value,
  onChange,
  description,
  max = 5,
  compact = false,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number) => void;
  description?: string;
  max?: RatingScaleMax;
  compact?: boolean;
}) {
  const reactId = useId();
  const labelId = `${reactId}-label`;
  const descriptionId = `${reactId}-description`;
  const values = max === 10 ? RATING_VALUES_10 : RATING_VALUES;
  const radiosRef = useRef(new Map<number, HTMLInputElement>());

  function commit(next: RatingScaleValue) {
    onChange(next);
    radiosRef.current.get(next)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: RatingScaleValue | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = nextRating(value, 1, max);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = nextRating(value, -1, max);
    } else if (event.key === 'Home') {
      next = 1;
    } else if (event.key === 'End') {
      next = max;
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
    <div className={`rating-scale${compact ? ' is-compact' : ''}`}>
      <span
        id={labelId}
        className={compact ? 'sr-only' : 'rating-scale-label'}
      >
        {label}
      </span>
      {description ? (
        <p id={descriptionId} className="rating-scale-description">
          {description}
        </p>
      ) : null}
      <div
        className={`rating-scale-group${max === 10 ? ' is-max-10' : ''}`}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        onKeyDown={onKeyDown}
      >
        {values.map((rating) => {
          const selected = value === rating;
          const filled = isRatingScaleValue(value, max) && rating <= value;
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
