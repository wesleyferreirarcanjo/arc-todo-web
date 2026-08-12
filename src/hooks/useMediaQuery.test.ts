import { describe, expect, it } from 'vitest';
import { BOARD_MOBILE_QUERY, SHELL_MOBILE_QUERY } from './useMediaQuery';

describe('board vs shell breakpoints', () => {
  it('tabbed board matches the mobile shell (≤1023px)', () => {
    expect(SHELL_MOBILE_QUERY).toBe('(max-width: 1023px)');
    expect(BOARD_MOBILE_QUERY).toBe(SHELL_MOBILE_QUERY);
  });
});
