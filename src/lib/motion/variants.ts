import type { Transition, Variants } from 'framer-motion';

export const DURATION_FAST = 0.15;
export const DURATION_BASE = 0.22;

export const easeOut = [0.22, 1, 0.36, 1] as const;

export function getTransition(
  reducedMotion: boolean | null,
  duration = DURATION_BASE,
): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }

  return { duration, ease: easeOut };
}

export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 12 },
};

export const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const expandVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};
