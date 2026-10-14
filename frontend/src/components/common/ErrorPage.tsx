"use client";

import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constant";

interface ErrorPageProps {
  /** Next.js error id, useful when asking support to look something up. */
  digest?: string;
  onRetry: () => void;
}

/** Last-resort screen when a page throws while rendering. */
export function ErrorPage({ digest, onRetry }: ErrorPageProps) {
  return (
    <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Logo href={ROUTES.home} />
      <div className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col justify-center py-16">
        <p className="t-figure text-[0.8125rem] text-ink-3">Something broke</p>
        <h1 className="t-h1 mt-2">We could not show this page.</h1>
        <p className="mt-3 text-[0.9375rem] text-ink-2">
          Nothing you submitted was lost. Try again, and if it keeps happening,
          go back to the RFQ list.
        </p>
        {digest && (
          <p className="t-figure mt-3 text-[0.75rem] text-ink-3">
            Reference: {digest}
          </p>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href={ROUTES.home}>Go to RFQs</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
