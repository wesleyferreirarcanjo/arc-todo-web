import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import { modalPanelVariants, overlayVariants } from '../lib/motion/variants';
import { useMotionTransition } from '../lib/motion/useMotionTransition';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  className?: string;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  titleId = 'modal-title',
  className,
  children,
}: ModalProps) {
  const { base } = useMotionTransition();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          className="modal-overlay"
          onClick={onClose}
          role="presentation"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={base}
        >
          <m.div
            className={`modal${className ? ` ${className}` : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={base}
          >
            <header className="modal-header">
              <h2 id={titleId}>{title}</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </header>
            <div className="modal-body">{children}</div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
