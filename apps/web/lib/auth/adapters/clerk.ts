// Clerk implementation of IAuthService.
// The ONLY file in the codebase that may import from @clerk/nextjs/server
// (aside from ClerkProvider/UserButton in UI and the webhook route).
// To swap to Better Auth: create a new adapter that implements IAuthService
// and update lib/auth/service.ts to use it instead.

import type { IAuthService, AuthSession, AuthUser } from "../types";

export class ClerkAdapter implements IAuthService {
  async getSession(): Promise<AuthSession> {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    return {
      userId: session.userId ?? null,
      sessionId: session.sessionId ?? null,
      sessionClaims: (session.sessionClaims as Record<string, unknown>) ?? {},
    };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      imageUrl: user.imageUrl,
      publicMetadata: (user.publicMetadata as Record<string, unknown>) ?? {},
    };
  }

  async setUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<void> {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, { publicMetadata: metadata });
  }
}
