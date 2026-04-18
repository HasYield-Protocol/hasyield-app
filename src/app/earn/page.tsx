"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { TokenPair } from "@/components/token-icon";
import { getMarinadeApy } from "@/lib/marinade-apy";

type Vault = {
  slug: string;
  pair: [string, string];
  name: string;
  strategy: string;
  tvl: string;
  lpApy: number;
  stakeApy: number;
  lendApy: number;
  venues: string[];
  status: "live" | "soon";
};

type View = "grid" | "list";

export default function EarnPage() {
  const [marinade, setMarinade] = useState(0.072);
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    getMarinadeApy().then(setMarinade);
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("hy-earn-view") : null;
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("hy-earn-view", view);
  }, [view]);

  const vaults: Vault[] = [
    {
      slug: "sol-usdc",
      pair: ["SOL", "USDC"],
      name: "SOL/USDC Rehypothecation",
      strategy: "DLMM bin liquidity + Marinade staking + USDC money-market",
      tvl: "Devnet",
      lpApy: 11.4,
      stakeApy: marinade * 100,
      lendApy: 4.5,
      venues: ["Meteora", "Marinade", "HasYield Lending"],
      status: "live",
    },
    {
      slug: "sol-usdt",
      pair: ["SOL", "USDT"],
      name: "SOL/USDT Rehypothecation",
      strategy: "DLMM bin liquidity + SOL staking + USDT money-market",
      tvl: "—",
      lpApy: 9.8,
      stakeApy: marinade * 100,
      lendApy: 3.2,
      venues: ["Meteora", "Marinade", "Kamino"],
      status: "soon",
    },
    {
      slug: "eth-usdc",
      pair: ["ETH", "USDC"],
      name: "ETH/USDC Correlated",
      strategy: "DLMM bin liquidity + ETH LST + USDC money-market",
      tvl: "—",
      lpApy: 8.6,
      stakeApy: 3.4,
      lendApy: 5.1,
      venues: ["Meteora", "Jito", "MarginFi"],
      status: "soon",
    },
    {
      slug: "wbtc-usdc",
      pair: ["WBTC", "USDC"],
      name: "WBTC/USDC Blue-chip",
      strategy: "DLMM bin liquidity + WBTC lending + USDC money-market",
      tvl: "—",
      lpApy: 6.2,
      stakeApy: 0,
      lendApy: 7.8,
      venues: ["Meteora", "Kamino", "Solend"],
      status: "soon",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--hy-bg)", color: "var(--hy-ink)" }}>
      <AppHeader />
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-6 flex-wrap mb-10">
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.2em] mb-3"
                style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
              >
                Earn · Vault browser
              </div>
              <h1
                className="font-medium tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display)", fontSize: 40, color: "var(--hy-ink)" }}
              >
                Pick a vault. Earn triple yield.
              </h1>
              <p className="text-[15px] mt-3 max-w-[620px]" style={{ color: "var(--hy-ink-2)" }}>
                Each HasYield vault wraps a Meteora DLMM pool with rehypothecation. Deposit once — we route to the
                highest-yielding staking and lending venues.
              </p>
            </div>
            <ViewToggle view={view} setView={setView} />
          </div>

          {view === "list" ? <ListView vaults={vaults} /> : <GridView vaults={vaults} />}
        </div>
      </main>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div
      className="inline-flex rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--hy-line-strong)", fontFamily: "var(--font-data)" }}
    >
      {(["list", "grid"] as View[]).map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-3.5 py-2 text-[11px] uppercase tracking-[0.15em] flex items-center gap-2 transition-colors"
            style={{
              background: active ? "rgba(141,211,255,0.1)" : "transparent",
              color: active ? "var(--hy-blue)" : "var(--hy-ink-2)",
            }}
          >
            {v === "list" ? <ListIcon /> : <GridIcon />}
            {v}
          </button>
        );
      })}
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 2.5h10M1 6h10M1 9.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="4" height="4" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
      <rect x="7" y="1" width="4" height="4" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
      <rect x="1" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
      <rect x="7" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1.2" rx="0.5" />
    </svg>
  );
}

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
      style={{
        fontFamily: "var(--font-data)",
        border: `1px solid ${live ? "var(--hy-good)" : "var(--hy-line-strong)"}`,
        color: live ? "var(--hy-good)" : "var(--hy-ink-3)",
      }}
    >
      {live && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "var(--hy-good)", boxShadow: "0 0 8px var(--hy-good)" }}
        />
      )}
      {live ? "Live" : "Soon"}
    </span>
  );
}

function totalApy(v: Vault) {
  return v.lpApy + v.stakeApy + v.lendApy;
}

/* ---------------- LIST VIEW (Morpho-style) ---------------- */

function ListView({ vaults }: { vaults: Vault[] }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line-strong)" }}
    >
      <div
        className="grid gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.15em]"
        style={{
          gridTemplateColumns: "2fr 1.4fr 1fr 1fr auto",
          fontFamily: "var(--font-data)",
          color: "var(--hy-ink-3)",
          borderBottom: "1px dashed var(--hy-line)",
        }}
      >
        <span>Vault</span>
        <span>Strategy</span>
        <span>TVL</span>
        <span>Combined APY</span>
        <span />
      </div>
      {vaults.map((v) => (
        <ListRow key={v.slug} vault={v} />
      ))}
    </div>
  );
}

function ListRow({ vault }: { vault: Vault }) {
  const live = vault.status === "live";
  const total = totalApy(vault);
  const content = (
    <div
      className="grid gap-4 px-5 py-4 items-center transition-colors"
      style={{
        gridTemplateColumns: "2fr 1.4fr 1fr 1fr auto",
        borderTop: "1px solid var(--hy-line)",
        opacity: live ? 1 : 0.78,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <TokenPair a={vault.pair[0]} b={vault.pair[1]} size={30} />
        <div className="min-w-0">
          <div
            className="text-[14px] font-medium truncate"
            style={{ fontFamily: "var(--font-display)", color: "var(--hy-ink)" }}
          >
            {vault.name}
          </div>
          <div
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            {vault.pair.join(" · ")}
          </div>
        </div>
      </div>
      <div className="text-[12px] truncate" style={{ color: "var(--hy-ink-2)" }}>
        {vault.venues.join(" · ")}
      </div>
      <div
        className="text-[13px]"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-2)" }}
      >
        {vault.tvl}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-medium tracking-tight"
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 20,
            color: live ? "var(--hy-blue)" : "var(--hy-ink-2)",
            letterSpacing: "-0.03em",
          }}
        >
          {total.toFixed(1)}%
        </span>
      </div>
      <div className="flex items-center gap-3 justify-end">
        <LiveBadge live={live} />
        <span
          className="text-[12px] font-medium whitespace-nowrap"
          style={{ color: live ? "var(--hy-cream)" : "var(--hy-ink-3)" }}
        >
          {live ? "Enter →" : "Waitlist"}
        </span>
      </div>
    </div>
  );
  return live ? (
    <Link href="/vault" className="block hover:bg-[rgba(141,211,255,0.04)]">
      {content}
    </Link>
  ) : (
    <div className="cursor-not-allowed">{content}</div>
  );
}

/* ---------------- GRID VIEW ---------------- */

function GridView({ vaults }: { vaults: Vault[] }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vaults.map((v) => (
        <GridCard key={v.slug} vault={v} />
      ))}
    </div>
  );
}

function GridCard({ vault }: { vault: Vault }) {
  const total = totalApy(vault);
  const live = vault.status === "live";
  const content = (
    <div
      className="rounded-2xl p-6 h-full flex flex-col transition-all"
      style={{
        background: "var(--hy-panel)",
        border: `1px solid ${live ? "rgba(141,211,255,0.2)" : "var(--hy-line-strong)"}`,
        opacity: live ? 1 : 0.82,
      }}
    >
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TokenPair a={vault.pair[0]} b={vault.pair[1]} size={34} />
          <div className="min-w-0">
            <div
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
            >
              {vault.pair.join(" · ")}
            </div>
            <div
              className="text-[15px] font-medium leading-tight mt-0.5"
              style={{ fontFamily: "var(--font-display)", color: "var(--hy-ink)" }}
            >
              {vault.name}
            </div>
          </div>
        </div>
        <LiveBadge live={live} />
      </div>

      <p className="text-[13px] leading-relaxed mb-5" style={{ color: "var(--hy-ink-2)" }}>
        {vault.strategy}
      </p>

      <div
        className="flex items-baseline gap-2 mb-4 pb-5"
        style={{ borderBottom: "1px dashed var(--hy-line)" }}
      >
        <span
          className="font-medium tracking-tight"
          style={{
            fontFamily: "var(--font-data)",
            fontSize: 32,
            color: live ? "var(--hy-blue)" : "var(--hy-ink-2)",
            letterSpacing: "-0.03em",
          }}
        >
          {total.toFixed(1)}%
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
        >
          combined APY
        </span>
      </div>

      <div className="space-y-1.5 mb-5" style={{ fontFamily: "var(--font-data)", fontSize: 11 }}>
        <ApyRow label="LP fees" pct={vault.lpApy} max={total} />
        {vault.stakeApy > 0 && <ApyRow label="Staking" pct={vault.stakeApy} max={total} />}
        {vault.lendApy > 0 && <ApyRow label="Lending" pct={vault.lendApy} max={total} />}
      </div>

      <div
        className="mt-auto flex items-center justify-between pt-4"
        style={{ borderTop: "1px dashed var(--hy-line)" }}
      >
        <div
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
        >
          {vault.venues.join(" · ")}
        </div>
        <div
          className="text-[12px] font-medium"
          style={{ color: live ? "var(--hy-cream)" : "var(--hy-ink-3)" }}
        >
          {live ? "Enter vault →" : "Waitlist"}
        </div>
      </div>
    </div>
  );
  return live ? (
    <Link href="/vault" className="block">
      {content}
    </Link>
  ) : (
    <div className="cursor-not-allowed">{content}</div>
  );
}

function ApyRow({ label, pct, max }: { label: string; pct: number; max: number }) {
  const width = Math.max(6, (pct / Math.max(max, 0.001)) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-14" style={{ color: "var(--hy-ink-2)" }}>
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--hy-panel-2)" }}>
        <div style={{ width: `${width}%`, height: "100%", background: "var(--hy-blue)", opacity: 0.8 }} />
      </div>
      <span className="w-12 text-right" style={{ color: "var(--hy-ink)" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}
