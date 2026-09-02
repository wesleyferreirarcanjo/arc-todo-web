export type ChoiceOption = {
  value: string;
  label: string;
  unknown?: boolean;
};

export function ChoiceGroup({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="choice-group" role="radiogroup" aria-label={label ?? name}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={`choice-group-option${selected ? ' is-selected' : ''}${option.unknown ? ' is-unknown' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            {option.unknown ? (
              <span className="names-unknown-mark" aria-hidden="true" />
            ) : null}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
