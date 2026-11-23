import { useEffect, useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  acquireBodyScrollLock,
  releaseBodyScrollLock,
} from '../lib/bodyScrollLock';
import { modalPanelVariants, overlayVariants } from '../lib/motion/variants';
import { useMotionTransition } from '../lib/motion/useMotionTransition';
import { clearScatterPointer, setScatterPointer } from '../lib/ui/scatterLights';
import { EntityScatterLights } from './EntityScatterLights';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  className?: string;
  /** Project/org hex. Portals to body, so identity must be set on the dialog. */
  accentColor?: string;
  eyebrow?: ReactNode;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function Modal({
  open,
  onClose,
  title,
  titleId = 'modal-title',
  className,
  accentColor,
  eyebrow,
  children,
}: ModalProps) {
  const { base, reducedMotion } = useMotionTransition();
  const onCloseRef = useRef(onClose);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scatterRafRef = useRef<number | null>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    // Let an inner autoFocus (e.g. destructive confirm → Cancel) win; otherwise
    // focus the panel so the labelled dialog is announced.
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      const current = panelRef.current;
      if (event.key !== 'Tab' || !current) {
        return;
      }
      const focusables = Array.from(
        current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && current.contains(active);
      // ponytail: with nested modals both traps run; the last-registered
      // (innermost) listener wins the final focus. Upgrade path: a modal stack.
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    acquireBodyScrollLock();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      releaseBodyScrollLock();
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  function handleScatterPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!accentColor || reducedMotion) {
      return;
    }
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return;
    }

    const host = event.currentTarget;
    const { clientX, clientY } = event;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return;
    }
    if (scatterRafRef.current != null) {
      cancelAnimationFrame(scatterRafRef.current);
    }

    scatterRafRef.current = requestAnimationFrame(() => {
      scatterRafRef.current = null;
      setScatterPointer(host, clientX, clientY);
    });
  }

  function handleScatterPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (scatterRafRef.current != null) {
      cancelAnimationFrame(scatterRafRef.current);
      scatterRafRef.current = null;
    }
    clearScatterPointer(event.currentTarget);
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {open ? (
        <motion.div
          key="modal-overlay"
          className="modal-overlay"
          onClick={onClose}
          role="presentation"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={base}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={[
              'modal',
              className,
              accentColor ? 'has-accent has-scatter-lights' : null,
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              accentColor
                ? ({ '--entity-accent': accentColor } as CSSProperties)
                : undefined
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            onPointerMove={accentColor ? handleScatterPointerMove : undefined}
            onPointerLeave={accentColor ? handleScatterPointerLeave : undefined}
            onPointerCancel={accentColor ? handleScatterPointerLeave : undefined}
            variants={modalPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={base}
          >
            <header className="modal-header">
              <div className="modal-header-copy">
                {eyebrow}
                <h2 id={titleId}>{title}</h2>
              </div>
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
            {accentColor ? <EntityScatterLights seed={titleId} /> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
