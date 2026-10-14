import type { Metadata } from "next";
import { AuthFormLayout } from "@/components/auth/AuthFormLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { toUserRole, UserRole } from "@/types/enums";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const { role } = await searchParams;
  const requested = toUserRole(Array.isArray(role) ? role[0] : role);
  return (
    <AuthFormLayout>
      <SignupForm defaultRole={requested ?? UserRole.BUYER} />
    </AuthFormLayout>
  );
}
