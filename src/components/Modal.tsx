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

/** Open dialogs in mount order; only the topmost handles Escape/Tab (nested modals). */
const openModalStack: symbol[] = [];

function visibleFocusable(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getClientRects().length > 0,
  );
}

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
  const scatterRafRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const instanceIdRef = useRef(Symbol('modal'));
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const id = instanceIdRef.current;
    openModalStack.push(id);
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move focus inside unless a child already claimed it (e.g. autoFocus).
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const target = visibleFocusable(dialog)[0] ?? dialog;
      target.focus({ preventScroll: true });
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (openModalStack[openModalStack.length - 1] !== id) return;

      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialogElement = dialogRef.current;
      if (!dialogElement) return;

      const focusables = visibleFocusable(dialogElement);
      if (focusables.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const active = document.activeElement;
      const inside = active instanceof Node && dialogElement.contains(active);
      if (event.shiftKey) {
        if (!inside || active === focusables[0]) {
          event.preventDefault();
          focusables[focusables.length - 1].focus();
        }
      } else if (!inside || active === focusables[focusables.length - 1]) {
        event.preventDefault();
        focusables[0].focus();
      }
    }

    acquireBodyScrollLock();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      const index = openModalStack.indexOf(id);
      if (index !== -1) openModalStack.splice(index, 1);
      releaseBodyScrollLock();
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to the trigger; never let it fall back to body.
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      const focusWasInside =
        dialogRef.current?.contains(document.activeElement) ??
        document.activeElement === document.body;
      if (restoreTarget?.isConnected && focusWasInside) {
        restoreTarget.focus({ preventScroll: true });
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
            ref={dialogRef}
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
            tabIndex={-1}
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
