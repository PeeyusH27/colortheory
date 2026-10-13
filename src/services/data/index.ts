import { useAuthStore, type AuthUser } from '@/features/auth/authStore';

import { LocalRepository } from './localRepository';
import { SupabaseRepository } from './supabaseRepository';
import type { DataRepository } from './types';

export * from './types';

const local = new LocalRepository();
let cloud: SupabaseRepository | null = null;

/** Repository for the current auth state: Supabase when signed in, device storage otherwise. */
export function repositoryFor(status: string, user: AuthUser | null): DataRepository {
  if (status === 'signedIn' && user) {
    if (!cloud || cloud.scope !== user.id) cloud = new SupabaseRepository(user.id, user.email);
    return cloud;
  }
  return local;
}

export function getRepository(): DataRepository {
  const { status, user } = useAuthStore.getState();
  return repositoryFor(status, user);
}

export { LocalRepository, SupabaseRepository };
