"use client";

import { ErrorPage } from "@/components/common/ErrorPage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPage digest={error.digest} onRetry={reset} />;
}
