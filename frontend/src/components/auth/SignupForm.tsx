"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { FormField } from "@/components/common/FormField";
import { PhoneField } from "@/components/common/PhoneField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signUpSchema, type SignUpField } from "@/lib/auth-schemas";
import { ApiError } from "@/lib/baseApi";
import { cn } from "@/lib/utils";
import { firstErrorPerField } from "@/lib/zod-errors";
import { authService } from "@/services/auth.service";
import { UserRole } from "@/types/enums";
import { ROUTES, roleHome } from "@/utils/constant";
import { getErrorMessage } from "@/utils/general";

const ROLE_OPTIONS: Array<{ role: UserRole; title: string; text: string }> = [
  {
    role: UserRole.BUYER,
    title: "I am a buyer",
    text: "Publish RFQs, compare quotes, award one vendor.",
  },
  {
    role: UserRole.VENDOR,
    title: "I am a vendor",
    text: "Browse open RFQs and quote before the deadline.",
  },
];

type Errors = Partial<Record<SignUpField, string>>;

interface SignupFormProps {
  defaultRole: UserRole;
}

export function SignupForm({ defaultRole }: SignupFormProps) {
  const router = useRouter();
  const { error: showError } = useToast();
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The rules live in lib/auth-schemas.ts; on success `checked.data` is trimmed and ready to send.
    const checked = signUpSchema.safeParse({
      role,
      name,
      companyName,
      email,
      phone,
      password,
    });
    setErrors(
      checked.success ? {} : firstErrorPerField<SignUpField>(checked.error),
    );
    if (!checked.success) return;

    setSubmitting(true);
    try {
      await authService.signup({
        ...checked.data,
        phone: checked.data.phone || undefined,
      });
      router.replace(roleHome(role));
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "EMAIL_TAKEN") {
        setErrors({
          email: "An account with this email already exists. Try signing in.",
        });
      } else {
        showError("Could not create your account", getErrorMessage(caught));
      }
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="t-h1">Create your account</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-2">
        It takes about a minute.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Account type</legend>
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.role}
              className={cn(
                "cursor-pointer rounded-sm border bg-card p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                role === option.role
                  ? "border-pine bg-pine-soft"
                  : "border-line-strong hover:border-ink-3",
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.role}
                checked={role === option.role}
                onChange={() => setRole(option.role)}
                className="sr-only"
              />
              <span className="block text-[0.875rem] font-medium text-ink">
                {option.title}
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-snug text-ink-2">
                {option.text}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Full name"
            htmlFor="signup-name"
            required
            error={errors.name}
          >
            <Input
              id="signup-name"
              value={name}
              autoComplete="name"
              aria-invalid={!!errors.name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 bg-card"
            />
          </FormField>
          <FormField
            label="Company"
            htmlFor="signup-company"
            required
            error={errors.companyName}
          >
            <Input
              id="signup-company"
              value={companyName}
              autoComplete="organization"
              aria-invalid={!!errors.companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="h-10 bg-card"
            />
          </FormField>
        </div>

        <FormField
          label="Work email"
          htmlFor="signup-email"
          required
          error={errors.email}
        >
          <Input
            id="signup-email"
            type="email"
            value={email}
            autoComplete="email"
            aria-invalid={!!errors.email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 bg-card"
          />
        </FormField>

        <FormField
          label="Phone"
          htmlFor="signup-phone"
          hint="Optional. Pick the country code, then the number."
          error={errors.phone}
        >
          <PhoneField
            id="signup-phone"
            value={phone}
            onChange={setPhone}
            invalid={!!errors.phone}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="signup-password"
          required
          error={errors.password}
        >
          <PasswordInput
            id="signup-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            invalid={!!errors.password}
          />
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="mt-1 h-10"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="mt-6 text-[0.8125rem] text-ink-2">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-pine underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
