import { postJson } from './core';
import type { AuthUser } from '@/types';

type ClerkAuthResponse = { token: string; user: AuthUser };

export function clerkAuth(clerkToken: string): Promise<ClerkAuthResponse> {
  return postJson<ClerkAuthResponse>('/auth/clerk', { token: clerkToken });
}
