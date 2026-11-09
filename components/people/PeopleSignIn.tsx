"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const ALLOWED_DOMAIN = "@dartontarget.org";

export default function PeopleSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkExistingUser = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setMessage("Unable to verify your sign-in. Please try again.");
        return;
      }

      if (data.user) {
        if (data.user.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
          router.replace("/people");
        } else {
          await supabase.auth.signOut();
          setMessage("Only @dartontarget.org accounts can access this page.");
        }
      }
    };

    void checkExistingUser();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
      setMessage("Use your @dartontarget.org email address.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (!data.user?.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        await supabase.auth.signOut();
        setMessage("Only @dartontarget.org accounts can access this page.");
        return;
      }

      router.replace("/people");
      router.refresh();
    } catch {
      setMessage("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#10264b] text-lg font-bold text-[#e2b43b]">
            D
          </div>
          <h1 className="text-2xl font-bold text-[#10264b]">People & Shirt Sizes</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your @dartontarget.org account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <span className="relative mt-1 block">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-base outline-none focus:border-[#10264b] focus:ring-2 focus:ring-[#10264b]/20"
              />
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <span className="relative mt-1 block">
              <LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-base outline-none focus:border-[#10264b] focus:ring-2 focus:ring-[#10264b]/20"
              />
            </span>
          </label>

          {message && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#10264b] px-4 py-3 font-semibold text-white hover:bg-[#183965] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Accounts are managed by your organization. Contact an administrator if you need access.
        </p>
      </section>
    </main>
  );
}
