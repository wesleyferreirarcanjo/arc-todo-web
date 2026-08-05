import { InputHTMLAttributes, useState } from 'react';
import { EyeIcon } from './EyeIcon';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={['password-field-input', className].filter(Boolean).join(' ')}
      />
      <button
        type="button"
        className="password-field-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <EyeIcon visible={visible} />
      </button>
    </div>
  );
}
