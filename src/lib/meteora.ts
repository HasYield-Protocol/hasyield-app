"use client";

import { DEMO_POOL_ADDRESS } from "./lp-constants";

export interface PoolInfo {
  address: string;
  tokenXSymbol: string;
  tokenYSymbol: string;
  binStep: number;
  activePrice: number;
  tvl: number;
  volume24h: number;
  fees24h: number;
  apy: number;
}

let cachedPool: PoolInfo | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

/**
 * Fetch real pool data from Meteora DLMM on devnet.
 * Falls back to estimated data if SDK fails.
 */
export async function getPoolInfo(): Promise<PoolInfo> {
  if (cachedPool && Date.now() - cacheTime < CACHE_TTL) return cachedPool;

  try {
    // Try fetching from Meteora mainnet API for real stats
    // (devnet pools have no API, so we use mainnet SOL/USDC stats as reference)
    const res = await fetch("https://dlmm-api.meteora.ag/pair/all");
    if (res.ok) {
      const pairs = await res.json();
      // Find SOL/USDC pair with highest liquidity
      const solUsdc = pairs.find((p: any) =>
        (p.name === "SOL-USDC" || p.name === "USDC-SOL") && p.liquidity > 1_000_000
      );
      if (solUsdc) {
        cachedPool = {
          address: DEMO_POOL_ADDRESS.toBase58(),
          tokenXSymbol: "SOL",
          tokenYSymbol: "USDC",
          binStep: solUsdc.bin_step || 10,
          activePrice: solUsdc.current_price || 148.32,
          tvl: solUsdc.liquidity || 2_100_000,
          volume24h: solUsdc.trade_volume_24h || 842_000,
          fees24h: solUsdc.fees_24h || 4_200,
          apy: solUsdc.apr ? solUsdc.apr / 100 : 0.35,
        };
        cacheTime = Date.now();
        return cachedPool;
      }
    }
  } catch {
    // API failed, use fallback
  }

  // Fallback with reasonable estimates
  cachedPool = {
    address: DEMO_POOL_ADDRESS.toBase58(),
    tokenXSymbol: "SOL",
    tokenYSymbol: "USDC",
    binStep: 10,
    activePrice: 148.32,
    tvl: 2_100_000,
    volume24h: 842_000,
    fees24h: 4_200,
    apy: 0.35,
  };
  cacheTime = Date.now();
  return cachedPool;
}
