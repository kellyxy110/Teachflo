import { SupabaseSignUp } from "../../SupabaseSignUp";

export default async function SignUpPage() {
  if (process.env.AUTH_PROVIDER === "supabase") return <SupabaseSignUp />;
  const { SignUp } = await import("@clerk/nextjs");
  return <SignUp fallbackRedirectUrl="/auth-redirect" />;
}
