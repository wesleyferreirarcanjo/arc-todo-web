import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { catalogMessage, userMessage, WEB_ERROR } from './messages';

describe('userMessage', () => {
  it('prefers a specific API message over the fallback', () => {
    const error = new ApiError(
      'No Arc Todo user is assigned to this Google account. Ask an administrator to add your email, then try again.',
      401,
      'ERR-ARC-AUTH-07',
    );
    expect(userMessage(error, WEB_ERROR.GIS_FAILED)).toContain(
      'No Arc Todo user is assigned',
    );
  });

  it('replaces generic Nest copy with the catalog fallback', () => {
    expect(userMessage(new ApiError('Unauthorized', 401), WEB_ERROR.SESSION)).toBe(
      catalogMessage(WEB_ERROR.SESSION),
    );
  });

  it('fills load/save patterns', () => {
    expect(catalogMessage(WEB_ERROR.LOAD, { thing: 'knowledge' })).toBe(
      "Couldn't load knowledge. Check your connection and try again.",
    );
  });
});
