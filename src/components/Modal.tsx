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

const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const scatterRafRef = useRef<number | null>(null);
  onCloseRef.current = onClose;

  // Track the last element focused while closed: content autofocus runs before
  // the open effect, so document.activeElement can no longer name the trigger.
  useEffect(() => {
    if (open) return;
    function trackFocus(event: FocusEvent) {
      if (!(event.target instanceof HTMLElement)) return;
      // Autofocus inside the panel fires before the closed-tracker detaches
      // (and before panelRef attaches), so sniff the dialog role instead.
      if (event.target.closest('[role="dialog"]')) return;
      restoreFocusRef.current = event.target;
    }
    document.addEventListener('focusin', trackFocus);
    return () => document.removeEventListener('focusin', trackFocus);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables =
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) {
        panel.focus();
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          last.focus();
          event.preventDefault();
        }
      } else if (active === last || !panel.contains(active)) {
        first.focus();
        event.preventDefault();
      }
    }

    acquireBodyScrollLock();
    document.addEventListener('keydown', handleKeyDown);

    // Content autofocus runs first; only grab focus when nothing inside did.
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus();
    }

    return () => {
      releaseBodyScrollLock();
      document.removeEventListener('keydown', handleKeyDown);
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
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
