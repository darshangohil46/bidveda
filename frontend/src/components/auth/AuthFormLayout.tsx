import { Logo } from "@/components/common/Logo";

/** Sign-in and sign-up pages: the logo at the top and the form in the middle, nothing else. */
export function AuthFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Logo />
      <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">
        {children}
      </div>
    </main>
  );
}
