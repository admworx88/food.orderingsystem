'use client';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body style={{ margin: 0, padding: 16, fontFamily: 'monospace', background: '#fff', color: '#000' }}>
        <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginBottom: 8 }}>
          Application Error
        </h2>
        <p style={{ fontSize: 14, marginBottom: 4 }}>
          <strong>Message:</strong> {error?.message || 'Unknown error'}
        </p>
        {error?.digest && (
          <p style={{ fontSize: 14, marginBottom: 4 }}>
            <strong>Digest:</strong> {error.digest}
          </p>
        )}
        <details open style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 13, cursor: 'pointer' }}>Stack Trace</summary>
          <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f5f5f5', padding: 8 }}>
            {error?.stack || 'No stack available'}
          </pre>
        </details>
      </body>
    </html>
  );
}
