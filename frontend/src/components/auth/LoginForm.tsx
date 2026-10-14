"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { FormField } from "@/components/common/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInSchema } from "@/lib/auth-schemas";
import { ApiError } from "@/lib/baseApi";
import { authService } from "@/services/auth.service";
import { ROUTES, roleHome } from "@/utils/constant";
import { getErrorMessage } from "@/utils/general";

interface LoginFormProps {
  /** Where to go after signing in. Already validated on the server. */
  redirectTo: string;
}

export function LoginForm({ redirectTo }: LoginFormProps) {
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
      const session = await authService.login({
        email: email.trim(),
        password,
      });
      // With no particular page asked for, go straight to this role's own home.
      router.replace(
        redirectTo === ROUTES.home ? roleHome(session.user.role) : redirectTo,
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.status < 500)
        setProblem(caught.message);
      else showError("Could not sign in", getErrorMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="t-h1">Sign in</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-2">
        Welcome back. Pick up where you left off.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
        <FormField label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 bg-card"
            placeholder="you@company.com"
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password">
          <PasswordInput
            id="login-password"
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
          className="mt-1 h-10"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-[0.8125rem] text-ink-2">
        New to Bidveda?{" "}
        <Link
          href={ROUTES.signup}
          className="font-medium text-pine underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
        {" · "}
        <Link
          href={ROUTES.adminLogin}
          className="text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Admin sign in
        </Link>
      </p>
    </div>
  );
}
