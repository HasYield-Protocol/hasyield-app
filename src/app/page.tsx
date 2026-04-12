"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { ArrowRight, ArrowDown, Check, Layers, TrendingUp, Shield, Unlock } from "lucide-react";
import Link from "next/link";
import { WordsPullUp, WordsPullUpMultiStyle } from "@/components/words-pull-up";
import { getMarinadeApy } from "@/lib/marinade-apy";

const NAV_ITEMS = ["Problem", "How", "Features", "Launch"];

export default function Home() {
  const [apy, setApy] = useState(0.05);
  useEffect(() => { getMarinadeApy().then(setApy); }, []);

  return (
    <div className="bg-black overflow-x-hidden">

      {/* ━━━ HERO ━━━ */}
      <section className="relative h-screen flex flex-col items-center justify-center p-4 md:p-6">
        <div className="absolute inset-0 bg-noise opacity-[0.06] pointer-events-none" />

        {/* Navbar — sticky */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50">
          <nav className="bg-black/90 backdrop-blur-xl rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8 flex items-center gap-3 sm:gap-6 md:gap-12 lg:gap-14">
            <Link href="/" className="shrink-0">
              <img src="/logo.png" alt="HasYield" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full" />
            </Link>
            {NAV_ITEMS.map((item) => (
              <Link key={item} href={item === "Launch" ? "/vault" : `#${item.toLowerCase()}`}
                className="text-[10px] sm:text-xs md:text-sm transition-colors whitespace-nowrap"
                style={{ color: "rgba(225,224,204,0.8)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#E1E0CC"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(225,224,204,0.8)"}
              >{item}</Link>
            ))}
          </nav>
        </div>

        {/* 3D Coin */}
        <div className="animate-coin mb-8">
          <img src="/logo.png" alt="HasYield" className="w-36 h-36 sm:w-48 sm:h-48 rounded-full" style={{ boxShadow: "0 0 80px rgba(222,219,200,0.15)" }} />
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-[-0.04em]" style={{ color: "#E1E0CC" }}>HasYield</h1>
        <p className="mt-3 text-base sm:text-lg text-gray-400 text-center max-w-lg">
          Every position has yield. Now unlock it.
        </p>
        <motion.p className="mt-2 text-xs text-gray-600 max-w-md text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          Concentrated liquidity bin rehypothecation. Your DLMM bins earn trading fees while the underlying assets earn staking + lending yield. Triple yield, same capital.
        </motion.p>
        <motion.div className="mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Link href="#problem" className="group inline-flex items-center gap-2 hover:gap-3 transition-all bg-[#DEDBC8] rounded-full pl-5 pr-1.5 py-1.5">
            <span className="text-black font-medium text-sm">See how it works</span>
            <span className="bg-black rounded-full w-9 h-9 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowDown className="w-4 h-4" style={{ color: "#E1E0CC" }} />
            </span>
          </Link>
        </motion.div>
      </section>

      {/* ━━━ PROBLEM ━━━ */}
      <AboutSection />

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section id="how" className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-20">
        <div className="absolute inset-0 bg-noise opacity-[0.06] pointer-events-none" />
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#DEDBC8" }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              The Flywheel
            </motion.p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium leading-tight" style={{ color: "#E1E0CC" }}>
              <WordsPullUp text="Three steps. One flywheel." />
            </h2>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {[
              { num: "01", title: "Deposit into DLMM", desc: "Provide SOL + USDC to Meteora DLMM bins through HasYield. Your bins earn concentrated trading fees.", icon: <Layers className="w-5 h-5" /> },
              { num: "02", title: "Rehypothecate", desc: "HasYield routes the SOL to liquid staking (Marinade) and the USDC to lending markets. Your bins still earn fees — now the underlying earns too.", icon: <TrendingUp className="w-5 h-5" /> },
              { num: "03", title: "Stack Yield", desc: "Trading fees + staking yield + lending yield. Three streams on the same capital. Withdraw anytime.", icon: <Unlock className="w-5 h-5" /> },
            ].map((step, i) => (
              <motion.div key={step.num} className="flex items-start gap-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-6 py-5"
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15 }}>
                <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0" style={{ color: "#DEDBC8" }}>{step.icon}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-500 tabular-nums">{step.num}</span>
                    <h3 className="text-sm font-medium" style={{ color: "#E1E0CC" }}>{step.title}</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Flywheel visual */}
          <motion.div className="mt-12 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}>
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 flex-wrap justify-center">
              <span className="px-3 py-1 rounded-full border border-[#1a1a1a]">LP Fees</span>
              <span>+</span>
              <span className="px-3 py-1 rounded-full border border-[#1a1a1a]">SOL Staking</span>
              <span>+</span>
              <span className="px-3 py-1 rounded-full border border-[#1a1a1a]">USDC Lending</span>
              <span>=</span>
              <span className="px-3 py-1 rounded-full border border-[#DEDBC8]/30" style={{ color: "#DEDBC8" }}>Triple Yield</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ━━━ FEATURES ━━━ */}
      <FeaturesSection />

      {/* ━━━ STATS ━━━ */}
      <section className="relative py-20 px-4 sm:px-6">
        <div className="absolute inset-0 bg-noise opacity-[0.06] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            {[
              { value: `${((apy + 0.072 * 0.5 + 0.12 * 0.5) * 100).toFixed(0)}%`, label: "Effective APY", sub: "triple yield stacked" },
              { value: "3", label: "Yield streams", sub: "LP + staking + lending" },
              { value: "0", label: "Competitors", sub: "bin rehypothecation" },
              { value: "hyLP", label: "Composable token", sub: "Token-2022" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-bold text-gradient-cream">{s.value}</p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">{s.label}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ━━━ CTA ━━━ */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6">
        <div className="absolute inset-0 bg-noise opacity-[0.06] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium leading-[0.95] mb-8" style={{ color: "#E1E0CC" }}>
            <WordsPullUpMultiStyle segments={[
              { text: "Every position", className: "font-normal" },
              { text: "has yield.", className: "font-serif italic" },
            ]} />
          </h2>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <Link href="/vault" className="group inline-flex items-center gap-2 hover:gap-3 transition-all bg-[#DEDBC8] rounded-full pl-6 pr-2 py-2">
              <span className="text-black font-medium">Launch App</span>
              <span className="bg-black rounded-full w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight className="w-4 h-4" style={{ color: "#E1E0CC" }} />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ━━━ COMING SOON ━━━ */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 border-t border-[#1a1a1a]">
        <div className="absolute inset-0 bg-noise opacity-[0.06] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#DEDBC8" }}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              Roadmap
            </motion.p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium" style={{ color: "#E1E0CC" }}>
              <WordsPullUp text="What's coming next." />
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                badge: "Coming Soon",
                title: "Yield Trading (PT/YT)",
                desc: "Split hyLP into Principal Token + Yield Token. Trade future yield streams. Fixed-rate positions. Like Pendle, but for DLMM bins.",
                Icon: TrendingUp,
              },
              {
                badge: "Coming Soon",
                title: "AI Auto-Rebalancer",
                desc: "AI agent continuously monitors yield rates across staking and lending protocols. Auto-rebalances to the highest yield after fees.",
                Icon: Layers,
              },
              {
                badge: "Coming Soon",
                title: "Multi-Chain (EVM)",
                desc: "Uniswap V3 positions have the same composability gap. HasYield for EVM — same rehypothecation, different chain.",
                Icon: Shield,
              },
            ].map((item, i) => (
              <motion.div key={item.title}
                className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-[#DEDBC8]/10 border border-[#DEDBC8]/20" style={{ color: "#DEDBC8" }}>
                    {item.badge}
                  </span>
                </div>
                <item.Icon className="w-6 h-6" style={{ color: "#DEDBC8" }} />
                <h3 className="text-sm font-medium mt-3 mb-2" style={{ color: "#E1E0CC" }}>{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 text-center border-t border-[#1a1a1a]">
        <p className="text-xs" style={{ color: "rgba(225,224,204,0.4)" }}>HasYield — Every position has yield</p>
        <p className="text-[10px] text-gray-700 mt-1">Built for Colosseum Frontier</p>
      </footer>
    </div>
  );
}

/* ═══ ABOUT ═══ */
function AboutSection() {
  const textRef = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: textRef as React.RefObject<HTMLElement>, offset: ["start 0.8", "end 0.2"] });
  const bodyText = "Meteora DLMM bins are on-chain limit orders that earn trading fees. But the SOL and USDC inside those bins sit idle. HasYield rehypothecates them — your bins earn fees while the underlying assets earn staking and lending yield. Triple yield on the same capital.";

  return (
    <section id="problem" className="bg-black py-20 sm:py-32 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="bg-[#101010] rounded-2xl md:rounded-3xl p-8 sm:p-12 md:p-20 text-center">
          <motion.p className="text-[10px] sm:text-xs tracking-[0.2em] uppercase mb-8" style={{ color: "#DEDBC8" }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            The Problem
          </motion.p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-4xl mx-auto leading-[0.95] sm:leading-[0.9]" style={{ color: "#E1E0CC" }}>
            <WordsPullUpMultiStyle segments={[
              { text: "Your DLMM bins earn fees.", className: "font-normal" },
              { text: "But the capital inside?", className: "font-serif italic" },
              { text: "Idle.", className: "font-normal" },
            ]} />
          </h2>
          <p ref={textRef} className="mt-12 sm:mt-16 text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: "#DEDBC8", wordBreak: "break-word", overflowWrap: "break-word" }}>
            {bodyText.split(" ").map((word, wi) => (
              <span key={wi} className="inline">
                {word.split("").map((char, ci) => {
                  const globalIndex = bodyText.indexOf(word, bodyText.split(" ").slice(0, wi).join(" ").length) + ci;
                  return <AnimChar key={`${wi}-${ci}`} char={char} index={globalIndex} total={bodyText.length} progress={scrollYProgress} />;
                })}
                {wi < bodyText.split(" ").length - 1 && <AnimChar char=" " index={0} total={bodyText.length} progress={scrollYProgress} />}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

function AnimChar({ char, index, total, progress }: { char: string; index: number; total: number; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const p = index / total;
  const opacity = useTransform(progress, [p - 0.1, p + 0.05], [0.2, 1]);
  return <motion.span style={{ opacity }}>{char === " " ? "\u00A0" : char}</motion.span>;
}

/* ═══ FEATURES ═══ */
const features = [
  { icon: <Layers className="w-5 h-5" />, num: "01", title: "DLMM Bin Rehypothecation", items: ["Deposit into Meteora DLMM bins", "SOL routed to Marinade staking", "USDC routed to lending markets", "Bins still earn trading fees"] },
  { icon: <TrendingUp className="w-5 h-5" />, num: "02", title: "Triple Yield Stacking", items: ["LP trading fees (30-60% APY)", "SOL staking yield (~7% APY)", "USDC lending yield (~12% APY)", "Combined: up to 79% effective APY"] },
  { icon: <Shield className="w-5 h-5" />, num: "03", title: "Solana-Native Architecture", items: ["Token-2022 hyLP position tokens", "Transfer Hook collateral enforcement", "Composable across Solana DeFi", "Impossible on EVM — bins are Solana-only"] },
];

function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative bg-black py-20 sm:py-32 px-4 sm:px-6">
      <div className="absolute inset-0 bg-noise opacity-[0.15] pointer-events-none" />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal" style={{ color: "#E1E0CC" }}>
            <WordsPullUpMultiStyle segments={[{ text: "Concentrated liquidity bin rehypothecation.", className: "" }]} />
          </h2>
          <p className="mt-3 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal text-gray-500">
            <WordsPullUpMultiStyle segments={[{ text: "Built on Meteora DLMM. Powered by Solana.", className: "text-gray-500" }]} />
          </p>
        </div>
        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {features.map((f, i) => (
            <motion.div key={f.num} className="bg-[#212121] rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
              initial={{ opacity: 0, scale: 0.95 }} animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}>
              <div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#2a2a2a] flex items-center justify-center mb-4" style={{ color: "#DEDBC8" }}>{f.icon}</div>
                <h3 className="text-sm sm:text-base font-medium mb-1" style={{ color: "#E1E0CC" }}>{f.title}</h3>
                <p className="text-[10px] text-gray-500 mb-4">{f.num}</p>
                <ul className="space-y-2">
                  {f.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-gray-400">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#DEDBC8" }} /><span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/vault" className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Launch App <ArrowRight className="w-3 h-3 -rotate-45" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
