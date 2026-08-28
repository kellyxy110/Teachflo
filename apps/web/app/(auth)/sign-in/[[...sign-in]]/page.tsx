import { SupabaseSignIn } from "../../SupabaseSignIn";

export default async function SignInPage() {
  if (process.env.AUTH_PROVIDER === "supabase") return <SupabaseSignIn />;
  const { SignIn } = await import("@clerk/nextjs");
  return <SignIn fallbackRedirectUrl="/auth-redirect" />;
}
