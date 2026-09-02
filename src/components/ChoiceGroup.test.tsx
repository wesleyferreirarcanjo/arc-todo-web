import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChoiceGroup } from './ChoiceGroup';

afterEach(cleanup);

const OPTIONS = [
  { value: 'unknown', label: 'Unknown', unknown: true },
  { value: 'clear', label: 'Clear' },
  { value: 'collision', label: 'Collision' },
];

describe('ChoiceGroup', () => {
  it('keeps the same three judgment values and writes on change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceGroup
        name="brand-google"
        label="Google exact result"
        value="unknown"
        options={OPTIONS}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Google exact result' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Unknown' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Collision' }));
    expect(onChange).toHaveBeenCalledWith('collision');
  });
});
