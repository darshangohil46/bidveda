import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/utils/constant";

/** Shown for any URL that does not exist. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Logo href={ROUTES.home} />
      <div className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col justify-center py-16">
        <p className="t-figure text-[0.8125rem] text-ink-3">404</p>
        <h1 className="t-h1 mt-2">That page does not exist.</h1>
        <p className="mt-3 text-[0.9375rem] text-ink-2">
          The link may be old, or the RFQ may have been deleted. Your work is
          safe.
        </p>
        <div className="mt-7">
          <Button asChild>
            <Link href={ROUTES.home}>Go to RFQs</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
