# HasYield App

Frontend for [HasYield](https://github.com/HasYield-Protocol/hasyield-programs) — the first LP position composability layer on Solana.

Deposit SOL + USDC into concentrated liquidity bins, earn triple yield (LP fees + staking + lending), and borrow against your LP position.

## Features

- **Vault Dashboard** — Deposit liquidity, view DLMM bin distribution, track triple yield breakdown
- **AI Yield Optimizer** — Auto-routes SOL to highest staking yield, USDC to highest lending rate
- **Pool Selector** — SOL/USDC active, more pairs coming soon
- **Real-time Stats** — Meteora pool data (TVL, volume, fees, APY)
- **Cinematic Landing** — Scroll-driven narrative explaining the triple yield flywheel

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS |
| Animation | Motion (framer-motion) |
| Wallet | @solana/wallet-adapter (Phantom, Solflare) |
| Data | Meteora API, Marinade APY, on-chain reads |

## Getting Started

```bash
npm install
PORT=3300 npm run dev
```

Open [http://localhost:3300](http://localhost:3300).

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_RPC_URL=<your-helius-devnet-url>
```

## Structure

```
src/
├── app/
│   ├── page.tsx          # Landing page — cinematic scroll narrative
│   ├── vault/page.tsx    # Vault dashboard — deposit, yield, borrow
│   └── layout.tsx        # Root layout with wallet provider
├── components/
│   ├── app-header.tsx    # Navigation bar
│   ├── wallet-provider.tsx
│   ├── words-pull-up.tsx # Text animation component
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── lp-constants.ts  # Program IDs, pool config, wallet addresses
│   ├── meteora.ts       # Meteora API integration
│   ├── marinade-apy.ts  # Marinade staking APY fetch
│   └── utils.ts
└── hooks/
```

## Programs

See [hasyield-programs](https://github.com/HasYield-Protocol/hasyield-programs) for the Anchor smart contracts.

## Hackathon

**Colosseum Solana Frontier** (Apr 6 — May 11, 2026) | Track: DeFi

## License

MIT
