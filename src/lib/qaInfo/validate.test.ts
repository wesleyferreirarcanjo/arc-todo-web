import { describe, expect, it } from 'vitest';
import {
  isHttpUrl,
  QA_INVALID_URL_MESSAGE,
  validateQaDraft,
} from './validate';

describe('QA info draft validation', () => {
  it('accepts http and https URLs and skips blank rows', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('http://localhost:5173')).toBe(true);
    expect(isHttpUrl('nao-e-um-site')).toBe(false);
    expect(
      validateQaDraft({
        environments: [
          { key: '1', name: 'Staging', url: 'https://example.com', notes: '' },
          { key: '2', name: '', url: '', notes: '' },
        ],
        users: [{ key: 'u', label: 'Member', email: '', howToSignIn: '', notes: '' }],
      }),
    ).toBeNull();
  });

  it('blocks a named environment with a junk URL', () => {
    expect(
      validateQaDraft({
        environments: [
          { key: '1', name: 'URL ruim', url: 'nao-e-um-site', notes: '' },
        ],
        users: [],
      }),
    ).toBe(QA_INVALID_URL_MESSAGE);
  });
});
