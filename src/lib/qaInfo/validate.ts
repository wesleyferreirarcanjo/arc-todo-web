export const QA_INVALID_URL_MESSAGE =
  'That environment URL is not valid. Use an http or https address.';

export const QA_INVALID_PROFILE_MESSAGE =
  'QA info could not be saved. Check environment names and URLs, and give each test user a label.';

export type QaEnvironmentDraft = {
  key: string;
  name: string;
  url: string;
  notes: string;
};

export type QaUserDraft = {
  key: string;
  label: string;
  email: string;
  howToSignIn: string;
  notes: string;
};

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function emptyEnvironmentDraft(key: string): QaEnvironmentDraft {
  return { key, name: '', url: '', notes: '' };
}

export function emptyUserDraft(key: string): QaUserDraft {
  return { key, label: '', email: '', howToSignIn: '', notes: '' };
}

export function validateQaDraft(input: {
  environments: QaEnvironmentDraft[];
  users: QaUserDraft[];
}): string | null {
  for (const item of input.environments) {
    const name = item.name.trim();
    const url = item.url.trim();
    const notes = item.notes.trim();
    if (!name && !url && !notes) {
      continue;
    }
    if (!name) {
      return QA_INVALID_PROFILE_MESSAGE;
    }
    if (!isHttpUrl(url)) {
      return QA_INVALID_URL_MESSAGE;
    }
  }
  for (const item of input.users) {
    const label = item.label.trim();
    const email = item.email.trim();
    const howToSignIn = item.howToSignIn.trim();
    const notes = item.notes.trim();
    if (!label && !email && !howToSignIn && !notes) {
      continue;
    }
    if (!label) {
      return QA_INVALID_PROFILE_MESSAGE;
    }
  }
  return null;
}
