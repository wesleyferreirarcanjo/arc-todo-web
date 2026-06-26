const TOKEN_KEY = 'arc_todo_token';
const USER_KEY = 'arc_todo_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

import type { User } from '../../types/auth';

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (!parsed.id || !parsed.username) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      isAdmin: parsed.isAdmin ?? false,
    };
  } catch {
    return null;
  }
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}

export function clearAuth(): void {
  clearToken();
  clearStoredUser();
}
