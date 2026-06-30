// Swap provider here — nothing else in the app changes.
import { ClerkAdapter } from "./adapters/clerk";
import type { IAuthService } from "./types";

export const authService: IAuthService = new ClerkAdapter();

// Re-export types so callers only need one import
export type { IAuthService, AuthSession, AuthUser } from "./types";
