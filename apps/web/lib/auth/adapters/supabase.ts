import type { IAuthService, AuthSession, AuthUser } from "../types";
import { createServerSupabaseAuthClient } from "@/lib/supabase-server";
import { createServerSupabaseClient } from "@/lib/supabase";

export class SupabaseAdapter implements IAuthService {
  async getSession(): Promise<AuthSession> {
    const client = await createServerSupabaseAuthClient();
    const { data, error } = await client.auth.getUser();
    const user = error ? null : data.user;
    return {
      userId: user?.id ?? null,
      sessionId: user?.id ?? null,
      sessionClaims: (user?.user_metadata ?? {}) as Record<string, unknown>,
      provider: "supabase",
    };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const client = await createServerSupabaseAuthClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    const user = data.user;
    return {
      id: user.id,
      email: user.email ?? null,
      firstName: (user.user_metadata.first_name as string | undefined) ?? null,
      lastName: (user.user_metadata.last_name as string | undefined) ?? null,
      imageUrl: (user.user_metadata.avatar_url as string | undefined) ?? "",
      publicMetadata: (user.user_metadata ?? {}) as Record<string, unknown>,
    };
  }

  async setUserMetadata(userId: string, metadata: Record<string, unknown>): Promise<void> {
    const admin = createServerSupabaseClient();
    const { error } = await admin.auth.admin.updateUserById(userId, { user_metadata: metadata });
    if (error) throw error;
  }
}
