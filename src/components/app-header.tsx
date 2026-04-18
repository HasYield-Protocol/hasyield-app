"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/earn", label: "Earn" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-xl"
      style={{
        background: "rgba(8, 8, 10, 0.7)",
        borderBottom: "1px solid var(--hy-line)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          style={{ color: "var(--hy-ink)" }}
        >
          <img
            src="/logo.png"
            alt=""
            className="w-7 h-7 rounded-full"
            style={{ filter: "drop-shadow(0 2px 8px rgba(141, 211, 255, 0.2))" }}
          />
          <span
            className="font-medium text-[15px] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            HasYield
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-[13px] rounded-md transition-colors"
                style={{
                  color: active ? "var(--hy-ink)" : "var(--hy-ink-2)",
                  background: active ? "rgba(141, 211, 255, 0.08)" : "transparent",
                  borderBottom: active
                    ? "1px solid var(--hy-blue)"
                    : "1px solid transparent",
                  borderRadius: 6,
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="ml-3">
            <WalletMultiButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
