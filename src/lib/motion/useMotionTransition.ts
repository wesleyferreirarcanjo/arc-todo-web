import { useReducedMotion } from 'framer-motion';
import { getTransition, DURATION_BASE, DURATION_FAST } from './variants';

export function useMotionTransition() {
  const reducedMotion = useReducedMotion();

  return {
    reducedMotion,
    base: getTransition(reducedMotion, DURATION_BASE),
    fast: getTransition(reducedMotion, DURATION_FAST),
  };
}
