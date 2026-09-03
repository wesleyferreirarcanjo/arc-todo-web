import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RatingScale } from './RatingScale';

afterEach(cleanup);

function Harness({
  initial,
  onChange,
}: {
  initial?: number;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <RatingScale
      label="Easy to say/type"
      value={value}
      description="1 is hard, 5 is easy"
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

describe('RatingScale', () => {
  it('reports the same 1–5 integer a number input used to write', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    expect(screen.getByRole('radiogroup', { name: 'Easy to say/type' })).toBeInTheDocument();
    expect(screen.getByText('1 is hard, 5 is easy')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '4' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getByRole('radio', { name: '4' })).toBeChecked();
  });

  it('changes the value with arrows, Home, and End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={3} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: '3' }));
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(4);

    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(5);

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(1);

    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('can render a 1–10 scale and End lands on 10', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function TenHarness() {
      const [value, setValue] = useState(7);
      return (
        <RatingScale
          label="Score"
          max={10}
          compact
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<TenHarness />);

    expect(screen.getByRole('radio', { name: '10' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '7' }));
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(10);
  });
});
