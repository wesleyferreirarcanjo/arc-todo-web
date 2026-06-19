import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { dropdownVariants } from '../lib/motion/variants';
import { useMotionTransition } from '../lib/motion/useMotionTransition';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const MENU_GAP_PX = 6;
const MENU_MAX_HEIGHT_PX = 256;
const MENU_Z_INDEX = 1000;

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled = false,
  className,
  id,
}: SelectProps) {
  const { fast } = useMotionTransition();
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  useLayoutEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX;
      const spaceAbove = rect.top - MENU_GAP_PX;
      const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(
        MENU_MAX_HEIGHT_PX,
        openUpward ? spaceAbove : spaceBelow,
      );

      setMenuStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        top: openUpward ? undefined : rect.bottom + MENU_GAP_PX,
        bottom: openUpward ? window.innerHeight - rect.top + MENU_GAP_PX : undefined,
        maxHeight: Math.max(maxHeight, 120),
        zIndex: MENU_Z_INDEX,
      });
    }

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  const menu = createPortal(
    <AnimatePresence>
      {open && (
        <motion.ul
          ref={menuRef}
          className="select-menu"
          style={menuStyle}
          role="listbox"
          aria-labelledby={selectId}
          variants={dropdownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={fast}
        >
          {options.map((option) => (
            <li key={option.value || '__empty__'} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`select-option${option.value === value ? ' is-selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      <div
        ref={rootRef}
        className={`select-field${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      >
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          className="select-trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={`select-value${selectedOption ? '' : ' is-placeholder'}`}>
            {displayLabel}
          </span>
          <span className="select-chevron" aria-hidden="true" />
        </button>
      </div>
      {menu}
    </>
  );
}
