import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/components/wallet-provider";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "HasYield — The Yield Layer for Solana Vesting",
  description: "Locked tokens earn yield. Transfer Hook compliance on Solana. HasYield.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=Instrument+Serif:ital@1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-black">
        <WalletProvider>
          <TooltipProvider>
            <main className="flex-1">{children}</main>
            <Toaster theme="dark" richColors position="bottom-right" />
          </TooltipProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
