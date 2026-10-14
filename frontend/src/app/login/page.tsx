import type { Metadata } from "next";
import { AuthFormLayout } from "@/components/auth/AuthFormLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeRedirect } from "@/utils/general";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthFormLayout>
      <LoginForm redirectTo={safeRedirect(next)} />
    </AuthFormLayout>
  );
}
