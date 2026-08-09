import { getApiHealth } from "@/lib/api";

// Phase 1 scope: this page exists to prove the foundation is wired
// end-to-end (web → api → Postgres/Redis). The real, dynamic discovery
// homepage described in docs/architecture/00-vision-personas-features-ia.md
// (Section C.1) and the master brief (Section 7) is Phase 7 scope and
// replaces this file entirely — it is not built on top of it.
export default async function FoundationCheckPage() {
  const health = await getApiHealth();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }}>UzaNunua — Foundation Check</h1>
      <p style={{ color: "#555" }}>
        This page confirms Phase 1 is wired correctly. It is replaced by the real homepage in
        Phase 7.
      </p>

      <section style={{ marginTop: "2rem", padding: "1.25rem", border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>API connectivity</h2>
        {health ? (
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1rem", margin: 0 }}>
            <dt>Overall status</dt>
            <dd>{health.status}</dd>
            <dt>Database</dt>
            <dd>{health.dependencies.database}</dd>
            <dt>Redis</dt>
            <dd>{health.dependencies.redis}</dd>
            <dt>Checked at</dt>
            <dd>{health.timestamp}</dd>
          </dl>
        ) : (
          <p style={{ color: "#b91c1c" }}>
            Could not reach the API at {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}.
            Start it with <code>pnpm dev</code> from the repo root (after <code>docker compose up -d</code>).
          </p>
        )}
      </section>
    </main>
  );
}
