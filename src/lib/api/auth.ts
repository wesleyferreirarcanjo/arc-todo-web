import { apiRequest } from './client';
import type { GoogleSsoInput, LoginResponse } from '../../types/auth';

export function loginWithGoogle(input: GoogleSsoInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/sso/google', {
    method: 'POST',
    body: input,
    auth: false,
  });
}
