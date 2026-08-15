import type { MouseEvent } from 'react';
import { shouldUseIosSwitchHaptic } from '../lib/ui/haptics';

const switchAttr = { switch: '' };

export function IosHapticHit() {
  if (!shouldUseIosSwitchHaptic()) {
    return null;
  }

  return (
    <input
      type="checkbox"
      className="ios-haptic-hit"
      tabIndex={-1}
      aria-hidden="true"
      {...switchAttr}
      onClick={(event: MouseEvent<HTMLInputElement>) => {
        event.stopPropagation();
        const host = event.currentTarget.parentElement;
        if (host instanceof HTMLElement) {
          host.click();
        }
        event.currentTarget.blur();
      }}
    />
  );
}
