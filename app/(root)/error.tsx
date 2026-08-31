"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the main app segment. Rendered inside app/(root)/layout,
 * so the Topbar and background survive the failure.
 *
 * The thrown error is never rendered: Next.js redacts server error messages in
 * production anyway, and in development the raw text carries hostnames and
 * driver internals. `digest` is a stable id the user can quote to support.
 */
export default function RootSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/(root)/error]", error);
  }, [error]);

  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <i className="bi bi-cloud-slash text-6xl text-orange-400" />

      <div className="flex flex-col gap-2">
        <h2 className="h2-bold text-dark-600">
          We can&apos;t reach the image library right now
        </h2>
        <p className="p-16-regular max-w-prose text-dark-400">
          This is usually temporary. Your images are safe - try loading the page
          again in a moment.
        </p>
      </div>

      <Button type="button" className="submit-button capitalize" onClick={reset}>
        Try again
      </Button>

      {error.digest && (
        <p className="p-14-light text-dark-400">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </section>
  );
}
