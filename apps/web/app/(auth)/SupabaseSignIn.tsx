"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export function SupabaseSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null);
    const { error } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) { setError("Unable to sign in with those details."); setLoading(false); return; }
    router.push("/auth-redirect"); router.refresh();
  }

  async function google() {
    setError(null); setLoading(true);
    try {
      const { data, error } = await createBrowserSupabaseClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, skipBrowserRedirect: true } });
      if (error || !data?.url) {
        setError("Google sign-in is not available yet.");
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Google sign-in is not available yet.");
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4" aria-label="Sign in">
    <button type="button" onClick={google} disabled={loading} className="w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text disabled:opacity-50">{loading ? "Connecting to Google…" : "Continue with Google"}</button>
    <div className="text-center text-xs text-muted">or use email</div>
    <label className="block text-sm font-medium text-text" htmlFor="sign-in-email">Email address</label>
    <input id="sign-in-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text" />
    <label className="block text-sm font-medium text-text" htmlFor="sign-in-password">Password</label>
    <input id="sign-in-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text" />
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Signing in…" : "Sign in"}</button>
  </form>;
}
