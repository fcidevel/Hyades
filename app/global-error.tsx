"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary: it replaces the root layout entirely, so it must render
 * its own <html> and <body>. Only active in production builds.
 *
 * Global styles live in the layout this replaces, so the styling here is
 * deliberately inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#1b1e50",
          background: "#fbfbfe",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Hyades is temporarily unavailable
        </h1>
        <p style={{ maxWidth: "40ch", margin: 0, lineHeight: 1.6 }}>
          Something went wrong while loading the application. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            cursor: "pointer",
            borderRadius: "9999px",
            border: "none",
            padding: "0.75rem 1.75rem",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#ffffff",
            background: "#1b1e50",
          }}
        >
          Try again
        </button>
        {error.digest && (
          <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: 0 }}>
            Reference: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
          </p>
        )}
      </body>
    </html>
  );
}
