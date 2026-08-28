"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export function SupabaseSignUp() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    const { data, error } = await createBrowserSupabaseClient().auth.signUp({ email: form.email, password: form.password, options: { data: { first_name: form.firstName, last_name: form.lastName } } });
    if (error) { setError("Unable to create the account."); setLoading(false); return; }
    if (!data.session) { setMessage("Check your email to confirm your account."); setLoading(false); return; }
    router.push("/auth-redirect"); router.refresh();
  }
  return <form onSubmit={submit} className="space-y-4" aria-label="Sign up">
    <div className="grid grid-cols-2 gap-3"><input aria-label="First name" required placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-3 text-sm" /><input aria-label="Last name" required placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="rounded-xl border border-border bg-bg px-3 py-3 text-sm" /></div>
    <input aria-label="Email address" type="email" autoComplete="email" required placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm" />
    <input aria-label="Password" type="password" autoComplete="new-password" required minLength={8} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm" />
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}
    <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Creating account…" : "Create account"}</button>
  </form>;
}
