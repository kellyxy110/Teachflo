// Swap provider here — nothing else in the app changes.
import { ClerkAdapter } from "./adapters/clerk";
import { SupabaseAdapter } from "./adapters/supabase";
import type { IAuthService } from "./types";

function configuredAuthService(): IAuthService {
  return process.env.AUTH_PROVIDER === "supabase" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? new SupabaseAdapter()
    : new ClerkAdapter();
}

let activeAuthService: IAuthService = configuredAuthService();
let testOverrideActive = false;

/** Production callers always receive the Clerk-backed adapter. */
export function getAuthService(): IAuthService {
  return activeAuthService;
}

// Test-process-only dependency injection. This is not request-addressable and
// rejects any deployed/runtime environment.
export function setAuthServiceForTests(service: IAuthService | null): void {
  if (process.env.NODE_ENV !== "test") throw new Error("Test auth override is unavailable outside NODE_ENV=test");
  activeAuthService = service ?? configuredAuthService();
  testOverrideActive = service !== null;
}

export function hasTestAuthOverride(): boolean {
  return process.env.NODE_ENV === "test" && testOverrideActive;
}

export const authService: IAuthService = {
  getSession: () => getAuthService().getSession(),
  getCurrentUser: () => getAuthService().getCurrentUser(),
  setUserMetadata: (userId, metadata) => getAuthService().setUserMetadata(userId, metadata),
};

// Re-export types so callers only need one import
export type { IAuthService, AuthSession, AuthUser, TeachNexisSession } from "./types";
