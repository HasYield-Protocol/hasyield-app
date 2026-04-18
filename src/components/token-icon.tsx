"use client";

import { useState } from "react";

type Props = { symbol: string; size?: number; className?: string };

const LOGOS: Record<string, string> = {
  SOL: "/tokens/sol.png",
  USDC: "/tokens/usdc.png",
  USDT: "/tokens/usdt.svg",
  MSOL: "/tokens/msol.png",
  JITOSOL: "/tokens/jitosol.png",
  BONK: "/tokens/bonk.png",
  PYUSD: "/tokens/pyusd.png",
  ETH: "/tokens/eth.png",
  WBTC: "/tokens/wbtc.png",
  BTC: "/tokens/wbtc.png",
  HYLP: "/logo.png",
};

const FALLBACK_PALETTE: Record<string, { bg: string; fg: string }> = {
  HYLP: { bg: "linear-gradient(135deg, #DEDBC8, #8dd3ff)", fg: "#0a0a0a" },
  default: { bg: "linear-gradient(135deg, #2a2a30, #18181d)", fg: "#ECE8D8" },
};

export function TokenIcon({ symbol, size = 24, className = "" }: Props) {
  const key = symbol.toUpperCase();
  const src = LOGOS[key];
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={symbol}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={`rounded-full shrink-0 object-cover ${className}`}
        style={{
          width: size,
          height: size,
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
          background: "#0d0d10",
        }}
      />
    );
  }

  const p = FALLBACK_PALETTE[key] ?? FALLBACK_PALETTE.default;
  const label = key === "HYLP" ? "hy" : key.slice(0, 3);
  return (
    <div
      className={`inline-grid place-items-center rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: p.bg,
        color: p.fg,
        fontFamily: "var(--font-display)",
        fontSize: size * 0.34,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
      }}
    >
      {label}
    </div>
  );
}

export function TokenPair({ a, b, size = 24 }: { a: string; b: string; size?: number }) {
  return (
    <div className="inline-flex items-center" style={{ width: size + size * 0.55 }}>
      <TokenIcon symbol={a} size={size} />
      <TokenIcon symbol={b} size={size} className="-ml-2 ring-2 ring-[var(--hy-bg)]" />
    </div>
  );
}
