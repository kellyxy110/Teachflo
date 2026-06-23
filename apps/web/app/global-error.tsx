"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-NG">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0f1e", color: "#e2e8f0" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>&#x26A0;&#xFE0F;</div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>Critical Error</h1>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px" }}>
              TeachFlow encountered a critical error. Please reload the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: "11px", color: "#475569", marginBottom: "16px", fontFamily: "monospace" }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: "10px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: 600,
                background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer",
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
