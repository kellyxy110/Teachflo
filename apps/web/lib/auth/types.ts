// Auth service interface — the only auth contract the app depends on.
// Concrete providers (Clerk, Better Auth, etc.) implement this.

export interface AuthSession {
  userId: string | null;
  sessionId?: string | null;
  sessionClaims?: Record<string, unknown>;
}

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  publicMetadata: Record<string, unknown>;
}

export interface IAuthService {
  /** Returns the current session (userId may be null if unauthenticated). */
  getSession(): Promise<AuthSession>;

  /** Returns the full user object, or null if unauthenticated. */
  getCurrentUser(): Promise<AuthUser | null>;

  /** Attaches arbitrary public metadata to a user account. */
  setUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<void>;
}
