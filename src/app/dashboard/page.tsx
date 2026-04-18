"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AppHeader } from "@/components/app-header";
import { TokenPair, TokenIcon } from "@/components/token-icon";
import { readVaultState, type VaultState } from "@/lib/on-chain-reader";
import { getMarinadeApy } from "@/lib/marinade-apy";

const SOL_PRICE_USD = 155;

export default function DashboardPage() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [state, setState] = useState<VaultState | null>(null);
  const [marinadeApy, setMarinadeApy] = useState(0.072);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMarinadeApy().then(setMarinadeApy);
  }, []);

  useEffect(() => {
    if (!publicKey) {
      setState(null);
      return;
    }
    let cancel = false;
    const load = async () => {
      setLoading(true);
      try {
        const s = await readVaultState(connection, publicKey);
        if (!cancel) setState(s);
      } catch {
        if (!cancel) setState(null);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [connection, publicKey]);

  const hasPosition = state ? state.userHylpBalance > 0 || state.collateralDeposited > 0 : false;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--hy-bg)", color: "var(--hy-ink)" }}>
      <AppHeader />
      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div
              className="text-[11px] uppercase tracking-[0.2em] mb-3"
              style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
            >
              Dashboard · Portfolio
            </div>
            <h1
              className="font-medium tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--hy-ink)" }}
            >
              Your positions across HasYield
            </h1>
          </div>

          {!connected && <ConnectEmpty />}
          {connected && !hasPosition && !loading && <NoPositionEmpty />}
          {connected && hasPosition && state && (
            <PositionView state={state} marinadeApy={marinadeApy} />
          )}
          {connected && loading && !state && <LoadingSkeleton />}
        </div>
      </main>
    </div>
  );
}

function ConnectEmpty() {
  return (
    <EmptyCard
      title="Connect wallet to view positions"
      body="Your HasYield vault shares, loan position, and yield accrual will show here once you connect."
      cta={null}
    />
  );
}

function NoPositionEmpty() {
  return (
    <EmptyCard
      title="No positions yet"
      body="You haven't deposited into any HasYield vault. Pick a vault in Earn to start stacking triple yield on your capital."
      cta={
        <Link
          href="/earn"
          className="inline-flex items-center gap-2 px-5 py-3 text-[14px] font-medium rounded-lg"
          style={{ background: "var(--hy-cream)", color: "#0a0a0a" }}
        >
          Browse vaults →
        </Link>
      }
    />
  );
}

function EmptyCard({ title, body, cta }: { title: string; body: string; cta: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{ background: "var(--hy-panel)", border: "1px dashed var(--hy-line-strong)" }}
    >
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6"
        style={{ background: "var(--hy-panel-2)", border: "1px solid var(--hy-line-strong)" }}
      >
        <span style={{ fontSize: 22, color: "var(--hy-blue)" }}>◇</span>
      </div>
      <h2
        className="text-[22px] font-medium mb-3 tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h2>
      <p className="max-w-[420px] mx-auto mb-7 text-[14px] leading-relaxed" style={{ color: "var(--hy-ink-2)" }}>
        {body}
      </p>
      {cta}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl h-24 animate-pulse"
          style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line)" }}
        />
      ))}
    </div>
  );
}

function PositionView({ state, marinadeApy }: { state: VaultState; marinadeApy: number }) {
  const hylp = state.userHylpBalance / 1e9;
  const collateral = state.collateralDeposited / 1e9;
  const borrowed = state.borrowedAmount / 1e6;
  const msol = state.vaultMsolBalance / 1e9;
  const solBalance = state.userSolBalance / 1e9;

  // Approximate USD value: hyLP position roughly = proportional share of vault SOL + USDC + mSOL
  const share = state.totalShares > 0 ? (state.userHylpBalance + state.collateralDeposited) / state.totalShares : 0;
  const vaultSolValue = (state.totalDepositedY / 1e9 + msol) * SOL_PRICE_USD;
  const vaultUsdcValue = state.totalDepositedX / 1e6;
  const positionUsd = share * (vaultSolValue + vaultUsdcValue);

  const combinedApy = 11.4 + marinadeApy * 100 + 4.5;
  const dailyYield = (positionUsd * combinedApy) / 100 / 365;

  return (
    <div className="flex flex-col gap-8">
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--hy-line-strong)" }}
      >
        <Kpi label="Portfolio value" value={`$${positionUsd.toFixed(2)}`} sub="across all vaults" accent />
        <Kpi label="Vault shares (hyLP)" value={(hylp + collateral).toFixed(4)} sub={`${(share * 100).toFixed(2)}% of vault`} />
        <Kpi label="Est. daily yield" value={`$${dailyYield.toFixed(4)}`} sub={`${combinedApy.toFixed(1)}% combined APY`} />
        <Kpi label="Loan outstanding" value={`$${borrowed.toFixed(2)}`} sub={borrowed > 0 ? "USDC borrowed" : "no active loan"} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[16px] font-medium tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Active positions
          </h2>
          <Link
            href="/earn"
            className="text-[12px]"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
          >
            + New position
          </Link>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line-strong)" }}
        >
          <div
            className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.15em]"
            style={{
              fontFamily: "var(--font-data)",
              color: "var(--hy-ink-3)",
              borderBottom: "1px dashed var(--hy-line)",
            }}
          >
            <span>Vault</span>
            <span>Balance</span>
            <span>Collateral</span>
            <span>APY</span>
            <span />
          </div>
          <PositionRow
            pair={["SOL", "USDC"]}
            name="SOL/USDC Rehypothecation"
            balance={`${hylp.toFixed(4)} hyLP`}
            collateral={collateral > 0 ? `${collateral.toFixed(4)} hyLP` : "—"}
            apy={`${combinedApy.toFixed(1)}%`}
          />
        </div>
      </section>

      <section>
        <h2
          className="text-[16px] font-medium tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Capital allocation
        </h2>
        <AllocationStrip
          marinadeAllocationBps={state.marinadeAllocationBps}
          totalSol={state.totalDepositedY / 1e9 + msol}
          msol={msol}
          totalUsdc={state.totalDepositedX / 1e6}
        />
      </section>

      <section>
        <h2
          className="text-[16px] font-medium tracking-tight mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Wallet
        </h2>
        <div
          className="flex items-center gap-6 rounded-xl px-5 py-4"
          style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line-strong)" }}
        >
          <div className="flex items-center gap-3">
            <TokenIcon symbol="SOL" size={28} />
            <div>
              <div className="text-[11px]" style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}>
                SOL
              </div>
              <div className="text-[15px] font-medium" style={{ fontFamily: "var(--font-data)" }}>
                {solBalance.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className="px-5 py-4"
      style={{
        background: "var(--hy-panel)",
        borderRight: "1px dashed var(--hy-line)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.15em] mb-1.5"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="font-medium text-[20px] tracking-tight leading-none"
        style={{
          fontFamily: "var(--font-data)",
          color: accent ? "var(--hy-blue)" : "var(--hy-ink)",
        }}
      >
        {value}
      </div>
      <div
        className="text-[11px] mt-1.5"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        {sub}
      </div>
    </div>
  );
}

function PositionRow({
  pair,
  name,
  balance,
  collateral,
  apy,
}: {
  pair: [string, string];
  name: string;
  balance: string;
  collateral: string;
  apy: string;
}) {
  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center">
      <div className="flex items-center gap-3">
        <TokenPair a={pair[0]} b={pair[1]} size={30} />
        <div>
          <div className="text-[14px] font-medium" style={{ fontFamily: "var(--font-display)" }}>
            {name}
          </div>
          <div className="text-[10px] uppercase tracking-[0.15em]" style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}>
            {pair.join(" · ")}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-data)", fontSize: 13 }}>{balance}</div>
      <div style={{ fontFamily: "var(--font-data)", fontSize: 13, color: "var(--hy-ink-2)" }}>{collateral}</div>
      <div style={{ fontFamily: "var(--font-data)", fontSize: 13, color: "var(--hy-blue)" }}>{apy}</div>
      <Link
        href="/vault"
        className="text-[11px] px-3 py-1.5 rounded-md"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-cream)", border: "1px solid var(--hy-line-strong)" }}
      >
        Manage →
      </Link>
    </div>
  );
}

function AllocationStrip({
  marinadeAllocationBps,
  totalSol,
  msol,
  totalUsdc,
}: {
  marinadeAllocationBps: number;
  totalSol: number;
  msol: number;
  totalUsdc: number;
}) {
  const solUsd = totalSol * SOL_PRICE_USD;
  const msolUsd = msol * SOL_PRICE_USD;
  const dlmmUsd = Math.max(solUsd - msolUsd + totalUsdc, 0);
  const total = dlmmUsd + msolUsd + totalUsdc * 0; // lending portion reuses USDC; show DLMM + Marinade split for simplicity
  const dlmmPct = total > 0 ? (dlmmUsd / total) * 100 : 100 - marinadeAllocationBps / 100;
  const marinadePct = total > 0 ? (msolUsd / total) * 100 : marinadeAllocationBps / 100;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line-strong)" }}
    >
      <div className="flex h-3 rounded overflow-hidden" style={{ background: "var(--hy-panel-2)" }}>
        <div style={{ width: `${dlmmPct}%`, background: "var(--hy-blue)" }} />
        <div style={{ width: `${marinadePct}%`, background: "var(--hy-cream)" }} />
      </div>
      <div
        className="grid grid-cols-2 gap-4 mt-4 text-[12px]"
        style={{ fontFamily: "var(--font-data)" }}
      >
        <AllocRow color="var(--hy-blue)" label="Meteora DLMM" value={`${dlmmPct.toFixed(1)}%`} />
        <AllocRow color="var(--hy-cream)" label="Marinade staking" value={`${marinadePct.toFixed(1)}%`} />
      </div>
    </div>
  );
}

function AllocRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span style={{ color: "var(--hy-ink-2)" }}>{label}</span>
      <span className="ml-auto" style={{ color: "var(--hy-ink)" }}>
        {value}
      </span>
    </div>
  );
}
