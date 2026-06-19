import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';

function formatFileSummary(files: FileList | null): string {
  if (!files || files.length === 0) return '';

  if (files.length === 1) {
    return files[0].name;
  }

  return `${files.length} file${files.length === 1 ? '' : 's'} selected`;
}

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  function FileInput(
    { className, disabled, id, multiple, onChange, ...rest },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const localRef = useRef<HTMLInputElement>(null);
    const [summary, setSummary] = useState('');

    function setRefs(element: HTMLInputElement | null) {
      localRef.current = element;

      if (typeof ref === 'function') {
        ref(element);
        return;
      }

      if (ref) {
        ref.current = element;
      }
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      setSummary(formatFileSummary(event.target.files));
      onChange?.(event);
    }

    function openPicker() {
      if (!disabled) {
        localRef.current?.click();
      }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    }

    const fieldClassName = [
      'file-input-field',
      disabled ? 'is-disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const placeholder = multiple ? 'No files selected' : 'No file selected';

    return (
      <div className={fieldClassName}>
        <div
          className={`file-input-control${summary ? '' : ' is-empty'}`}
          onClick={openPicker}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled || undefined}
        >
          <span className="file-input-button">Choose files</span>
          <span
            className={`file-input-value${summary ? '' : ' is-placeholder'}`}
          >
            {summary || placeholder}
          </span>
        </div>
        <input
          {...rest}
          ref={setRefs}
          id={inputId}
          type="file"
          className="file-input-native sr-only"
          multiple={multiple}
          disabled={disabled}
          onChange={handleChange}
        />
      </div>
    );
  },
);
