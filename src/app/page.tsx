"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { getMarinadeApy } from "@/lib/marinade-apy";
import { Coin3D } from "@/components/reactbits/coin-3d";

const NAV = [
  { href: "#problem", label: "Problem" },
  { href: "#how", label: "How" },
  { href: "#features", label: "Features" },
  { href: "#preview", label: "App" },
];

const ORBIT_INNER = [
  { name: "Meteora", icon: "/protocols/meteora.png" },
  { name: "Jito", icon: "/protocols/jito.png" },
  { name: "Kamino", icon: "/protocols/kamino.png" },
  { name: "Marinade", icon: "/protocols/marinade.png" },
];
const ORBIT_OUTER = [
  { name: "Solend", icon: "/protocols/solend.png" },
  { name: "MarginFi", icon: "/protocols/marginfi.png" },
  { name: "Sanctum", icon: "/protocols/sanctum.png" },
];

export default function LandingPage() {
  const [apy, setApy] = useState(0.072);
  const [tickerApy, setTickerApy] = useState(15.8);

  useEffect(() => {
    getMarinadeApy().then(setApy);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTickerApy(14.2 + Math.random() * 2.2);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing relative overflow-x-hidden" style={{ background: "var(--hy-bg)", color: "var(--hy-ink)" }}>
      <AmbientBackground />

      <nav
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ background: "rgba(8,8,10,0.7)", borderBottom: "1px solid var(--hy-line)" }}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-8 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded-full" />
            <span className="font-medium text-[15px] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              HasYield
            </span>
          </Link>
          <ul className="hidden md:flex gap-7 list-none m-0 p-0 text-[13px]" style={{ color: "var(--hy-ink-2)" }}>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-[var(--hy-ink)] transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/earn"
            className="px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-colors"
            style={{ background: "var(--hy-cream)", color: "#0a0a0a" }}
          >
            Launch App →
          </Link>
        </div>
      </nav>

      <section className="relative px-8 pt-20 pb-28">
        <div className="mx-auto max-w-[1280px] grid lg:grid-cols-[1.2fr_1fr] gap-20 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em]"
              style={{
                fontFamily: "var(--font-data)",
                border: "1px solid var(--hy-line-strong)",
                color: "var(--hy-ink-2)",
                background: "rgba(141,211,255,0.03)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--hy-blue)", boxShadow: "0 0 12px var(--hy-blue)" }}
              />
              LP position composability layer · Solana
            </div>
            <h1
              className="font-medium leading-[0.98] tracking-[-0.03em] mt-6 mb-7"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(48px, 6.5vw, 84px)",
                color: "var(--hy-ink)",
              }}
            >
              <span className="block">Turn passive LPs</span>
              <span className="block">
                into{" "}
                <em
                  className="not-italic"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    color: "var(--hy-cream)",
                    fontWeight: 400,
                  }}
                >
                  productive capital.
                </em>
              </span>
            </h1>
            <p className="text-[18px] leading-relaxed max-w-[560px] mb-10" style={{ color: "var(--hy-ink-2)" }}>
              HasYield is the{" "}
              <strong style={{ color: "var(--hy-ink)", fontWeight: 500 }}>LP position composability layer</strong>{" "}
              on Solana. Deposit into a DLMM vault, receive <strong style={{ color: "var(--hy-ink)", fontWeight: 500 }}>hyLP</strong> —
              a Token-2022 receipt that stays earning fees while it{" "}
              <strong style={{ color: "var(--hy-ink)", fontWeight: 500 }}>stakes, lends, and collateralizes</strong>.
              Borrow against it, without ever unwinding the position.
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              <Link
                href="/earn"
                className="px-6 py-3.5 text-[15px] font-medium rounded-lg inline-flex items-center gap-2 transition-transform hover:-translate-y-px"
                style={{ background: "var(--hy-cream)", color: "#0a0a0a" }}
              >
                Browse Vaults <span>↗</span>
              </Link>
              <Link
                href="#how"
                className="px-5 py-3.5 text-[15px] font-medium rounded-lg transition-colors"
                style={{
                  border: "1px solid var(--hy-line-strong)",
                  color: "var(--hy-ink)",
                }}
              >
                See how it works
              </Link>
              <span
                className="px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] rounded-full"
                style={{
                  fontFamily: "var(--font-data)",
                  border: "1px dashed var(--hy-line-strong)",
                  color: "var(--hy-ink-3)",
                }}
              >
                Devnet preview
              </span>
            </div>

            <div
              className="mt-14 pt-8 flex gap-8 flex-wrap"
              style={{ borderTop: "1px solid var(--hy-line)" }}
            >
              <LiveStat
                label="hyLP combined APY"
                value={`${tickerApy.toFixed(1)}%`}
                sub="SOL/USDC · fees + stake + lend"
                accent
              />
              <LiveStat
                label="Borrow against hyLP"
                value="50%"
                sub="LTV · Token-2022 transfer hook"
              />
              <LiveStat
                label="Live CPI venues"
                value="2"
                sub={`Meteora · Marinade · ${(apy * 100).toFixed(1)}% stake`}
              />
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <Problem />
      <HowItWorks />
      <Features />
      <DashboardPreview />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function LiveStat({
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
    <div className="flex-1 min-w-[140px]">
      <div
        className="text-[10px] uppercase tracking-[0.15em] mb-1.5"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="font-medium text-[28px] tracking-tight leading-none"
        style={{
          fontFamily: "var(--font-display)",
          color: accent ? "var(--hy-blue)" : "var(--hy-ink)",
        }}
      >
        {value}
      </div>
      <div
        className="text-[11px] mt-1"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        {sub}
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative flex items-center justify-center min-h-[520px]">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 560,
          height: 560,
          border: "1px dashed var(--hy-line-strong)",
          animation: "hy-orbit-rot 30s linear infinite",
        }}
      >
        {ORBIT_INNER.map((p, i) => {
          const angle = (i / ORBIT_INNER.length) * 360;
          return <ProtocolBadge key={p.name} name={p.name} icon={p.icon} angle={angle} radius={280} reverseAnim="hy-orbit-counter" />;
        })}
      </div>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 720,
          height: 720,
          border: "1px dashed rgba(141,211,255,0.08)",
          animation: "hy-orbit-rot 50s linear infinite reverse",
        }}
      >
        {ORBIT_OUTER.map((p, i) => {
          const angle = (i / ORBIT_OUTER.length) * 360 + 30;
          return <ProtocolBadge key={p.name} name={p.name} icon={p.icon} angle={angle} radius={360} reverseAnim="hy-orbit-counter-rev" />;
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        <Coin3D size={260} thickness={28} />
      </motion.div>
    </div>
  );
}

function ProtocolBadge({
  name,
  icon,
  angle,
  radius,
  reverseAnim,
}: {
  name: string;
  icon: string;
  angle: number;
  radius: number;
  reverseAnim: string;
}) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  return (
    <div
      className="group absolute top-1/2 left-1/2 w-[44px] h-[44px] pointer-events-auto"
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
      }}
      title={name}
    >
      <div
        className="w-full h-full rounded-full overflow-hidden grid place-items-center transition-transform duration-200 group-hover:scale-110"
        style={{
          background: "var(--hy-panel-2)",
          border: "1px solid var(--hy-line-strong)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          animation: `${reverseAnim} 30s linear infinite`,
        }}
      >
        <img src={icon} alt={name} className="w-[32px] h-[32px] rounded-full object-cover" />
      </div>
      <div
        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          fontFamily: "var(--font-data)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--hy-ink)",
          background: "rgba(8,8,10,0.9)",
          border: "1px solid var(--hy-line-strong)",
        }}
      >
        {name}
      </div>
    </div>
  );
}

function SectionHead({ num, title, sub, id }: { num: string; title: React.ReactNode; sub: string; id?: string }) {
  return (
    <div id={id} className="max-w-[720px] mb-14">
      <div
        className="flex items-center gap-2.5 mb-3 text-[11px] uppercase tracking-[0.2em]"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
      >
        <span className="inline-block w-6 h-px" style={{ background: "var(--hy-blue)" }} />
        {num}
      </div>
      <h2
        className="font-medium leading-[1.05] tracking-[-0.02em] mb-5"
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4vw, 52px)", color: "var(--hy-ink)" }}
      >
        {title}
      </h2>
      <p className="text-[17px] leading-relaxed max-w-[600px]" style={{ color: "var(--hy-ink-2)" }}>
        {sub}
      </p>
    </div>
  );
}

function Problem() {
  return (
    <section id="problem" className="px-8 py-28" style={{ borderTop: "1px solid var(--hy-line)" }}>
      <div className="mx-auto max-w-[1280px] grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <SectionHead
            num="01 · The gap"
            title={
              <>
                LPs are frozen capital.{" "}
                <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--hy-cream)" }}>
                  Until they aren't.
                </em>
              </>
            }
            sub="A concentrated liquidity position earns trading fees — and does nothing else. The SOL and USDC inside are locked, un-stakable, un-lendable, un-borrowable. Every LP token on Solana today is a receipt for capital you can't compose with."
          />
        </div>
        <IdleViz />
      </div>
    </section>
  );
}

function IdleViz() {
  const bins = Array.from({ length: 32 }, (_, i) => i);
  return (
    <div
      className="relative p-8 rounded-2xl aspect-[4/3]"
      style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line)" }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.15em]"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
      >
        DLMM bins · SOL/USDC
      </div>
      <div className="flex gap-[3px] h-[140px] items-end my-5">
        {bins.map((i) => {
          const isActive = i === 16;
          const height = 20 + Math.abs(16 - i) < 10 ? 80 - Math.abs(16 - i) * 6 : 30 + ((i * 7) % 20);
          return (
            <div
              key={i}
              className="flex-1 rounded-t-[2px] relative"
              style={{
                height: `${height}%`,
                background: isActive
                  ? "linear-gradient(to top, var(--hy-blue), rgba(141,211,255,0.3))"
                  : "linear-gradient(to top, rgba(141,211,255,0.2), rgba(141,211,255,0.05))",
                border: isActive ? "1px solid var(--hy-blue)" : "1px solid rgba(141,211,255,0.15)",
              }}
            />
          );
        })}
      </div>
      <div
        className="text-[11px] leading-relaxed"
        style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-2)" }}
      >
        <span style={{ color: "var(--hy-warn)" }}>↓</span> Each bin holds assets. Only the active bin earns fees right
        now. The others just wait.
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Deposit",
      desc: "Provide SOL + USDC through HasYield. We place liquidity into Meteora DLMM bins across your chosen range.",
      visual: <MiniBins />,
    },
    {
      num: "02",
      title: "Rehypothecate",
      desc: "The SOL routes to Marinade (liquid staking). The USDC goes into money-market collateral. Your DLMM position keeps earning fees on top.",
      visual: <RoutingViz />,
    },
    {
      num: "03",
      title: "Stack yield",
      desc: "LP trading fees + staking yield + lending yield. Three streams on the same capital. hyLP token represents your share — composable anywhere.",
      visual: <StackViz />,
    },
  ];

  return (
    <section id="how" className="px-8 py-32" style={{ borderTop: "1px solid var(--hy-line)" }}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHead
          num="02 · The primitive"
          title={
            <>
              One deposit.{" "}
              <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--hy-cream)" }}>
                One composable receipt.
              </em>
            </>
          }
          sub="HasYield is a new primitive, not an optimizer. Deposit into a DLMM vault → we mint hyLP (Token-2022 with transfer-hook enforcement). While your position keeps earning LP fees, the underlying SOL stakes and the idle USDC enters a money market. hyLP is borrow-able, composable, and fully backed by the on-chain position."
        />
        <div className="grid md:grid-cols-3 mt-14">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="p-9 relative"
              style={{ borderLeft: i === 0 ? "none" : "1px solid var(--hy-line)" }}
            >
              <div
                className="mb-4 text-[12px] tracking-[0.15em]"
                style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
              >
                Step <span style={{ color: "var(--hy-blue)" }}>{s.num}</span>
              </div>
              <h3
                className="text-[22px] font-medium mb-3 tracking-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--hy-ink)" }}
              >
                {s.title}
              </h3>
              <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--hy-ink-2)" }}>
                {s.desc}
              </p>
              <div
                className="h-[120px] rounded-lg flex items-center justify-center relative overflow-hidden"
                style={{ background: "var(--hy-panel)", border: "1px solid var(--hy-line)" }}
              >
                {s.visual}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniBins() {
  return (
    <div className="flex gap-[2px] h-[70%] items-end px-5">
      {Array.from({ length: 28 }).map((_, i) => {
        const h = 15 + (Math.sin(i / 3) + 1) * 35 + (i % 3) * 4;
        return (
          <div
            key={i}
            style={{
              width: 6,
              height: `${h}px`,
              background: "linear-gradient(to top, var(--hy-blue), rgba(141,211,255,0.3))",
              borderRadius: 1,
            }}
          />
        );
      })}
    </div>
  );
}

function RoutingViz() {
  return (
    <div
      className="flex items-center gap-3 px-4"
      style={{ fontFamily: "var(--font-data)", fontSize: 10, color: "var(--hy-ink-2)" }}
    >
      <div
        className="px-2.5 py-1.5 rounded"
        style={{ border: "1px solid var(--hy-line-strong)", background: "var(--hy-panel-2)" }}
      >
        DLMM Bin
      </div>
      <span style={{ color: "var(--hy-blue)" }}>→</span>
      <div className="flex flex-col gap-1">
        <div
          className="px-2.5 py-1 rounded"
          style={{ border: "1px solid var(--hy-line-strong)", background: "var(--hy-panel-2)" }}
        >
          Marinade · SOL
        </div>
        <div
          className="px-2.5 py-1 rounded"
          style={{ border: "1px solid var(--hy-line-strong)", background: "var(--hy-panel-2)" }}
        >
          Lending · USDC
        </div>
      </div>
    </div>
  );
}

function StackViz() {
  const bars = [
    { name: "LP", pct: 70, val: "11.4%" },
    { name: "Stake", pct: 42, val: "6.8%" },
    { name: "Lend", pct: 28, val: "4.5%" },
  ];
  return (
    <div className="flex flex-col gap-1.5 w-[80%] px-5" style={{ fontFamily: "var(--font-data)" }}>
      {bars.map((b) => (
        <div key={b.name} className="flex items-center gap-2 text-[10px]" style={{ color: "var(--hy-ink-2)" }}>
          <span className="w-[40px]">{b.name}</span>
          <div
            className="flex-1 h-2 rounded-[2px] overflow-hidden"
            style={{ background: "var(--hy-panel-2)" }}
          >
            <div
              style={{
                width: `${b.pct}%`,
                height: "100%",
                background: "var(--hy-blue)",
              }}
            />
          </div>
          <span className="w-[38px] text-right" style={{ color: "var(--hy-ink)" }}>
            {b.val}
          </span>
        </div>
      ))}
    </div>
  );
}

function Features() {
  const feats = [
    {
      tag: "01 · The primitive",
      title: "hyLP: a live LP receipt",
      desc: "Deposit into a DLMM vault, receive hyLP — a Token-2022 vault share backed 1-for-1 by the underlying position. Unlike a static LP token, hyLP stays productive while it sits in your wallet.",
      bullets: ["Token-2022 mint", "Transfer-hook enforced lockup", "Backed by live on-chain position", "Redeemable anytime"],
    },
    {
      tag: "02 · Composability",
      title: "Borrow, stake, compose",
      desc: "Lock hyLP as collateral → borrow stablecoins at 50% LTV without unwinding your position. Underlying SOL stakes via Marinade. Underlying USDC enters a money market. Your LP fees keep flowing the whole time.",
      bullets: ["Borrow against hyLP at 50% LTV", "Meteora DLMM fees on the position", "Marinade staking on idle SOL", "Money-market yield on idle USDC"],
    },
    {
      tag: "03 · Solana-native",
      title: "Not possible on EVM",
      desc: "DLMM bins are a Solana primitive. Token-2022 transfer hooks enforce collateral lockup at the token layer — no custody wrapper needed.",
      bullets: ["Token-2022 hyLP", "Transfer hook enforcement", "Composable everywhere"],
    },
  ];

  return (
    <section id="features" className="px-8 py-32" style={{ borderTop: "1px solid var(--hy-line)" }}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHead
          num="03 · Why HasYield"
          title={
            <>
              Not possible{" "}
              <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--hy-cream)" }}>
                on EVM.
              </em>
            </>
          }
          sub="DLMM bins are a Solana-native primitive. Token-2022 transfer hooks enforce collateral lockup at the token layer — no custody wrapper, no escrow contract, no synthetic. HasYield is a composability layer: real CPI into Meteora and Marinade today, routing to more venues as the HasYield Keeper whitelists them."
        />
        <div
          className="grid md:grid-cols-3 rounded-2xl overflow-hidden mt-14"
          style={{ border: "1px solid var(--hy-line-strong)", background: "var(--hy-line)" }}
        >
          {feats.map((f) => (
            <div
              key={f.tag}
              className="p-10 flex flex-col gap-5 min-h-[340px]"
              style={{ background: "var(--hy-panel)" }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: "var(--font-data)", color: "var(--hy-blue)" }}
              >
                {f.tag}
              </div>
              <h3
                className="text-[24px] font-medium leading-tight tracking-tight m-0"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {f.title}
              </h3>
              <p className="text-[14px] leading-relaxed m-0" style={{ color: "var(--hy-ink-2)" }}>
                {f.desc}
              </p>
              <ul className="mt-auto flex flex-col gap-2 p-0 list-none" style={{ fontFamily: "var(--font-data)" }}>
                {f.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex gap-2.5 py-2 text-[12px]"
                    style={{ borderTop: "1px dashed var(--hy-line)", color: "var(--hy-ink-2)" }}
                  >
                    <span style={{ color: "var(--hy-blue)" }}>+</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section id="preview" className="px-8 py-32" style={{ borderTop: "1px solid var(--hy-line)" }}>
      <div className="mx-auto max-w-[1280px]">
        <SectionHead
          num="04 · The app"
          title={
            <>
              Your positions,{" "}
              <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--hy-cream)" }}>
                honestly rendered.
              </em>
            </>
          }
          sub="Everything on-chain. No simulated state, no hidden routing. What you see is what the vault did."
        />
        <div
          className="mt-12 p-4 rounded-2xl relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, var(--hy-panel-2), var(--hy-panel))",
            border: "1px solid var(--hy-line-strong)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top, rgba(141,211,255,0.08), transparent 60%)" }}
          />
          <div className="flex items-center gap-2 px-2 pb-3 relative z-10">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: "var(--hy-line-strong)" }}
              />
            ))}
            <span
              className="ml-3 px-3 py-1 rounded text-[11px]"
              style={{
                fontFamily: "var(--font-data)",
                color: "var(--hy-ink-3)",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              hasyield.xyz/dashboard
            </span>
          </div>
          <div
            className="relative z-10 rounded-lg overflow-hidden aspect-[16/9] grid place-items-center"
            style={{ background: "var(--hy-bg)", border: "1px solid var(--hy-line)" }}
          >
            <div className="text-center px-8">
              <div
                className="text-[10px] uppercase tracking-[0.25em] mb-3"
                style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
              >
                Devnet preview
              </div>
              <div
                className="text-[28px] font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--hy-ink)" }}
              >
                Dashboard coming soon
              </div>
              <p className="text-[14px] mt-3 max-w-[420px] mx-auto" style={{ color: "var(--hy-ink-2)" }}>
                Vault execution is live on devnet. Portfolio view ships in the next build.
              </p>
              <Link
                href="/vault"
                className="inline-block mt-6 px-5 py-2.5 text-[13px] font-medium rounded-md"
                style={{ background: "var(--hy-cream)", color: "#0a0a0a" }}
              >
                Try the vault →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section
      className="relative px-8 py-32 text-center"
      style={{ borderTop: "1px solid var(--hy-line)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 800px 400px at 50% 50%, rgba(141,211,255,0.06), transparent 60%)" }}
      />
      <div className="relative mx-auto max-w-[720px]">
        <h2
          className="font-medium leading-[1.0] tracking-[-0.04em] mb-5"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          Every position{" "}
          <em style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--hy-cream)" }}>
            has yield.
          </em>
        </h2>
        <p className="text-[18px] max-w-[520px] mx-auto mb-10" style={{ color: "var(--hy-ink-2)" }}>
          Built for Colosseum Frontier. Running on Solana devnet. Real CPI into Meteora DLMM, Marinade, and our lending
          market.
        </p>
        <Link
          href="/earn"
          className="inline-flex items-center gap-2 px-7 py-4 text-[16px] font-medium rounded-lg"
          style={{ background: "var(--hy-cream)", color: "#0a0a0a" }}
        >
          Browse Vaults <span>↗</span>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-8 pt-14 pb-10" style={{ borderTop: "1px solid var(--hy-line)" }}>
      <div className="mx-auto max-w-[1280px] flex justify-between items-start gap-10 flex-wrap">
        <div className="flex items-center gap-2.5 text-[14px]" style={{ color: "var(--hy-ink-2)" }}>
          <img src="/logo.png" alt="" className="w-6 h-6 rounded-full" />
          HasYield · Every position has yield
        </div>
        <div
          className="flex gap-7 text-[12px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}
        >
          <a href="https://github.com/HasYield-Protocol" target="_blank" className="hover:text-[var(--hy-ink)]">
            GitHub
          </a>
          <a href="#" className="hover:text-[var(--hy-ink)]">
            Docs
          </a>
          <a href="#" className="hover:text-[var(--hy-ink)]">
            Twitter
          </a>
        </div>
        <div className="text-[11px]" style={{ fontFamily: "var(--font-data)", color: "var(--hy-ink-3)" }}>
          Built for Colosseum Frontier · 2026
        </div>
      </div>
    </footer>
  );
}

function AmbientBackground() {
  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 900px 600px at 15% 0%, rgba(141,211,255,0.06), transparent 60%),
            radial-gradient(ellipse 800px 500px at 85% 15%, rgba(222,219,200,0.04), transparent 60%),
            radial-gradient(ellipse 1200px 700px at 50% 100%, rgba(141,211,255,0.03), transparent 70%)
          `,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/></filter><rect width='180' height='180' filter='url(%23n)'/></svg>")`,
        }}
      />
    </>
  );
}
