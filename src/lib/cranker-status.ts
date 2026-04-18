export type CrankerRunLog = {
  timestamp: string;
  marinadeApy: number | null;
  currentBps: number | null;
  optimalBps: number | null;
  deltaBps: number | null;
  decision: "skipped" | "rebalanced" | "error";
  txSig?: string;
  error?: string;
};

export type CrankerStatus = {
  last: CrankerRunLog | null;
  nextEta: Date | null;
  intervalSec: number;
  loaded: boolean;
};

const DEFAULT_INTERVAL = 6 * 60 * 60; // 6h

export async function fetchCrankerStatus(): Promise<CrankerStatus> {
  const endpoint =
    process.env.NEXT_PUBLIC_CRANKER_STATUS_URL ||
    "/api/cranker/status";

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const last: CrankerRunLog | null = data.last ?? null;
    const intervalSec: number = data.intervalSec ?? DEFAULT_INTERVAL;
    const nextEta =
      last ? new Date(new Date(last.timestamp).getTime() + intervalSec * 1000) : null;
    return { last, nextEta, intervalSec, loaded: true };
  } catch {
    return { last: null, nextEta: null, intervalSec: DEFAULT_INTERVAL, loaded: false };
  }
}

export function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatTimeUntil(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "due now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}
