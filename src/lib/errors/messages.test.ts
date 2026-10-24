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
    expect(catalogMessage(WEB_ERROR.LOAD, { thing: 'tasks' })).toBe(
      "Couldn't load tasks. Check your connection and try again.",
    );
  });

  it('maps invalid SEO max pages to ERR-ARC-SEO-13', () => {
    expect(WEB_ERROR.VAL_SEO_MAX_PAGES).toBe('ERR-ARC-SEO-13');
    expect(catalogMessage(WEB_ERROR.VAL_SEO_MAX_PAGES)).toBe(
      'Enter a maximum pages-per-audit of at least 1.',
    );
  });

  it('returns the project-access catalog copy', () => {
    expect(catalogMessage('ERR-ARC-ACL-02')).toBe(
      'You do not have access to this project. Ask an administrator to add you.',
    );
  });
});
