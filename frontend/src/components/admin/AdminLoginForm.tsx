"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { FormField } from "@/components/common/FormField";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInSchema } from "@/lib/auth-schemas";
import { ApiError } from "@/lib/baseApi";
import { adminAuthService } from "@/services/admin-auth.service";
import { ROUTES } from "@/utils/constant";
import { getErrorMessage } from "@/utils/general";

export function AdminLoginForm() {
  const router = useRouter();
  const { error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = signInSchema.safeParse({ email, password });
    if (!checked.success) {
      setProblem(checked.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    setProblem(null);
    try {
      await adminAuthService.login(checked.data);
      router.replace(ROUTES.adminDashboard);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status < 500)
        setProblem(caught.message);
      else showError("Could not sign in", getErrorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col px-5 py-8">
      <Logo />
      <div className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col justify-center py-10">
        <p className="t-caption mb-2">Admin panel</p>
        <h1 className="t-h1">Sign in</h1>
        <p className="mt-1.5 text-[0.9375rem] text-ink-2">
          For platform administrators. Buyers and vendors sign in on the main
          site.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
          <FormField label="Email" htmlFor="admin-email">
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 bg-card"
            />
          </FormField>
          <FormField label="Password" htmlFor="admin-password">
            <PasswordInput
              id="admin-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </FormField>

          {problem && (
            <p
              role="alert"
              className="rounded-sm border border-rust/30 bg-rust-soft px-3 py-2 text-[0.8125rem] text-ink"
            >
              {problem}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="h-10"
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Sign in to admin
          </Button>
        </form>

        <p className="mt-6 text-[0.8125rem] text-ink-2">
          <Link
            href={ROUTES.login}
            className="font-medium text-pine underline-offset-4 hover:underline"
          >
            Buyer or vendor? Sign in here
          </Link>
        </p>
      </div>
    </main>
  );
}
