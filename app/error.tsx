"use client";

import { useEffect } from "react";

/**
 * Fallback error boundary for segments outside app/(root) - it has no layout
 * chrome to rely on, so it renders standalone. See app/(root)/error.tsx for the
 * boundary that covers the main app.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <i className="bi bi-exclamation-triangle text-6xl text-orange-400" />

      <div className="flex flex-col gap-2">
        <h2 className="h2-bold text-dark-600">Something went wrong</h2>
        <p className="p-16-regular max-w-prose text-dark-400">
          We hit an unexpected problem loading this page. Please try again.
        </p>
      </div>

      <button type="button" className="submit-button button" onClick={reset}>
        Try again
      </button>

      {error.digest && (
        <p className="p-14-light text-dark-400">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
