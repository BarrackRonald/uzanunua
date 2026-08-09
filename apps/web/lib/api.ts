const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export interface HealthReport {
  status: "ok" | "degraded";
  dependencies: {
    database: "ok" | "unavailable";
    redis: "ok" | "unavailable";
  };
  timestamp: string;
}

/**
 * Server-side fetch of the API's health report, used only to prove the
 * Next.js → NestJS → Postgres/Redis chain is wired end to end in Phase 1.
 * Real domain data-fetching (products, cart, orders) follows this same
 * pattern from Phase 4 onward, generated from the OpenAPI schema rather
 * than hand-written per Technical Architecture, F.3.
 */
export async function getApiHealth(): Promise<HealthReport | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok && res.status !== 503) return null;
    return (await res.json()) as HealthReport;
  } catch {
    return null;
  }
}
