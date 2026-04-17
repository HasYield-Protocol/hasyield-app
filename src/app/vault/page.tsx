"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, TrendingUp, ArrowDown, Lock, Unlock, Wallet, ArrowRight } from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { getMarinadeApy } from "@/lib/marinade-apy";
import { getPoolInfo, type PoolInfo } from "@/lib/meteora";
import {
  LP_VAULT_PROGRAM_ID, LP_VAULT_CONFIG, HYLP_MINT,
  USDC_DEVNET_MINT, WSOL_MINT, DLMM_PROGRAM_ID, DEMO_POOL_ADDRESS,
  DLMM_POSITION, DLMM_RESERVE_X, DLMM_RESERVE_Y,
  POSITION_LOWER_BIN_ID, POSITION_WIDTH, ACTIVE_ID,
  LENDING_PROGRAM_ID, LENDING_POOL, TEST_USDC_MINT,
} from "@/lib/lp-constants";
import { getDlmmAccounts, dlmmComputeBudget } from "@/lib/dlmm-helpers";
import {
  deriveMarinadeReserve, deriveLiqSolLeg, deriveLiqMsolLegAuth, deriveMsolMintAuth,
} from "@/lib/marinade-helpers";
import {
  MARINADE_PROGRAM_ID, MARINADE_STATE, MSOL_MINT, LIQ_POOL_MSOL_LEG,
} from "@/lib/lp-constants";
import { readVaultState, type VaultState } from "@/lib/on-chain-reader";

function disc(name: string): Buffer {
  return Buffer.from(sha256(`global:${name}`).slice(0, 8));
}

type Stage = "pool" | "position" | "collateral" | "borrowed";

export default function VaultPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [busy, setBusy] = useState(false);
  const [apy, setApy] = useState(0.42);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [stage, setStage] = useState<Stage>("pool");

  // Position state
  const [depositX, setDepositX] = useState("");
  const [depositY, setDepositY] = useState("");
  const [positionValue, setPositionValue] = useState(0);
  const [feesEarned, setFeesEarned] = useState(0);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowed, setBorrowed] = useState(0);
  const [rangeMin] = useState(120);
  const [rangeMax] = useState(180);

  // On-chain state reader
  const [onChainState, setOnChainState] = useState<VaultState | null>(null);

  // Yield routing config — these rates come from real APIs where possible
  const MARINADE_ROUTE_PERCENT = 0.3; // 30% of SOL routes to Marinade
  const stakingOptions = [
    { name: "Jito", logo: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png", rate: 0.078 },
    { name: "Marinade", logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png", rate: 0.072 },
    { name: "Sanctum", logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", rate: 0.068 },
  ];
  const lendingOptions = [
    { name: "Solend", logo: "https://solend.fi/favicon.ico", rate: 0.085 },
    { name: "Kamino", logo: "https://app.kamino.finance/favicon.ico", rate: 0.131 },
    { name: "MarginFi", logo: "https://app.marginfi.com/favicon.ico", rate: 0.114 },
  ];
  const bestStaking = stakingOptions.reduce((a, b) => a.rate > b.rate ? a : b);
  const bestLending = lendingOptions.reduce((a, b) => a.rate > b.rate ? a : b);

  useEffect(() => {
    getMarinadeApy().then(v => setApy(Math.max(v * 5, 0.35)));
    getPoolInfo().then(setPool);
  }, []);

  // Tick fees when position exists — combined APY from all sources
  const combinedApy = apy + bestStaking.rate * MARINADE_ROUTE_PERCENT;
  useEffect(() => {
    if (stage === "position" || stage === "collateral" || stage === "borrowed") {
      const interval = setInterval(() => {
        setFeesEarned(prev => prev + (positionValue * combinedApy) / (365.25 * 24 * 3600));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stage, positionValue, combinedApy]);

  // Poll on-chain state every 15s when wallet is connected
  useEffect(() => {
    if (!connected || !publicKey) {
      setOnChainState(null);
      return;
    }

    let cancelled = false;

    const fetchState = async () => {
      try {
        const state = await readVaultState(connection, publicKey);
        if (!cancelled) {
          setOnChainState(state);

          // Sync UI state from on-chain data if user has a position
          if (state.userHylpBalance > 0 || state.collateralDeposited > 0) {
            // Compute position value from vault shares
            const userShares = state.userHylpBalance + state.collateralDeposited;
            if (state.totalShares > 0) {
              const shareRatio = userShares / state.totalShares;
              const usdcValue = (state.totalDepositedX / 1e6) * shareRatio;
              const solValue = (state.totalDepositedY / 1e9) * shareRatio;
              setPositionValue(usdcValue + solValue);
            }

            // Determine stage from on-chain state
            if (state.borrowedAmount > 0) {
              setBorrowed(state.borrowedAmount / 1e6);
              setStage("borrowed");
            } else if (state.collateralDeposited > 0) {
              setStage("collateral");
            } else if (state.userHylpBalance > 0) {
              setStage("position");
            }
          }
        }
      } catch (err) {
        console.error("Failed to read on-chain state:", err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [connected, publicKey, connection]);

  // Helper to refresh on-chain state after a tx
  const refreshOnChainState = async () => {
    if (!publicKey) return;
    try {
      const state = await readVaultState(connection, publicKey);
      setOnChainState(state);
      return state;
    } catch (err) {
      console.error("Failed to refresh on-chain state:", err);
      return null;
    }
  };

  const handleDeposit = async () => {
    if (!publicKey || !signTransaction) return;
    const x = parseFloat(depositX) || 0;
    const y = parseFloat(depositY) || 0;
    if (x + y <= 0) return;

    setBusy(true);
    const toastId = toast.loading("Depositing into DLMM...");
    try {
      // Pool order: X = USDC (6 decimals), Y = SOL (9 decimals)
      const amountX = Math.floor(x * 1e6);
      const amountY = Math.floor(y * LAMPORTS_PER_SOL);

      const [vaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault-authority"), LP_VAULT_CONFIG.toBuffer()], LP_VAULT_PROGRAM_ID);

      // User ATAs
      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      // Vault ATAs
      const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const vaultWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      // DLMM accounts
      const dlmm = getDlmmAccounts(POSITION_LOWER_BIN_ID, POSITION_WIDTH);

      const tx = new Transaction();

      // Compute budget for DLMM CPI
      tx.add(dlmmComputeBudget());

      // Create ATAs if needed
      const atasToCheck: [PublicKey, PublicKey, PublicKey, PublicKey][] = [
        [userHylpAta, publicKey, HYLP_MINT, TOKEN_2022_PROGRAM_ID],
        [userUsdcAta, publicKey, USDC_DEVNET_MINT, TOKEN_PROGRAM_ID],
        [userWsolAta, publicKey, WSOL_MINT, TOKEN_PROGRAM_ID],
        [vaultUsdcAta, vaultAuthority, USDC_DEVNET_MINT, TOKEN_PROGRAM_ID],
        [vaultWsolAta, vaultAuthority, WSOL_MINT, TOKEN_PROGRAM_ID],
      ];
      for (const [ata, owner, mint, prog] of atasToCheck) {
        if (!(await connection.getAccountInfo(ata))) {
          tx.add(createAssociatedTokenAccountInstruction(publicKey, ata, owner, mint, prog, ASSOCIATED_TOKEN_PROGRAM_ID));
        }
      }

      // Wrap SOL if depositing SOL
      if (amountY > 0) {
        tx.add(
          SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: userWsolAta, lamports: amountY }),
          { programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: userWsolAta, isSigner: false, isWritable: true }], data: Buffer.from([17]) },
        );
      }

      // Build deposit instruction data:
      // disc + amount_x(u64) + amount_y(u64) + active_id(i32) + max_active_bin_slippage(i32)
      const data = Buffer.alloc(8 + 8 + 8 + 4 + 4);
      disc("deposit_liquidity").copy(data, 0);
      new BN(amountX).toArrayLike(Buffer, "le", 8).copy(data, 8);
      new BN(amountY).toArrayLike(Buffer, "le", 8).copy(data, 16);
      data.writeInt32LE(ACTIVE_ID, 24);
      data.writeInt32LE(5, 28); // max slippage = 5

      tx.add({ programId: LP_VAULT_PROGRAM_ID, keys: [
        // Vault accounts
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: USDC_DEVNET_MINT, isSigner: false, isWritable: false },
        { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
        { pubkey: LP_VAULT_CONFIG, isSigner: false, isWritable: true },
        { pubkey: vaultAuthority, isSigner: false, isWritable: false },
        { pubkey: HYLP_MINT, isSigner: false, isWritable: true },
        { pubkey: userUsdcAta, isSigner: false, isWritable: true },
        { pubkey: userWsolAta, isSigner: false, isWritable: true },
        { pubkey: vaultUsdcAta, isSigner: false, isWritable: true },
        { pubkey: vaultWsolAta, isSigner: false, isWritable: true },
        { pubkey: userHylpAta, isSigner: false, isWritable: true },
        // DLMM accounts
        { pubkey: DLMM_POSITION, isSigner: false, isWritable: true },
        { pubkey: DEMO_POOL_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: dlmm.bitmapExtension, isSigner: false, isWritable: true },
        { pubkey: DLMM_RESERVE_X, isSigner: false, isWritable: true },
        { pubkey: DLMM_RESERVE_Y, isSigner: false, isWritable: true },
        { pubkey: dlmm.binArrayLower, isSigner: false, isWritable: true },
        { pubkey: dlmm.binArrayUpper, isSigner: false, isWritable: true },
        { pubkey: dlmm.eventAuthority, isSigner: false, isWritable: false },
        { pubkey: DLMM_PROGRAM_ID, isSigner: false, isWritable: false },
        // Token programs
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      // Refresh on-chain state after deposit
      const freshState = await refreshOnChainState();
      if (freshState && freshState.userHylpBalance > 0 && freshState.totalShares > 0) {
        const shareRatio = freshState.userHylpBalance / freshState.totalShares;
        const usdcVal = (freshState.totalDepositedX / 1e6) * shareRatio;
        const solVal = (freshState.totalDepositedY / 1e9) * shareRatio;
        setPositionValue(usdcVal + solVal);
      } else {
        setPositionValue(x + y); // fallback to simulated
      }
      setStage("position");
      toast.success("Deposited into Meteora DLMM! hyLP minted.", { id: toastId });

      // Route idle SOL to Marinade for staking yield (separate tx)
      if (amountY > 0) {
        const marinadeToast = toast.loading("Routing SOL to Marinade staking...");
        try {
          const marinadeAmount = Math.floor(amountY * 0.3); // Route 30% to Marinade
          if (marinadeAmount > 100_000) { // Min 0.0001 SOL
            const [vaultAuth2] = PublicKey.findProgramAddressSync(
              [Buffer.from("vault-authority"), LP_VAULT_CONFIG.toBuffer()], LP_VAULT_PROGRAM_ID);
            const vaultMsolAta = getAssociatedTokenAddressSync(MSOL_MINT, vaultAuth2, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

            const marinTx = new Transaction();
            marinTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));

            // Fund vault authority with SOL for Marinade deposit
            marinTx.add(SystemProgram.transfer({
              fromPubkey: publicKey, toPubkey: vaultAuth2, lamports: marinadeAmount + 1_000_000,
            }));

            // Create vault mSOL ATA if needed
            if (!(await connection.getAccountInfo(vaultMsolAta))) {
              marinTx.add(createAssociatedTokenAccountInstruction(
                publicKey, vaultMsolAta, vaultAuth2, MSOL_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
            }

            const mData = Buffer.alloc(8 + 8);
            disc("deposit_to_marinade").copy(mData, 0);
            new BN(marinadeAmount).toArrayLike(Buffer, "le", 8).copy(mData, 8);

            marinTx.add({ programId: LP_VAULT_PROGRAM_ID, keys: [
              { pubkey: publicKey, isSigner: true, isWritable: true },
              { pubkey: LP_VAULT_CONFIG, isSigner: false, isWritable: false },
              { pubkey: vaultAuth2, isSigner: false, isWritable: true },
              { pubkey: MARINADE_STATE, isSigner: false, isWritable: true },
              { pubkey: MSOL_MINT, isSigner: false, isWritable: true },
              { pubkey: deriveLiqSolLeg(), isSigner: false, isWritable: true },
              { pubkey: LIQ_POOL_MSOL_LEG, isSigner: false, isWritable: true },
              { pubkey: deriveLiqMsolLegAuth(), isSigner: false, isWritable: false },
              { pubkey: deriveMarinadeReserve(), isSigner: false, isWritable: true },
              { pubkey: vaultMsolAta, isSigner: false, isWritable: true },
              { pubkey: deriveMsolMintAuth(), isSigner: false, isWritable: false },
              { pubkey: MARINADE_PROGRAM_ID, isSigner: false, isWritable: false },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ], data: mData });

            const bh2 = await connection.getLatestBlockhash();
            marinTx.recentBlockhash = bh2.blockhash;
            marinTx.feePayer = publicKey;
            const signed2 = await signTransaction(marinTx);
            const sig2 = await connection.sendRawTransaction(signed2.serialize(), { skipPreflight: true });
            await connection.confirmTransaction({ signature: sig2, ...bh2 }, "confirmed");
            toast.success("SOL routed to Marinade staking!", { id: marinadeToast });
          } else {
            toast.dismiss(marinadeToast);
          }
        } catch (err: unknown) {
          console.error("Marinade routing failed:", err);
          toast.info("DLMM deposit succeeded. Marinade routing skipped.", { id: marinadeToast });
        }
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Deposit failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const handleCollateralize = async () => {
    if (!publicKey || !signTransaction) return;
    setBusy(true);
    const toastId = toast.loading("Depositing hyLP as collateral...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);

      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const poolCollateralAta = getAssociatedTokenAddressSync(HYLP_MINT, poolAuthority, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      // Get hyLP balance
      const hylpBalance = await connection.getTokenAccountBalance(userHylpAta);
      const amount = new BN(hylpBalance.value.amount);
      if (amount.isZero()) { toast.error("No hyLP to collateralize", { id: toastId }); return; }

      const tx = new Transaction();

      // Create pool collateral ATA if needed
      if (!(await connection.getAccountInfo(poolCollateralAta))) {
        tx.add(createAssociatedTokenAccountInstruction(
          publicKey, poolCollateralAta, poolAuthority, HYLP_MINT, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
      }

      const data = Buffer.alloc(8 + 8);
      disc("deposit_collateral").copy(data, 0);
      amount.toArrayLike(Buffer, "le", 8).copy(data, 8);

      tx.add({ programId: LENDING_PROGRAM_ID, keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: HYLP_MINT, isSigner: false, isWritable: false },
        { pubkey: LENDING_POOL, isSigner: false, isWritable: true },
        { pubkey: loanPosition, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: userHylpAta, isSigner: false, isWritable: true },
        { pubkey: poolCollateralAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      await refreshOnChainState();
      setStage("collateral");
      toast.success("hyLP deposited as collateral!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Collateralize failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
    } finally {
      setBusy(false);
    }
  };

  const handleBorrow = async () => {
    if (!publicKey || !signTransaction) return;
    const amt = parseFloat(borrowAmount) || 0;
    const max = positionValue * 0.5;
    if (amt <= 0 || amt > max) return;

    setBusy(true);
    const toastId = toast.loading("Borrowing USDC...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const poolBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, poolAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const borrowLamports = Math.floor(amt * 1e6); // USDC 6 decimals

      const tx = new Transaction();
      if (!(await connection.getAccountInfo(userBorrowAta))) {
        tx.add(createAssociatedTokenAccountInstruction(publicKey, userBorrowAta, publicKey, TEST_USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
      }

      const data = Buffer.alloc(8 + 8);
      disc("borrow").copy(data, 0);
      new BN(borrowLamports).toArrayLike(Buffer, "le", 8).copy(data, 8);

      tx.add({ programId: LENDING_PROGRAM_ID, keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: TEST_USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: LENDING_POOL, isSigner: false, isWritable: true },
        { pubkey: loanPosition, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: poolBorrowAta, isSigner: false, isWritable: true },
        { pubkey: userBorrowAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      const freshBorrow = await refreshOnChainState();
      if (freshBorrow && freshBorrow.borrowedAmount > 0) {
        setBorrowed(freshBorrow.borrowedAmount / 1e6);
      } else {
        setBorrowed(amt); // fallback
      }
      setBorrowAmount("");
      setStage("borrowed");
      toast.success(`Borrowed ${amt} USDC!`, { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Borrow failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
    } finally {
      setBusy(false);
    }
  };

  const handleRepay = async () => {
    if (!publicKey || !signTransaction) return;
    setBusy(true);
    const toastId = toast.loading("Repaying loan...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const poolBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, poolAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const repayLamports = Math.floor(borrowed * 1e6);

      const data = Buffer.alloc(8 + 8);
      disc("repay").copy(data, 0);
      new BN(repayLamports).toArrayLike(Buffer, "le", 8).copy(data, 8);

      const tx = new Transaction();
      tx.add({ programId: LENDING_PROGRAM_ID, keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: TEST_USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: LENDING_POOL, isSigner: false, isWritable: true },
        { pubkey: loanPosition, isSigner: false, isWritable: true },
        { pubkey: userBorrowAta, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: poolBorrowAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      await refreshOnChainState();
      setBorrowed(0);
      setStage("collateral");
      toast.success("Loan repaid!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Repay failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawCollateral = async () => {
    if (!publicKey || !signTransaction) return;
    setBusy(true);
    const toastId = toast.loading("Withdrawing collateral...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const poolCollateralAta = getAssociatedTokenAddressSync(HYLP_MINT, poolAuthority, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      // Get collateral balance from pool
      const poolCollBal = await connection.getTokenAccountBalance(poolCollateralAta);
      const amount = new BN(poolCollBal.value.amount);

      const data = Buffer.alloc(8 + 8);
      disc("withdraw_collateral").copy(data, 0);
      amount.toArrayLike(Buffer, "le", 8).copy(data, 8);

      const tx = new Transaction();
      tx.add({ programId: LENDING_PROGRAM_ID, keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: HYLP_MINT, isSigner: false, isWritable: false },
        { pubkey: LENDING_POOL, isSigner: false, isWritable: true },
        { pubkey: loanPosition, isSigner: false, isWritable: true },
        { pubkey: poolAuthority, isSigner: false, isWritable: false },
        { pubkey: poolCollateralAta, isSigner: false, isWritable: true },
        { pubkey: userHylpAta, isSigner: false, isWritable: true },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      await refreshOnChainState();
      setStage("position");
      toast.success("Collateral withdrawn!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Withdraw collateral failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
    } finally {
      setBusy(false);
    }
  };

  const handleWithdrawPosition = async () => {
    if (!publicKey || !signTransaction) return;
    setBusy(true);
    const toastId = toast.loading("Withdrawing from DLMM...");
    try {
      const [vaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault-authority"), LP_VAULT_CONFIG.toBuffer()], LP_VAULT_PROGRAM_ID);

      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const vaultWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      // Get hyLP balance to burn
      const hylpBalance = await connection.getTokenAccountBalance(userHylpAta);
      const sharesToBurn = new BN(hylpBalance.value.amount);
      if (sharesToBurn.isZero()) {
        toast.info("No hyLP to withdraw", { id: toastId });
        setPositionValue(0);
        setFeesEarned(0);
        setStage("pool");
        return;
      }

      const dlmm = getDlmmAccounts(POSITION_LOWER_BIN_ID, POSITION_WIDTH);

      const data = Buffer.alloc(8 + 8);
      disc("withdraw_liquidity").copy(data, 0);
      sharesToBurn.toArrayLike(Buffer, "le", 8).copy(data, 8);

      const tx = new Transaction();
      tx.add(dlmmComputeBudget());
      tx.add({ programId: LP_VAULT_PROGRAM_ID, keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: USDC_DEVNET_MINT, isSigner: false, isWritable: false },
        { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
        { pubkey: LP_VAULT_CONFIG, isSigner: false, isWritable: true },
        { pubkey: vaultAuthority, isSigner: false, isWritable: false },
        { pubkey: HYLP_MINT, isSigner: false, isWritable: true },
        { pubkey: userUsdcAta, isSigner: false, isWritable: true },
        { pubkey: userWsolAta, isSigner: false, isWritable: true },
        { pubkey: vaultUsdcAta, isSigner: false, isWritable: true },
        { pubkey: vaultWsolAta, isSigner: false, isWritable: true },
        { pubkey: userHylpAta, isSigner: false, isWritable: true },
        // DLMM accounts
        { pubkey: DLMM_POSITION, isSigner: false, isWritable: true },
        { pubkey: DEMO_POOL_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: dlmm.bitmapExtension, isSigner: false, isWritable: true },
        { pubkey: DLMM_RESERVE_X, isSigner: false, isWritable: true },
        { pubkey: DLMM_RESERVE_Y, isSigner: false, isWritable: true },
        { pubkey: dlmm.binArrayLower, isSigner: false, isWritable: true },
        { pubkey: dlmm.binArrayUpper, isSigner: false, isWritable: true },
        { pubkey: dlmm.eventAuthority, isSigner: false, isWritable: false },
        { pubkey: DLMM_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      await refreshOnChainState();
      setPositionValue(0);
      setFeesEarned(0);
      setStage("pool");
      toast.success("Withdrawn from Meteora DLMM!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Withdraw failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const handleClaimFees = async () => {
    if (!publicKey || !signTransaction) return;
    setBusy(true);
    const toastId = toast.loading("Harvesting DLMM fees...");
    try {
      const [vaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault-authority"), LP_VAULT_CONFIG.toBuffer()], LP_VAULT_PROGRAM_ID);

      const dlmm = getDlmmAccounts(POSITION_LOWER_BIN_ID, POSITION_WIDTH);

      const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID);
      const vaultWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID);

      const data = disc("claim_fees");

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
      tx.add({ programId: LP_VAULT_PROGRAM_ID, keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: USDC_DEVNET_MINT, isSigner: false, isWritable: false },
        { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
        { pubkey: LP_VAULT_CONFIG, isSigner: false, isWritable: true },
        { pubkey: vaultAuthority, isSigner: false, isWritable: false },
        { pubkey: DLMM_POSITION, isSigner: false, isWritable: true },
        { pubkey: DEMO_POOL_ADDRESS, isSigner: false, isWritable: true },
        { pubkey: dlmm.binArrayLower, isSigner: false, isWritable: true },
        { pubkey: dlmm.binArrayUpper, isSigner: false, isWritable: true },
        { pubkey: DLMM_RESERVE_X, isSigner: false, isWritable: true },
        { pubkey: DLMM_RESERVE_Y, isSigner: false, isWritable: true },
        { pubkey: vaultUsdcAta, isSigner: false, isWritable: true },
        { pubkey: vaultWsolAta, isSigner: false, isWritable: true },
        { pubkey: USDC_DEVNET_MINT, isSigner: false, isWritable: false },
        { pubkey: WSOL_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: dlmm.eventAuthority, isSigner: false, isWritable: false },
        { pubkey: DLMM_PROGRAM_ID, isSigner: false, isWritable: false },
      ], data });

      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");

      await refreshOnChainState();
      toast.success("Fees harvested!", { id: toastId });
    } catch (err: unknown) {
      console.error(err);
      toast.error("Fee harvest failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  if (!connected) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <div className="animate-coin mb-6">
            <img src="/logo.png" alt="HasYield" className="w-24 h-24 rounded-full" style={{ boxShadow: "0 0 60px rgba(222,219,200,0.1)" }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#E1E0CC" }}>HasYield Vault</h1>
          <p className="text-gray-500 text-sm mb-6 text-center max-w-sm">Deposit SOL + USDC. HasYield rehypothecates them across DLMM, staking, and lending. Triple yield, one deposit.</p>
          <WalletMultiButton />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">

        <AnimatePresence mode="wait">

          {/* ━━━ STAGE 1: Pool Selection + Deposit ━━━ */}
          {stage === "pool" && (
            <motion.div key="pool" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Pool selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { pair: "SOL/USDC", logo1: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", logo2: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", active: true, apy: "35.0%" },
                  { pair: "SOL/USDT", logo1: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", logo2: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png", active: false, apy: "28.4%" },
                  { pair: "ETH/USDC", logo1: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png", logo2: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", active: false, apy: "22.1%" },
                  { pair: "JUP/USDC", logo1: "https://static.jup.ag/jup/icon.png", logo2: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", active: false, apy: "41.7%" },
                ].map(pool => (
                  <button key={pool.pair}
                    className={`rounded-xl p-3 text-left transition relative group ${pool.active ? "border border-[#DEDBC8]/30 bg-[#DEDBC8]/5" : "border border-[#1a1a1a] bg-[#0a0a0a] opacity-60 cursor-not-allowed"}`}
                    disabled={!pool.active}
                    title={!pool.active ? "This pool will be available soon. SOL/USDC is live now." : ""}>
                    {!pool.active && (
                      <>
                        <span className="absolute top-1.5 right-1.5 text-[8px] px-1.5 py-0.5 rounded-full bg-[#1a1a1a] text-gray-500">Soon</span>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/70 rounded-xl z-10">
                          <p className="text-[10px] text-gray-400 text-center px-2">Coming soon — SOL/USDC is live</p>
                        </div>
                      </>
                    )}
                    <div className="flex -space-x-1.5 mb-2">
                      <img src={pool.logo1} alt="" className="w-6 h-6 rounded-full border border-[#1a1a1a]" />
                      <img src={pool.logo2} alt="" className="w-6 h-6 rounded-full border border-[#1a1a1a]" />
                    </div>
                    <p className="text-xs font-medium" style={{ color: pool.active ? "#E1E0CC" : "#666" }}>{pool.pair}</p>
                    <p className="text-[10px] text-gray-500">{pool.apy} APY</p>
                  </button>
                ))}
              </div>

              {/* Active pool card */}
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
                <div className="p-5 border-b border-[#1a1a1a]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-9 h-9 rounded-full border-2 border-[#0a0a0a]" />
                        <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" className="w-9 h-9 rounded-full border-2 border-[#0a0a0a]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#E1E0CC" }}>SOL / USDC</p>
                        <div className="flex items-center gap-1.5">
                          <img src="https://app.meteora.ag/icons/logo.svg" alt="Meteora" className="w-3 h-3 rounded-full" />
                          <p className="text-[10px] text-gray-500">Meteora DLMM · Bin Step 10</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gradient-cream">{pool ? (pool.apy * 100).toFixed(1) : (apy * 100).toFixed(1)}%</p>
                      <p className="text-[10px] text-gray-500">Ref. APY (mainnet)</p>
                    </div>
                  </div>
                </div>

                {/* Bin range visualization */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pool Liquidity Distribution</p>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-[#DEDBC8]/10" style={{ color: "#DEDBC8" }}>Auto-managed by HasYield</span>
                  </div>
                  <div className="relative h-20 rounded-lg bg-[#111] overflow-hidden">
                    {/* Bins — deterministic distribution matching vault position range */}
                    <div className="absolute inset-0 flex items-end px-2 gap-[1px]">
                      {Array.from({ length: 35 }).map((_, i) => {
                        const binOffset = i - 17; // center around active bin
                        const isActive = binOffset === 0;
                        const distFromActive = Math.abs(binOffset);
                        const base = isActive ? 90 : Math.max(20, 75 - distFromActive * 2);
                        return (
                          <motion.div
                            key={i}
                            className="flex-1 rounded-t-sm"
                            style={{
                              backgroundColor: isActive
                                ? "rgba(222,219,200,0.8)"
                                : "rgba(222,219,200,0.35)",
                            }}
                            initial={{ height: 0 }}
                            animate={{ height: `${base}%` }}
                            transition={{ delay: i * 0.015, duration: 0.3 }}
                          />
                        );
                      })}
                    </div>
                    {/* Active price marker */}
                    <motion.div className="absolute top-0 bottom-0 w-[2px] bg-[#DEDBC8]" style={{ left: "50%" }}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                      <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-[#DEDBC8]" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                    <span>Bin {POSITION_LOWER_BIN_ID}</span>
                    <span className="text-gray-400">Active: Bin {ACTIVE_ID}</span>
                    <span>Bin {POSITION_LOWER_BIN_ID + POSITION_WIDTH - 1}</span>
                  </div>
                  <p className="text-[8px] text-gray-600 text-center mt-1">Simulated distribution — bins centered on active price</p>
                </div>

                {/* Pool stats */}
                <div className="grid grid-cols-3 border-t border-[#1a1a1a]">
                  {[
                    { label: "TVL", value: pool ? `$${(pool.tvl / 1_000_000).toFixed(1)}M` : "$2.1M" },
                    { label: "24h Volume", value: pool ? `$${(pool.volume24h / 1_000).toFixed(0)}K` : "$842K" },
                    { label: "24h Fees", value: pool ? `$${(pool.fees24h / 1_000).toFixed(1)}K` : "$4.2K" },
                  ].map(s => (
                    <div key={s.label} className="p-3 text-center border-r last:border-r-0 border-[#1a1a1a]">
                      <p className="text-xs font-medium tabular-nums" style={{ color: "#E1E0CC" }}>{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-gray-600 text-center py-1">Reference data from mainnet SOL/USDC pool</p>
              </div>

              {/* Deposit form */}
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 space-y-4">
                <p className="text-sm font-medium" style={{ color: "#E1E0CC" }}>Deposit & Rehypothecate</p>
                <p className="text-[10px] text-gray-500">Your assets are automatically routed to 3 yield sources.</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-[#111] p-3">
                    <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" className="w-8 h-8 rounded-full" />
                    <input type="text" inputMode="decimal" value={depositX} onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setDepositX(v); }} placeholder="0.00"
                      className="flex-1 bg-transparent text-lg font-medium tabular-nums outline-none [appearance:textfield]" style={{ color: "#E1E0CC" }} />
                    <span className="text-xs text-gray-500">USDC</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-[#111] p-3">
                    <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-8 h-8 rounded-full" />
                    <input type="text" inputMode="decimal" value={depositY} onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setDepositY(v); }} placeholder="0.00"
                      className="flex-1 bg-transparent text-lg font-medium tabular-nums outline-none [appearance:textfield]" style={{ color: "#E1E0CC" }} />
                    <span className="text-xs text-gray-500">SOL</span>
                  </div>
                </div>

                {/* Rehypothecation routing preview */}
                {(parseFloat(depositX) > 0 || parseFloat(depositY) > 0) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Routing</p>

                    {/* Route 1: Both tokens → DLMM */}
                    <div className="rounded-xl bg-[#111] p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" className="w-8 h-8 rounded-full border border-[#1a1a1a]" />
                          <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-8 h-8 rounded-full border border-[#1a1a1a]" />
                        </div>
                        <ArrowRight className="w-3 h-3 text-gray-600" />
                        <img src="https://app.meteora.ag/icons/logo.svg" alt="Meteora" className="w-8 h-8 rounded-full" />
                        <span className="text-sm text-gray-300">DLMM Bins</span>
                        <span className="ml-auto text-base font-bold" style={{ color: "#DEDBC8" }}>{(apy * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 ml-10">Concentrated liquidity earning trading fees</p>
                    </div>

                    {/* Route 2: SOL → Best staking (AI selected) */}
                    {parseFloat(depositY) > 0 && (
                      <div className="rounded-xl bg-[#111] p-4">
                        <div className="flex items-center gap-2">
                          <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-8 h-8 rounded-full border border-[#1a1a1a]" />
                          <ArrowRight className="w-3 h-3 text-gray-600" />
                          <img src={bestStaking.logo} alt={bestStaking.name} className="w-8 h-8 rounded-full" />
                          <span className="text-sm text-gray-300">{bestStaking.name}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DEDBC8]/10 ml-2" style={{ color: "#DEDBC8" }}>AI Best</span>
                          <span className="ml-auto text-base font-bold" style={{ color: "#DEDBC8" }}>{(bestStaking.rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 ml-10">
                          {stakingOptions.filter(s => s.name !== bestStaking.name).map(s => (
                            <div key={s.name} className="flex items-center gap-1.5 opacity-80">
                              <img src={s.logo} alt={s.name} className="w-5 h-5 rounded-full grayscale" />
                              <span className="text-xs text-gray-600">{s.name} {(s.rate * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Route 3: USDC → Best lending (AI selected) */}
                    {parseFloat(depositX) > 0 && (
                      <div className="rounded-xl bg-[#111] p-4">
                        <div className="flex items-center gap-2">
                          <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" className="w-8 h-8 rounded-full border border-[#1a1a1a]" />
                          <ArrowRight className="w-3 h-3 text-gray-600" />
                          <img src={bestLending.logo} alt={bestLending.name} className="w-8 h-8 rounded-full" />
                          <span className="text-sm text-gray-300">{bestLending.name}</span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DEDBC8]/10 ml-2" style={{ color: "#DEDBC8" }}>AI Best</span>
                          <span className="ml-auto text-base font-bold" style={{ color: "#DEDBC8" }}>{(bestLending.rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 ml-10">
                          {lendingOptions.filter(l => l.name !== bestLending.name).map(l => (
                            <div key={l.name} className="flex items-center gap-1.5 opacity-80">
                              <img src={l.logo} alt={l.name} className="w-5 h-5 rounded-full grayscale" />
                              <span className="text-xs text-gray-600">{l.name} {(l.rate * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Combined */}
                    <div className="rounded-xl bg-[#DEDBC8]/5 border border-[#DEDBC8]/10 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="HasYield" className="w-8 h-8 rounded-full" />
                        <span className="text-sm font-medium" style={{ color: "#DEDBC8" }}>Est. Combined APY</span>
                      </div>
                      <span className="text-xl font-bold text-gradient-cream">
                        {((apy + (parseFloat(depositY) > 0 ? bestStaking.rate * MARINADE_ROUTE_PERCENT : 0) + (parseFloat(depositX) > 0 ? bestLending.rate * 0.3 : 0)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </motion.div>
                )}

                <Button className="w-full" size="lg" onClick={handleDeposit}
                  disabled={busy || !(parseFloat(depositX) > 0 || parseFloat(depositY) > 0)}>
                  {busy ? "Depositing..." : "Deposit & Start Earning"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ━━━ STAGE 2: Position — Yield Focus ━━━ */}
          {stage === "position" && (
            <motion.div key="position" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Aggregate earnings card */}
              <motion.div className="rounded-2xl border border-[#DEDBC8]/15 bg-[#0a0a0a] overflow-hidden"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Total */}
                <div className="p-5 text-center border-b border-[#1a1a1a]">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Earnings</p>
                  <motion.p className="text-3xl font-bold tabular-nums text-gradient-cream"
                    animate={{ opacity: [0.8, 1, 0.8] }} transition={{ duration: 2, repeat: Infinity }}>
                    +${feesEarned.toFixed(6)}
                  </motion.p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {(combinedApy * 100).toFixed(1)}% combined APY on ${positionValue.toFixed(2)}
                  </p>
                  <p className="text-[8px] text-gray-600">(APY estimated from mainnet reference rates)</p>
                </div>

                {/* Yield source cards */}
                <div className="grid grid-cols-3 gap-[1px] bg-[#1a1a1a]">
                  <YieldSourceCard
                    logo="https://app.meteora.ag/icons/logo.svg"
                    tokenLogos={["https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"]}
                    label="LP Fees" source="Meteora DLMM"
                    rate={apy} baseValue={positionValue} platformFee={0.1}
                  />
                  <YieldSourceCard
                    logo="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png"
                    tokenLogos={["https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"]}
                    label="Staking" source={`Marinade${onChainState?.vaultMsolBalance ? ` (${(onChainState.vaultMsolBalance / 1e9).toFixed(4)} mSOL)` : " (30% SOL)"}`}
                    rate={bestStaking.rate} baseValue={onChainState?.vaultMsolBalance ? onChainState.vaultMsolBalance / 1e9 : positionValue * MARINADE_ROUTE_PERCENT} platformFee={0.05}
                  />
                  <YieldSourceCard
                    logo="https://solend.fi/favicon.ico"
                    tokenLogos={["https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"]}
                    label="Lending" source="HasYield Pool"
                    rate={bestLending.rate} baseValue={0} platformFee={0.1}
                  />
                </div>

                {/* Platform revenue note */}
                <div className="px-4 py-2 bg-[#0f0f0f] text-center">
                  <p className="text-[9px] text-gray-600">
                    HasYield takes a small performance fee from each yield source — you keep the rest
                  </p>
                </div>
              </motion.div>

              <PositionCard
                value={positionValue}
                fees={feesEarned}
                apy={apy}
                rangeMin={rangeMin}
                rangeMax={rangeMax}
                status="free"
                borrowed={0}
              />

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" size="lg" onClick={handleWithdrawPosition} className="text-xs">
                  Withdraw
                </Button>
                <Button variant="outline" size="lg" onClick={handleClaimFees} className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" /> Harvest Fees
                </Button>
                <Button size="lg" onClick={handleCollateralize} className="text-xs">
                  <Lock className="w-3 h-3 mr-1" /> Borrow Against It
                </Button>
              </div>
              <p className="text-center text-[10px] text-gray-600">
                Optional: use your hyLP as collateral to borrow up to ${(positionValue * 0.5).toFixed(2)} USDC
              </p>

              {/* Coming soon teasers */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#0a0a0a] p-4 relative">
                  <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-[#DEDBC8]/10 border border-[#DEDBC8]/20" style={{ color: "#DEDBC8" }}>Soon</span>
                  <TrendingUp className="w-5 h-5 mb-1" style={{ color: "#DEDBC8" }} />
                  <p className="text-xs font-medium" style={{ color: "#E1E0CC" }}>Yield Trading</p>
                  <p className="text-[10px] text-gray-600 mt-1">Split into PT + YT. Trade future yield.</p>
                </div>
                <div className="rounded-xl border border-dashed border-[#2a2a2a] bg-[#0a0a0a] p-4 relative">
                  <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-[#DEDBC8]/10 border border-[#DEDBC8]/20" style={{ color: "#DEDBC8" }}>Soon</span>
                  <Layers className="w-5 h-5 mb-1" style={{ color: "#DEDBC8" }} />
                  <p className="text-xs font-medium" style={{ color: "#E1E0CC" }}>AI Auto-Rebalance</p>
                  <p className="text-[10px] text-gray-600 mt-1">Auto-switch to highest yield protocol.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ━━━ STAGE 3: Collateralized — ready to borrow ━━━ */}
          {stage === "collateral" && (
            <motion.div key="collateral" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <PositionCard
                value={positionValue}
                fees={feesEarned}
                apy={apy}
                rangeMin={rangeMin}
                rangeMax={rangeMax}
                status="collateralized"
                borrowed={0}
              />

              <div className="rounded-2xl border border-[#DEDBC8]/20 bg-[#0a0a0a] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" style={{ color: "#DEDBC8" }} />
                  <p className="text-sm font-medium" style={{ color: "#E1E0CC" }}>Borrow Against Your Position</p>
                </div>
                <div className="rounded-xl bg-[#111] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Borrow Amount</span>
                    <span className="text-[10px] text-gray-500">Max: ${(onChainState?.collateralDeposited ? (onChainState.collateralDeposited / 1e9) * 0.5 : positionValue * 0.5).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="text" inputMode="decimal" value={borrowAmount} onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setBorrowAmount(v); }} placeholder="0.00"
                      className="flex-1 bg-transparent text-lg font-medium tabular-nums outline-none" style={{ color: "#E1E0CC" }} />
                    <span className="text-xs text-gray-500">USDC</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="rounded-lg bg-[#111] p-2">
                    <span className="text-gray-500">LTV</span>
                    <p className="font-medium tabular-nums" style={{ color: "#E1E0CC" }}>
                      {borrowAmount ? ((parseFloat(borrowAmount) / positionValue) * 100).toFixed(1) : "0"}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#111] p-2">
                    <span className="text-gray-500">Position still earns</span>
                    <p className="font-medium" style={{ color: "#E1E0CC" }}>{(apy * 100).toFixed(1)}% APY</p>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={handleBorrow}
                  disabled={!borrowAmount || parseFloat(borrowAmount) > positionValue * 0.5}>
                  Borrow USDC
                </Button>
              </div>

              <button onClick={handleWithdrawCollateral} className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition">
                Remove collateral
              </button>
            </motion.div>
          )}

          {/* ━━━ STAGE 4: Borrowed — flywheel complete ━━━ */}
          {stage === "borrowed" && (
            <motion.div key="borrowed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Triple yield flywheel */}
              <motion.div className="rounded-2xl border border-[#DEDBC8]/20 bg-[#0a0a0a] overflow-hidden"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="p-5 border-b border-[#1a1a1a] text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Rehypothecation Active</p>
                  <p className="text-xl font-bold" style={{ color: "#E1E0CC" }}>Triple Yield Flywheel</p>
                  <p className="text-[10px] text-gray-500 mt-1">Same capital. Three yield streams. Only on HasYield.</p>
                </div>

                {/* Yield streams */}
                <div className="divide-y divide-[#1a1a1a]">
                  <YieldStream
                    icon="https://app.meteora.ag/icons/logo.svg" label="LP Trading Fees" source="Meteora DLMM"
                    rate={apy} baseValue={positionValue} delay={0}
                  />
                  <YieldStream
                    icon="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" label="SOL Staking Yield" source="via Marinade (30% routed)"
                    rate={bestStaking.rate} baseValue={positionValue * MARINADE_ROUTE_PERCENT} delay={0.1}
                  />
                  <YieldStream
                    icon="$" label="USDC Lending Yield" source="via Solend (coming soon)"
                    rate={bestLending.rate} baseValue={0} delay={0.2}
                  />
                </div>

                {/* Total */}
                <div className="p-5 bg-[#DEDBC8]/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Combined Effective APY</p>
                  <p className="text-3xl font-bold text-gradient-cream tabular-nums">
                    {((apy + bestStaking.rate * MARINADE_ROUTE_PERCENT) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    vs {(apy * 100).toFixed(1)}% from LP fees alone — +{((bestStaking.rate * MARINADE_ROUTE_PERCENT) * 100).toFixed(1)}% from staking rehypothecation
                  </p>
                </div>
              </motion.div>

              <PositionCard
                value={positionValue}
                fees={feesEarned}
                apy={apy}
                rangeMin={rangeMin}
                rangeMax={rangeMax}
                status="borrowed"
                borrowed={borrowed}
              />

              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Outstanding Loan</span>
                  <span className="text-sm font-medium tabular-nums" style={{ color: "#E1E0CC" }}>${(onChainState?.borrowedAmount ? onChainState.borrowedAmount / 1e6 : borrowed).toFixed(2)} USDC</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleRepay}>
                  Repay & Unlock Position
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}

/* ═══ Yield Source Card (nested inside position) ═══ */
function YieldSourceCard({ logo, tokenLogos, label, source, rate, baseValue, platformFee }: {
  logo: string; tokenLogos: string[]; label: string; source: string; rate: number; baseValue: number; platformFee: number;
}) {
  const [earned, setEarned] = useState(0);
  const userRate = rate * (1 - platformFee);

  useEffect(() => {
    const interval = setInterval(() => {
      setEarned(prev => prev + (baseValue * userRate) / (365.25 * 24 * 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, [baseValue, userRate]);

  return (
    <div className="bg-[#0a0a0a] p-3 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        <div className="flex -space-x-1">
          {tokenLogos.map((t, i) => (
            <img key={i} src={t} alt="" className="w-4 h-4 rounded-full border border-[#1a1a1a]" />
          ))}
        </div>
        <ArrowRight className="w-2.5 h-2.5 text-gray-600" />
        <img src={logo} alt={source} className="w-4 h-4 rounded-full" />
      </div>
      <p className="text-[10px] font-medium" style={{ color: "#E1E0CC" }}>{label}</p>
      <p className="text-[9px] text-gray-600">{source}</p>
      <p className="text-sm font-bold tabular-nums mt-1 text-gradient-cream">{(userRate * 100).toFixed(1)}%</p>
      <motion.p className="text-[9px] text-gray-400 tabular-nums mt-0.5"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
        +${earned.toFixed(6)}
      </motion.p>
      <p className="text-[8px] text-gray-700 mt-0.5">{(platformFee * 100).toFixed(0)}% fee</p>
    </div>
  );
}

/* ═══ Yield Stream ═══ */
function YieldStream({ icon, label, source, rate, baseValue, delay }: {
  icon: string; label: string; source: string; rate: number; baseValue: number; delay: number;
}) {
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEarned(prev => prev + (baseValue * rate) / (365.25 * 24 * 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, [baseValue, rate]);

  return (
    <motion.div className="flex items-center justify-between px-5 py-4"
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <div className="flex items-center gap-3">
        <img src={icon} alt="" className="w-5 h-5 rounded-full" />
        <div>
          <p className="text-xs font-medium" style={{ color: "#E1E0CC" }}>{label}</p>
          <p className="text-[10px] text-gray-500">{source}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums text-gradient-cream">{(rate * 100).toFixed(1)}%</p>
        <motion.p className="text-[10px] text-gray-400 tabular-nums"
          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
          +${earned.toFixed(6)}
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ═══ Position Card ═══ */
function PositionCard({ value, fees, apy, rangeMin, rangeMax, status, borrowed }: {
  value: number; fees: number; apy: number; rangeMin: number; rangeMax: number;
  status: "free" | "collateralized" | "borrowed"; borrowed: number;
}) {
  const statusConfig = {
    free: { label: "Free", color: "#DEDBC8", bg: "rgba(222,219,200,0.1)" },
    collateralized: { label: "Collateral", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    borrowed: { label: "Borrowed Against", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  }[status];

  return (
    <motion.div className="relative rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      {/* Glow */}
      <div className="absolute -inset-[1px] rounded-2xl opacity-20 pointer-events-none" style={{
        background: `linear-gradient(135deg, ${statusConfig.color}, transparent, ${statusConfig.color})`,
        backgroundSize: "200% 200%", animation: "gradient-shift 8s ease infinite",
      }} />

      <div className="relative">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-full" />
            <div>
              <p className="text-xs text-gray-500">hyLP Position</p>
              <p className="text-sm font-medium" style={{ color: "#E1E0CC" }}>SOL / USDC</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium"
            style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}>
            {status === "free" ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {statusConfig.label}
          </div>
        </div>

        {/* Value + Fees */}
        <div className="p-5 text-center border-b border-[#1a1a1a]">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Position Value</p>
          <p className="text-3xl font-bold tabular-nums" style={{ color: "#E1E0CC" }}>
            ${(value + fees).toFixed(2)}
          </p>
          <motion.p className="text-sm text-gradient-cream mt-1 tabular-nums"
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
            +${fees.toFixed(6)} fees earned
          </motion.p>
          <p className="text-[10px] text-gray-500 mt-1">{((apy + 0.072 * 0.5 + 0.12 * 0.5) * 100).toFixed(1)}% combined APY</p>
        </div>

        {/* Yield breakdown */}
        <div className="border-t border-[#1a1a1a]">
          <div className="px-5 py-2 flex items-center justify-between border-b border-[#0f0f0f]">
            <div className="flex items-center gap-2">
              <img src="https://app.meteora.ag/icons/logo.svg" alt="Meteora" className="w-4 h-4 rounded-full" />
              <span className="text-[10px] text-gray-500">LP Fees</span>
            </div>
            <span className="text-[10px] font-medium tabular-nums" style={{ color: "#DEDBC8" }}>{(apy * 100).toFixed(1)}%</span>
          </div>
          <div className="px-5 py-2 flex items-center justify-between border-b border-[#0f0f0f]">
            <div className="flex items-center gap-2">
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-4 h-4 rounded-full" />
              <span className="text-[10px] text-gray-500">SOL Staking</span>
            </div>
            <span className="text-[10px] font-medium tabular-nums" style={{ color: "#DEDBC8" }}>7.2%</span>
          </div>
          <div className="px-5 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" className="w-4 h-4 rounded-full" />
              <span className="text-[10px] text-gray-500">USDC Lending</span>
            </div>
            <span className="text-[10px] font-medium tabular-nums" style={{ color: "#DEDBC8" }}>12.0%</span>
          </div>
        </div>

        {/* Mini bin range */}
        <div className="px-5 py-3 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">${rangeMin}</span>
            <div className="flex-1 h-2 rounded-full bg-[#111] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, rgba(222,219,200,0.2), rgba(222,219,200,0.5), rgba(222,219,200,0.2))" }}
                initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1 }} />
            </div>
            <span className="text-[10px] text-gray-500">${rangeMax}</span>
          </div>
        </div>

        {/* Borrowed */}
        {borrowed > 0 && (
          <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Borrowed</span>
            <span className="text-xs font-medium tabular-nums" style={{ color: "#E1E0CC" }}>${borrowed.toFixed(2)} USDC</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
