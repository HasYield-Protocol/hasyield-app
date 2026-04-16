"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1a1a1a] backdrop-blur-xl bg-black/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
          <img src="/logo.png" alt="HasYield" className="w-7 h-7 rounded-full" />
          <span style={{ color: "#E1E0CC" }}>HasYield</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/vault" className="text-gray-400 hover:text-[#E1E0CC] transition">
            Vault
          </Link>
          <WalletMultiButton />
        </nav>
      </div>
    </header>
  );
}
