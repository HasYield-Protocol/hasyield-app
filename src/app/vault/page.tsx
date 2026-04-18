"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AppHeader } from "@/components/app-header";
import { TokenIcon, TokenPair } from "@/components/token-icon";
import { useVaultActions } from "@/hooks/use-vault-actions";
import { getMarinadeApy } from "@/lib/marinade-apy";
import { getPoolInfo, type PoolInfo } from "@/lib/meteora";
import { POSITION_LOWER_BIN_ID, POSITION_WIDTH, ACTIVE_ID } from "@/lib/lp-constants";

const SOL_PRICE_USD = 155;

export default function VaultPage() {
  const { connected } = useWallet();
  const actions = useVaultActions();
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [marinadeApy, setMarinadeApy] = useState(0.072);

  useEffect(() => {
    getPoolInfo().then(setPool);
    getMarinadeApy().then(setMarinadeApy);
  }, []);

  const s = actions.state;
  const hasPosition = !!(s && (s.userHylpBalance > 0 || s.collateralDeposited > 0));
  const hasLoan = !!(s && s.borrowedAmount > 0);
  const hasCollateral = !!(s && s.collateralDeposited > 0);

  const lpApy = (pool?.apy ?? 0.114) * 100;
  const stakeApy = marinadeApy * 100;
  const lendApy = 4.5;
  const combinedApy = lpApy + stakeApy + lendApy;

  // Derived position value
  const share = s && s.totalShares > 0 ? (s.userHylpBalance + s.collateralDeposited) / s.totalShares : 0;
  const vaultSolValue = s ? ((s.totalDepositedY / 1e9) + (s.vaultMsolBalance / 1e9)) * SOL_PRICE_USD : 0;
  const vaultUsdcValue = s ? s.totalDepositedX / 1e6 : 0;
  const positionUsd = share * (vaultSolValue + vaultUsdcValue);

  if (!connected) {
    return (
      <>
        <AppHeader />
        <div
          className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6"
          style={{ background: "var(--hy-bg)", color: "var(--hy-ink)" }}
        >
          <div
            className="text-[11px] uppercase tracking-[0.2em] mb-4"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
          >
            SOL/USDC Rehypothecation Vault
          </div>
          <h1
            className="font-medium tracking-tight text-center max-w-[540px] mb-4"
            style={{ fontFamily: "var(--font-display)", fontSize: 36 }}
          >
            Connect wallet to enter the vault
          </h1>
          <p
            className="text-[14px] text-center max-w-[480px] mb-8"
            style={{ color: "var(--hy-ink-2)" }}
          >
            Deposit SOL + USDC. We route your capital through Meteora DLMM, Marinade staking, and money-market collateral.
          </p>
          <WalletMultiButton />
          <Link
            href="/earn"
            className="mt-6 text-[12px]"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            ← Back to vault browser
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen" style={{ background: "var(--hy-bg)", color: "var(--hy-ink)" }}>
        <VaultHeader
          hasPosition={hasPosition}
          combinedApy={combinedApy}
          pool={pool}
          positionUsd={positionUsd}
          hyLpBalance={s ? (s.userHylpBalance + s.collateralDeposited) / 1e9 : 0}
          borrowed={s ? s.borrowedAmount / 1e6 : 0}
        />

        <div className="mx-auto max-w-5xl px-6 pb-24 space-y-16">
          <Chapter01Provide
            hasPosition={hasPosition}
            actions={actions}
            pool={pool}
            lpApy={lpApy}
          />
          <Chapter02Rehypothecate
            hasPosition={hasPosition}
            state={s}
            lpApy={lpApy}
            stakeApy={stakeApy}
            lendApy={lendApy}
          />
          <Chapter03Earn
            hasPosition={hasPosition}
            combinedApy={combinedApy}
            lpApy={lpApy}
            stakeApy={stakeApy}
            lendApy={lendApy}
            positionUsd={positionUsd}
            actions={actions}
          />
          <Chapter04Act
            hasPosition={hasPosition}
            hasCollateral={hasCollateral}
            hasLoan={hasLoan}
            positionUsd={positionUsd}
            borrowed={s ? s.borrowedAmount / 1e6 : 0}
            actions={actions}
          />
        </div>
      </div>
    </>
  );
}

/* ────────── Vault header ────────── */

function VaultHeader({
  hasPosition,
  combinedApy,
  pool,
  positionUsd,
  hyLpBalance,
  borrowed,
}: {
  hasPosition: boolean;
  combinedApy: number;
  pool: PoolInfo | null;
  positionUsd: number;
  hyLpBalance: number;
  borrowed: number;
}) {
  return (
    <div className="border-b" style={{ borderColor: "var(--hy-line)", background: "linear-gradient(180deg, rgba(141,211,255,0.04), transparent 80%)" }}>
      <div className="mx-auto max-w-5xl px-6 pt-8 pb-10">
        <div
          className="flex items-center gap-2 text-[11px] mb-5"
          style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
        >
          <Link href="/earn" className="hover:text-[var(--hy-ink)]" style={{ color: "var(--hy-blue)" }}>
            Earn
          </Link>
          <span>/</span>
          <span style={{ color: "var(--hy-ink)" }}>SOL/USDC Rehypothecation</span>
        </div>

        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="flex items-center gap-4">
            <TokenPair a="SOL" b="USDC" size={48} />
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
              >
                {hasPosition ? "Your Position · Live" : "SOL · USDC · Devnet"}
              </div>
              <h1
                className="font-medium tracking-[-0.02em] mt-1"
                style={{ fontFamily: "var(--font-display)", fontSize: 30 }}
              >
                SOL/USDC Vault
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "var(--hy-ink-2)" }}>
                DLMM fees + Marinade staking + USDC money-market — one deposit, three yield streams.
              </p>
            </div>
          </div>

          <div
            className="flex items-stretch rounded-xl overflow-hidden shrink-0"
            style={{ border: "1px solid var(--hy-line-strong)", background: "var(--hy-panel)" }}
          >
            <HeaderKpi label="Combined APY" value={`${combinedApy.toFixed(1)}%`} accent />
            <HeaderKpi label="Vault TVL" value={pool ? `$${(pool.tvl / 1_000_000).toFixed(1)}M` : "—"} />
            <HeaderKpi
              label={hasPosition ? "Your Position" : "Your hyLP"}
              value={hasPosition ? `$${positionUsd.toFixed(2)}` : hyLpBalance.toFixed(3)}
            />
            <HeaderKpi label="Your Loan" value={`$${borrowed.toFixed(2)}`} last />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderKpi({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="px-4 py-3 min-w-[120px]"
      style={{ borderRight: last ? "none" : "1px dashed var(--hy-line)" }}
    >
      <div
        className="text-[9px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="font-medium text-[16px] leading-none mt-1.5"
        style={{ fontFamily: "var(--font-data)", color: accent ? "var(--hy-blue)" : "var(--hy-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

/* ────────── Chapter primitives ────────── */

function ChapterHead({
  num,
  title,
  sub,
}: {
  num: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <div className="max-w-[640px] mb-6">
      <div
        className="flex items-center gap-2.5 text-[10px] uppercase tracking-[0.2em] mb-2.5"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
      >
        <span className="inline-block w-5 h-px" style={{ background: "var(--hy-blue)" }} />
        Chapter {num}
      </div>
      <h2
        className="font-medium tracking-[-0.02em] leading-tight"
        style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--hy-ink)" }}
      >
        {title}
      </h2>
      <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "var(--hy-ink-2)" }}>
        {sub}
      </p>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line-strong)" }}
    >
      {children}
    </div>
  );
}

/* ────────── Chapter 01 · Provide ────────── */

function Chapter01Provide({
  hasPosition,
  actions,
  pool,
  lpApy,
}: {
  hasPosition: boolean;
  actions: ReturnType<typeof useVaultActions>;
  pool: PoolInfo | null;
  lpApy: number;
}) {
  const [usdc, setUsdc] = useState("");
  const [sol, setSol] = useState("");
  const canDeposit = (parseFloat(usdc) || 0) + (parseFloat(sol) || 0) > 0 && !actions.busy;

  return (
    <section>
      <ChapterHead
        num="01"
        title={hasPosition ? "You're providing liquidity" : "Provide liquidity"}
        sub={
          hasPosition
            ? "Your capital is placed into Meteora DLMM bins, earning concentrated trading fees. Deposit more to increase your share."
            : "Deposit SOL + USDC. We place liquidity into Meteora DLMM bins around the active price. Your bins earn trading fees."
        }
      />
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-4">
        <Panel>
          <div className="flex items-center justify-between mb-4">
            <div
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
            >
              DLMM bin distribution
            </div>
            <span
              className="text-[9px] px-2 py-1 rounded-full"
              style={{
                fontFamily: "var(--font-data)",
                color: "var(--hy-blue)",
                border: "1px solid rgba(141,211,255,0.3)",
              }}
            >
              Auto-managed
            </span>
          </div>
          <div
            className="relative h-24 rounded-lg overflow-hidden mb-3"
            style={{ background: "var(--hy-bg-2)" }}
          >
            <div className="absolute inset-0 flex items-end px-2 gap-[1px]">
              {Array.from({ length: 35 }).map((_, i) => {
                const offset = i - 17;
                const isActive = offset === 0;
                const base = isActive ? 90 : Math.max(20, 75 - Math.abs(offset) * 2);
                return (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      backgroundColor: isActive ? "var(--hy-blue)" : "rgba(141,211,255,0.3)",
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${base}%` }}
                    transition={{ delay: i * 0.015, duration: 0.3 }}
                  />
                );
              })}
            </div>
            <div className="absolute top-0 bottom-0 w-[2px]" style={{ left: "50%", background: "var(--hy-blue)" }}>
              <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full" style={{ background: "var(--hy-blue)" }} />
            </div>
          </div>
          <div
            className="flex justify-between text-[10px]"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            <span>Bin {POSITION_LOWER_BIN_ID}</span>
            <span style={{ color: "var(--hy-blue)" }}>Active · Bin {ACTIVE_ID}</span>
            <span>Bin {POSITION_LOWER_BIN_ID + POSITION_WIDTH - 1}</span>
          </div>
          <div
            className="grid grid-cols-3 mt-5 pt-4"
            style={{ borderTop: "1px dashed var(--hy-line)" }}
          >
            <StatMini label="TVL" value={pool ? `$${(pool.tvl / 1e6).toFixed(1)}M` : "$2.1M"} />
            <StatMini label="24h Volume" value={pool ? `$${(pool.volume24h / 1e3).toFixed(0)}K` : "$842K"} />
            <StatMini label="LP APY" value={`${lpApy.toFixed(1)}%`} accent />
          </div>
        </Panel>

        <Panel>
          <div
            className="text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            Deposit
          </div>
          <DepositInput symbol="USDC" value={usdc} onChange={setUsdc} />
          <div className="h-2" />
          <DepositInput symbol="SOL" value={sol} onChange={setSol} />
          <button
            disabled={!canDeposit}
            onClick={async () => {
              const ok = await actions.deposit(parseFloat(usdc) || 0, parseFloat(sol) || 0);
              if (ok) {
                setUsdc("");
                setSol("");
              }
            }}
            className="w-full mt-4 py-3 rounded-lg font-medium text-[14px] transition-opacity"
            style={{
              background: canDeposit ? "var(--hy-cream)" : "var(--hy-panel-2)",
              color: canDeposit ? "#0a0a0a" : "var(--hy-ink-3)",
              cursor: canDeposit ? "pointer" : "not-allowed",
            }}
          >
            {actions.busy ? "Processing…" : hasPosition ? "Deposit more" : "Deposit & start earning"}
          </button>
          <p
            className="text-[10px] mt-3 leading-relaxed"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            SOL-only or USDC-only accepted. We auto-split across DLMM, staking, and lending after the deposit lands.
          </p>
        </Panel>
      </div>
    </section>
  );
}

function StatMini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div
        className="text-[9px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="text-[14px] font-medium mt-1"
        style={{ fontFamily: "var(--font-data)", color: accent ? "var(--hy-blue)" : "var(--hy-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}

function DepositInput({
  symbol,
  value,
  onChange,
}: {
  symbol: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "var(--hy-bg-2)", border: "1px solid var(--hy-line)" }}
    >
      <TokenIcon symbol={symbol} size={32} />
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^\d*\.?\d*$/.test(v)) onChange(v);
        }}
        placeholder="0.00"
        className="flex-1 bg-transparent outline-none text-[18px] font-medium tabular-nums"
        style={{ color: "var(--hy-ink)", fontFamily: "var(--font-data)" }}
      />
      <span className="text-[12px]" style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}>
        {symbol}
      </span>
    </div>
  );
}

/* ────────── Chapter 02 · Rehypothecate ────────── */

function Chapter02Rehypothecate({
  hasPosition,
  state,
  lpApy,
  stakeApy,
  lendApy,
}: {
  hasPosition: boolean;
  state: ReturnType<typeof useVaultActions>["state"];
  lpApy: number;
  stakeApy: number;
  lendApy: number;
}) {
  const marinadePct = state ? state.marinadeAllocationBps / 100 : 30;
  const lendingPct = 0;
  const dlmmPct = 100 - marinadePct - lendingPct;
  const msolAmount = state ? state.vaultMsolBalance / 1e9 : 0;
  const solInVault = state ? state.totalDepositedY / 1e9 : 0;
  const usdcInVault = state ? state.totalDepositedX / 1e6 : 0;

  const [showSankey, setShowSankey] = useState(false);

  return (
    <section>
      <ChapterHead
        num="02"
        title={hasPosition ? "Your capital is rehypothecated" : "Capital gets rehypothecated"}
        sub={
          hasPosition
            ? "While your bins earn DLMM fees, the idle underlying is staked and lent. Live allocation from chain, rebalanced by the HasYield cranker."
            : "SOL routes to liquid staking. USDC routes to money-market collateral. Bins still earn fees on top. AI-driven cranker rebalances to the highest venue."
        }
      />

      <Panel>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            Your capital flow
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] uppercase tracking-[0.15em]"
              style={{
                fontFamily: "var(--font-data)",
                border: "1px solid rgba(141,211,255,0.3)",
                color: "var(--hy-blue)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--hy-blue)", boxShadow: "0 0 6px var(--hy-blue)" }}
              />
              AI-routed · 6h cadence
            </span>
            <span
              className="text-[10px]"
              style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
            >
              next in 2h 14m
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <FlowCard
            venue="DLMM Bins"
            sub="Meteora · LP fees"
            apy={lpApy}
            pct={dlmmPct}
            color="var(--hy-blue)"
            live={hasPosition}
            badge="active"
          />
          <FlowCard
            venue="Marinade"
            sub={`SOL staking · ${msolAmount > 0 ? msolAmount.toFixed(3) + " mSOL" : "soonest cranker"}`}
            apy={stakeApy}
            pct={marinadePct}
            color="var(--hy-cream)"
            live={hasPosition && msolAmount > 0}
            badge="best"
            alts={["Jito 7.8%", "Sanctum 6.8%"]}
          />
          <FlowCard
            venue="HasYield Lending"
            sub="USDC · money-market"
            apy={lendApy}
            pct={lendingPct}
            color="var(--hy-good)"
            live={false}
            badge={undefined}
            alts={["Kamino 13.1%", "MarginFi 11.4%", "Solend 8.5%"]}
            soon
          />
        </div>

        <button
          onClick={() => setShowSankey((v) => !v)}
          className="w-full py-2.5 rounded-lg text-[11px] uppercase tracking-[0.15em] transition-colors"
          style={{
            fontFamily: "var(--font-data)",
            background: "transparent",
            border: "1px dashed var(--hy-line-strong)",
            color: "var(--hy-blue)",
          }}
        >
          {showSankey ? "▴ Hide full capital flow" : "▾ See full capital flow"}
        </button>

        {showSankey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.35 }}
            className="mt-5 overflow-hidden"
          >
            <SankeyFlow
              solAmount={solInVault}
              usdcAmount={usdcInVault}
              msolAmount={msolAmount}
              marinadePct={marinadePct}
              dlmmPct={dlmmPct}
              lpApy={lpApy}
              stakeApy={stakeApy}
              lendApy={lendApy}
            />
            <p
              className="text-[10px] mt-4 leading-relaxed"
              style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
            >
              Composability layer — venues marked <span style={{ color: "var(--hy-blue)" }}>live</span> execute via
              on-chain CPI. Non-live venues are wired for routing once cranker whitelists them.
            </p>
          </motion.div>
        )}
      </Panel>
    </section>
  );
}

function FlowCard({
  venue,
  sub,
  apy,
  pct,
  color,
  live,
  badge,
  alts,
  soon,
}: {
  venue: string;
  sub: string;
  apy: number;
  pct: number;
  color: string;
  live: boolean;
  badge?: "active" | "best";
  alts?: string[];
  soon?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--hy-panel-2)", border: "1px solid var(--hy-line)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[13px] font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--hy-ink)" }}
        >
          {venue}
        </span>
        {badge === "active" && (
          <span
            className="text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)", border: "1px solid rgba(141,211,255,0.3)" }}
          >
            active
          </span>
        )}
        {badge === "best" && (
          <span
            className="text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-cream)", border: "1px solid var(--hy-cream)" }}
          >
            best
          </span>
        )}
        {soon && (
          <span
            className="text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full ml-auto"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)", border: "1px solid var(--hy-line-strong)" }}
          >
            soon
          </span>
        )}
        {live && (
          <span
            className="ml-auto inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-good)", border: "1px solid var(--hy-good)" }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: "var(--hy-good)" }} />
            live
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <span
          className="text-[22px] font-medium tracking-tight"
          style={{ fontFamily: "var(--font-data)", color: live ? color : "var(--hy-ink-2)", letterSpacing: "-0.03em" }}
        >
          {apy.toFixed(1)}%
        </span>
        <span
          className="text-[10px]"
          style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
        >
          {pct.toFixed(0)}% · {sub}
        </span>
      </div>

      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--hy-bg-2)" }}>
        <div style={{ width: `${Math.max(pct, 5)}%`, height: "100%", background: color, opacity: 0.85 }} />
      </div>

      {alts && alts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {alts.map((a) => (
            <span
              key={a}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                fontFamily: "var(--font-data)",
                color: "var(--hy-ink-3)",
                background: "var(--hy-bg-2)",
              }}
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SankeyFlow({
  solAmount,
  usdcAmount,
  msolAmount,
  marinadePct,
  dlmmPct,
  lpApy,
  stakeApy,
  lendApy,
}: {
  solAmount: number;
  usdcAmount: number;
  msolAmount: number;
  marinadePct: number;
  dlmmPct: number;
  lpApy: number;
  stakeApy: number;
  lendApy: number;
}) {
  // layout constants
  const W = 820;
  const H = 340;
  const leftX = 90;
  const midX = 390;
  const rightX = 700;
  const nodeW = 110;
  const nodeH = 48;

  const sources = [
    { id: "sol", label: "SOL", sub: solAmount > 0 ? `${solAmount.toFixed(2)} SOL` : "vault leg", y: 70, color: "var(--hy-blue)" },
    { id: "usdc", label: "USDC", sub: usdcAmount > 0 ? `${usdcAmount.toFixed(0)} USDC` : "vault leg", y: 230, color: "var(--hy-cream)" },
  ];
  const mids = [
    { id: "dlmm", label: "DLMM Bins", sub: "Meteora", y: 50, live: true },
    { id: "marinade", label: "Marinade", sub: msolAmount > 0 ? "live · mSOL" : "SOL staking", y: 150, live: msolAmount > 0 },
    { id: "lending", label: "Lending", sub: "HasYield", y: 250, live: false },
  ];
  const sinks = [
    { id: "lp", label: `LP fees ${lpApy.toFixed(1)}%`, y: 40, color: "var(--hy-blue)", live: true },
    { id: "mar", label: `Marinade ${stakeApy.toFixed(1)}%`, y: 110, color: "var(--hy-cream)", live: msolAmount > 0 },
    { id: "san", label: "Sanctum 6.8%", y: 170, color: "var(--hy-ink-2)", live: false },
    { id: "kam", label: "Kamino 13.1%", y: 230, color: "var(--hy-ink-2)", live: false },
    { id: "mfi", label: `MarginFi ${lendApy.toFixed(1)}%`, y: 290, color: "var(--hy-ink-2)", live: false },
  ];

  // edges: (from y in left, to y in mid, weight)
  const edgesLeftMid: Array<{ fromY: number; toY: number; w: number; color: string; live: boolean }> = [
    // SOL → DLMM (majority) + Marinade (30%)
    { fromY: 70, toY: 50, w: 6, color: "var(--hy-blue)", live: true },
    { fromY: 70, toY: 150, w: 4, color: "var(--hy-cream)", live: msolAmount > 0 },
    // USDC → DLMM + Lending
    { fromY: 230, toY: 50, w: 5, color: "var(--hy-cream)", live: true },
    { fromY: 230, toY: 250, w: 3, color: "var(--hy-ink-2)", live: false },
  ];
  const edgesMidSink: Array<{ fromY: number; toY: number; w: number; color: string; live: boolean }> = [
    { fromY: 50, toY: 40, w: 6, color: "var(--hy-blue)", live: true },
    { fromY: 150, toY: 110, w: 4, color: "var(--hy-cream)", live: msolAmount > 0 },
    { fromY: 150, toY: 170, w: 2, color: "var(--hy-ink-2)", live: false },
    { fromY: 250, toY: 230, w: 3, color: "var(--hy-ink-2)", live: false },
    { fromY: 250, toY: 290, w: 3, color: "var(--hy-ink-2)", live: false },
  ];

  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cx2 = x1 + (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  };

  const Node = ({ x, y, label, sub, live, dashed }: { x: number; y: number; label: string; sub: string; live?: boolean; dashed?: boolean }) => (
    <g>
      <rect
        x={x - nodeW / 2}
        y={y - nodeH / 2}
        width={nodeW}
        height={nodeH}
        rx={6}
        fill="var(--hy-panel-2)"
        stroke={live ? "rgba(141,211,255,0.4)" : "var(--hy-line-strong)"}
        strokeWidth={1}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      <text
        x={x}
        y={y - 4}
        textAnchor="middle"
        fill="var(--hy-ink)"
        style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 500 }}
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor="middle"
        fill="var(--hy-ink-3)"
        style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        {sub}
      </text>
    </g>
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 720 }}>
        {/* edges left → mid */}
        {edgesLeftMid.map((e, i) => (
          <path
            key={`lm-${i}`}
            d={curve(leftX + nodeW / 2, e.fromY, midX - nodeW / 2, e.toY)}
            stroke={e.color}
            strokeWidth={e.w}
            strokeOpacity={e.live ? 0.65 : 0.2}
            strokeLinecap="round"
            fill="none"
          />
        ))}
        {/* edges mid → sink */}
        {edgesMidSink.map((e, i) => (
          <path
            key={`ms-${i}`}
            d={curve(midX + nodeW / 2, e.fromY, rightX - nodeW / 2, e.toY)}
            stroke={e.color}
            strokeWidth={e.w}
            strokeOpacity={e.live ? 0.65 : 0.2}
            strokeLinecap="round"
            fill="none"
          />
        ))}

        {/* nodes */}
        {sources.map((s) => (
          <Node key={s.id} x={leftX} y={s.y} label={s.label} sub={s.sub} dashed />
        ))}
        {mids.map((m) => (
          <Node key={m.id} x={midX} y={m.y} label={m.label} sub={m.sub} live={m.live} />
        ))}
        {sinks.map((sk) => (
          <g key={sk.id}>
            <rect
              x={rightX - nodeW / 2}
              y={sk.y - 14}
              width={nodeW}
              height={28}
              rx={5}
              fill="var(--hy-panel-2)"
              stroke={sk.live ? "rgba(141,211,255,0.4)" : "var(--hy-line-strong)"}
              strokeWidth={1}
              strokeDasharray={sk.live ? undefined : "3 3"}
            />
            <text
              x={rightX}
              y={sk.y + 3}
              textAnchor="middle"
              fill={sk.live ? "var(--hy-ink)" : "var(--hy-ink-3)"}
              style={{ fontFamily: "var(--font-data)", fontSize: 10, fontWeight: 500 }}
            >
              {sk.label}
            </text>
          </g>
        ))}

        {/* column headers */}
        <text x={leftX} y={20} textAnchor="middle" fill="var(--hy-ink-3)" style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Vault legs
        </text>
        <text x={midX} y={20} textAnchor="middle" fill="var(--hy-ink-3)" style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Routing
        </text>
        <text x={rightX} y={20} textAnchor="middle" fill="var(--hy-ink-3)" style={{ fontFamily: "var(--font-data)", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase" }}>
          Yield source
        </text>
      </svg>
    </div>
  );
}

/* ────────── Chapter 03 · Earn ────────── */

function Chapter03Earn({
  hasPosition,
  combinedApy,
  lpApy,
  stakeApy,
  lendApy,
  positionUsd,
  actions,
}: {
  hasPosition: boolean;
  combinedApy: number;
  lpApy: number;
  stakeApy: number;
  lendApy: number;
  positionUsd: number;
  actions: ReturnType<typeof useVaultActions>;
}) {
  const dailyYield = hasPosition ? (positionUsd * combinedApy) / 100 / 365 : 0;

  return (
    <section>
      <ChapterHead
        num="03"
        title={hasPosition ? "You're earning three streams" : "Earn three streams"}
        sub={
          hasPosition
            ? "LP fees, staking yield, and lending yield accrue on the same capital. Harvest whenever; your position keeps compounding."
            : "Once your deposit lands, three APY sources compound together. Harvest anytime without closing the position."
        }
      />
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-4">
        <Panel>
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
              >
                {hasPosition ? "Your combined yield" : "Reference combined yield"}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="font-medium tracking-tight"
                  style={{
                    fontFamily: "var(--font-data)",
                    fontSize: 44,
                    color: "var(--hy-blue)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {combinedApy.toFixed(1)}%
                </span>
                <span
                  className="text-[11px] uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
                >
                  combined APY
                </span>
              </div>
            </div>
            {hasPosition && (
              <div className="text-right">
                <div
                  className="text-[10px] uppercase tracking-[0.15em]"
                  style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
                >
                  Est. daily yield
                </div>
                <div
                  className="text-[20px] font-medium mt-1"
                  style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink)" }}
                >
                  ${dailyYield.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5" style={{ fontFamily: "var(--font-data)" }}>
            <YieldBar label="LP fees" pct={lpApy} total={combinedApy} color="var(--hy-blue)" />
            <YieldBar label="Staking" pct={stakeApy} total={combinedApy} color="var(--hy-cream)" />
            <YieldBar label="Lending" pct={lendApy} total={combinedApy} color="var(--hy-good)" />
          </div>
        </Panel>

        <Panel>
          <div
            className="text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            Actions
          </div>
          <button
            disabled={!hasPosition || actions.busy}
            onClick={() => actions.claimFees()}
            className="w-full py-3 rounded-lg font-medium text-[13px] transition-colors"
            style={{
              background: hasPosition ? "rgba(141,211,255,0.1)" : "var(--hy-panel-2)",
              color: hasPosition ? "var(--hy-blue)" : "var(--hy-ink-3)",
              border: `1px solid ${hasPosition ? "rgba(141,211,255,0.3)" : "var(--hy-line-strong)"}`,
              cursor: hasPosition ? "pointer" : "not-allowed",
            }}
          >
            {actions.busy ? "Working…" : "Harvest DLMM fees"}
          </button>
          <p
            className="text-[10px] mt-3 leading-relaxed"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            {hasPosition
              ? "Calls claim_fee on your DLMM position. Fees accumulate per-bin with each trade."
              : "Harvest unlocks after your first deposit."}
          </p>
        </Panel>
      </div>
    </section>
  );
}

function YieldBar({
  label,
  pct,
  total,
  color,
}: {
  label: string;
  pct: number;
  total: number;
  color: string;
}) {
  const width = Math.max(6, (pct / Math.max(total, 0.001)) * 100);
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="w-20" style={{ color: "var(--hy-ink-2)" }}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--hy-panel-2)" }}>
        <div style={{ width: `${width}%`, height: "100%", background: color, opacity: 0.85 }} />
      </div>
      <span className="w-14 text-right" style={{ color: "var(--hy-ink)" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

/* ────────── Chapter 04 · Act ────────── */

function Chapter04Act({
  hasPosition,
  hasCollateral,
  hasLoan,
  positionUsd,
  borrowed,
  actions,
}: {
  hasPosition: boolean;
  hasCollateral: boolean;
  hasLoan: boolean;
  positionUsd: number;
  borrowed: number;
  actions: ReturnType<typeof useVaultActions>;
}) {
  const maxBorrow = positionUsd * 0.5;
  const [borrowAmount, setBorrowAmount] = useState("");
  const borrowValid = parseFloat(borrowAmount) > 0 && parseFloat(borrowAmount) <= maxBorrow;

  return (
    <section>
      <ChapterHead
        num="04"
        title={hasLoan ? "Manage your loan" : hasPosition ? "Use your position" : "Compose with your position"}
        sub={
          hasLoan
            ? "Repay to unlock collateral. Your position is still earning yield underneath — the loan doesn't stop that."
            : hasPosition
              ? "Lock hyLP as collateral and borrow USDC without closing the position. Or withdraw principal at any time."
              : "Once you have hyLP, you can borrow against it (up to 50% LTV) or withdraw. The position stays composable across Solana DeFi."
        }
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Panel>
          <div
            className="text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            Borrow against position
          </div>
          {!hasCollateral && !hasLoan && (
            <>
              <p
                className="text-[12px] mb-3 leading-relaxed"
                style={{ color: "var(--hy-ink-2)" }}
              >
                Step 1 — lock your hyLP as collateral. Transfer-hook enforces the lockup at the token layer.
              </p>
              <button
                disabled={!hasPosition || actions.busy}
                onClick={() => actions.collateralize()}
                className="w-full py-2.5 rounded-lg font-medium text-[13px]"
                style={{
                  background: hasPosition ? "var(--hy-cream)" : "var(--hy-panel-2)",
                  color: hasPosition ? "#0a0a0a" : "var(--hy-ink-3)",
                  cursor: hasPosition ? "pointer" : "not-allowed",
                }}
              >
                {hasPosition ? "Lock hyLP as collateral" : "Deposit first"}
              </button>
            </>
          )}
          {hasCollateral && !hasLoan && (
            <>
              <p className="text-[12px] mb-3" style={{ color: "var(--hy-ink-2)" }}>
                Collateral locked. Borrow up to{" "}
                <strong style={{ color: "var(--hy-ink)" }}>${maxBorrow.toFixed(2)}</strong> (50% LTV).
              </p>
              <div
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-3"
                style={{ background: "var(--hy-bg-2)", border: "1px solid var(--hy-line)" }}
              >
                <TokenIcon symbol="USDC" size={28} />
                <input
                  type="text"
                  inputMode="decimal"
                  value={borrowAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d*$/.test(v)) setBorrowAmount(v);
                  }}
                  placeholder="0.00"
                  className="flex-1 bg-transparent outline-none text-[16px] tabular-nums"
                  style={{ color: "var(--hy-ink)", fontFamily: "var(--font-data)" }}
                />
                <span className="text-[11px]" style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}>
                  USDC
                </span>
              </div>
              <button
                disabled={!borrowValid || actions.busy}
                onClick={async () => {
                  const ok = await actions.borrow(parseFloat(borrowAmount));
                  if (ok) setBorrowAmount("");
                }}
                className="w-full py-2.5 rounded-lg font-medium text-[13px]"
                style={{
                  background: borrowValid ? "var(--hy-cream)" : "var(--hy-panel-2)",
                  color: borrowValid ? "#0a0a0a" : "var(--hy-ink-3)",
                  cursor: borrowValid ? "pointer" : "not-allowed",
                }}
              >
                Borrow USDC
              </button>
              <button
                onClick={() => actions.withdrawCollateral()}
                disabled={actions.busy}
                className="w-full mt-2 py-2.5 rounded-lg font-medium text-[13px]"
                style={{
                  background: "transparent",
                  color: "var(--hy-ink-2)",
                  border: "1px solid var(--hy-line-strong)",
                }}
              >
                Unlock collateral
              </button>
            </>
          )}
          {hasLoan && (
            <>
              <p className="text-[12px] mb-3" style={{ color: "var(--hy-ink-2)" }}>
                Outstanding: <strong style={{ color: "var(--hy-ink)" }}>${borrowed.toFixed(2)}</strong> USDC
              </p>
              <button
                onClick={() => actions.repay(borrowed)}
                disabled={actions.busy}
                className="w-full py-2.5 rounded-lg font-medium text-[13px]"
                style={{ background: "var(--hy-cream)", color: "#0a0a0a" }}
              >
                Repay & unlock
              </button>
            </>
          )}
        </Panel>

        <Panel>
          <div
            className="text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
          >
            Close position
          </div>
          <p
            className="text-[12px] mb-3 leading-relaxed"
            style={{ color: "var(--hy-ink-2)" }}
          >
            Burn hyLP → withdraw SOL + USDC from DLMM bins. Available when no loan is active.
          </p>
          <button
            disabled={!hasPosition || hasLoan || hasCollateral || actions.busy}
            onClick={() => actions.withdrawPosition()}
            className="w-full py-2.5 rounded-lg font-medium text-[13px]"
            style={{
              background: "transparent",
              color: !hasPosition || hasLoan || hasCollateral ? "var(--hy-ink-3)" : "var(--hy-ink)",
              border: "1px solid var(--hy-line-strong)",
              cursor: !hasPosition || hasLoan || hasCollateral ? "not-allowed" : "pointer",
            }}
          >
            {hasLoan
              ? "Repay loan first"
              : hasCollateral
                ? "Unlock collateral first"
                : hasPosition
                  ? "Withdraw all"
                  : "Deposit first"}
          </button>
        </Panel>
      </div>
    </section>
  );
}
