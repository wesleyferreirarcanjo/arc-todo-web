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

export const chatPanelVariants: Variants = {
  hidden: { opacity: 0, x: '100%' },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '100%' },
};

export const chatPanelSpringTransition: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.82,
};

export const chatMessageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export const chatWidgetFabVariants: Variants = {
  rest: { scale: 1.2 },
  hover: { scale: 1.26 },
  tap: { scale: 1.13 },
  open: { scale: 0.8 },
  openHover: { scale: 0.85 },
  openTap: { scale: 0.76 },
};
