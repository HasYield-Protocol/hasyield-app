# HasYield App

## What This Is

Frontend for HasYield — concentrated liquidity bin rehypothecation on Solana. Deposit SOL+USDC, earn triple yield (LP fees + staking + lending), borrow against LP positions.

**Hackathon:** Colosseum Solana Frontier (Apr 6 — May 11, 2026)
**Track:** DeFi
**Org:** https://github.com/HasYield-Protocol
**Programs repo:** https://github.com/HasYield-Protocol/hasyield-programs

@AGENTS.md

## Tech Stack

- Next.js 16 (App Router)
- Tailwind CSS + Motion (framer-motion)
- @solana/wallet-adapter (Phantom, Solflare)
- shadcn/ui components

## Program IDs (Devnet)

- LP Vault: `BH6rAqBajhmzjVPoSqyvuyhCphGVWfKGAD7wXwJU9Y7T`
- Lending Pool: `J9cqrTyPAajYNUp5ayDQBso7mMAwyatNg7VMpx8wbzwf`
- Transfer Hook: `EupPmtNiCUWcPGh4ekjLUVhf5PqZWV8BN5zE7426n9vM`
- DLMM Pool: `EUcPNLCoVFb4YTM87m4Kudv3PAG71k5wGxy2Pug5YknE`
- hyLP Mint: `EBdngGBEcYFe4dD7Jtk2nPLqwhmC7ud3tkYTdkHFJTRJ`

## Pages

- `/` — Cinematic landing page with scroll-driven triple yield narrative
- `/vault` — Vault dashboard: deposit, DLMM bin chart, AI yield optimizer, borrow/repay

## What's Working

- Landing page with pool selector (SOL/USDC active, 3 coming soon)
- Vault dashboard with simulated deposit/borrow state
- Meteora API integration for real pool stats
- Marinade APY fetcher
- AI yield optimizer (auto-selects best staking/lending protocol)

## What's TODO

1. Wire vault page to real on-chain deposit (currently falls back to simulated state)
2. Wire real Meteora DLMM SDK for pool data (currently uses mainnet API as reference)
3. Connect borrow/repay to lending pool program

## Commands

```bash
npm install
PORT=3300 npm run dev
```

Open http://localhost:3300
