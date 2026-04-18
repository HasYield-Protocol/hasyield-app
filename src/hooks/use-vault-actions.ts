"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { sha256 } from "@noble/hashes/sha256";
import BN from "bn.js";
import { toast } from "sonner";
import {
  LP_VAULT_PROGRAM_ID, LP_VAULT_CONFIG, HYLP_MINT,
  USDC_DEVNET_MINT, WSOL_MINT, DLMM_PROGRAM_ID, DEMO_POOL_ADDRESS,
  DLMM_POSITION, DLMM_RESERVE_X, DLMM_RESERVE_Y,
  POSITION_LOWER_BIN_ID, POSITION_WIDTH, ACTIVE_ID,
  LENDING_PROGRAM_ID, LENDING_POOL, TEST_USDC_MINT,
  MARINADE_PROGRAM_ID, MARINADE_STATE, MSOL_MINT, LIQ_POOL_MSOL_LEG,
} from "@/lib/lp-constants";
import { getDlmmAccounts, dlmmComputeBudget } from "@/lib/dlmm-helpers";
import {
  deriveMarinadeReserve, deriveLiqSolLeg, deriveLiqMsolLegAuth, deriveMsolMintAuth,
} from "@/lib/marinade-helpers";
import { readVaultState, type VaultState } from "@/lib/on-chain-reader";

function disc(name: string): Buffer {
  return Buffer.from(sha256(`global:${name}`).slice(0, 8));
}

const MARINADE_ROUTE_PERCENT = 0.3;

export type VaultActions = {
  busy: boolean;
  state: VaultState | null;
  refresh: () => Promise<VaultState | null>;
  deposit: (usdc: number, sol: number) => Promise<boolean>;
  collateralize: () => Promise<boolean>;
  borrow: (amount: number) => Promise<boolean>;
  repay: (amount: number) => Promise<boolean>;
  withdrawCollateral: () => Promise<boolean>;
  withdrawPosition: () => Promise<boolean>;
  claimFees: () => Promise<boolean>;
};

export function useVaultActions(): VaultActions {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<VaultState | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setState(null);
      return null;
    }
    try {
      const s = await readVaultState(connection, publicKey);
      setState(s);
      return s;
    } catch (err) {
      console.error("refresh vault state failed", err);
      return null;
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setState(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const s = await refresh();
      if (cancelled) return;
      void s;
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connected, publicKey, refresh]);

  const sendAndConfirm = useCallback(
    async (tx: Transaction) => {
      if (!publicKey || !signTransaction) throw new Error("wallet not ready");
      const bh = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
      await connection.confirmTransaction({ signature: sig, ...bh }, "confirmed");
      return sig;
    },
    [connection, publicKey, signTransaction],
  );

  const deposit = useCallback(async (usdc: number, sol: number) => {
    if (!publicKey || !signTransaction) return false;
    if (usdc + sol <= 0) return false;

    setBusy(true);
    const toastId = toast.loading("Depositing into DLMM...");
    try {
      const amountX = Math.floor(usdc * 1e6);
      const amountY = Math.floor(sol * LAMPORTS_PER_SOL);

      const [vaultAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault-authority"), LP_VAULT_CONFIG.toBuffer()], LP_VAULT_PROGRAM_ID);

      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const vaultUsdcAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const vaultWsolAta = getAssociatedTokenAddressSync(WSOL_MINT, vaultAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const dlmm = getDlmmAccounts(POSITION_LOWER_BIN_ID, POSITION_WIDTH);

      const tx = new Transaction();
      tx.add(dlmmComputeBudget());

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

      if (amountY > 0) {
        tx.add(
          SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: userWsolAta, lamports: amountY }),
          { programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: userWsolAta, isSigner: false, isWritable: true }], data: Buffer.from([17]) },
        );
      }

      const data = Buffer.alloc(8 + 8 + 8 + 4 + 4);
      disc("deposit_liquidity").copy(data, 0);
      new BN(amountX).toArrayLike(Buffer, "le", 8).copy(data, 8);
      new BN(amountY).toArrayLike(Buffer, "le", 8).copy(data, 16);
      data.writeInt32LE(ACTIVE_ID, 24);
      data.writeInt32LE(5, 28);

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

      await sendAndConfirm(tx);
      await refresh();
      toast.success("Deposited into Meteora DLMM! hyLP minted.", { id: toastId });

      // Route 30% SOL to Marinade
      if (amountY > 0) {
        const marinToastId = toast.loading("Routing SOL to Marinade staking...");
        try {
          const marinadeAmount = Math.floor(amountY * MARINADE_ROUTE_PERCENT);
          if (marinadeAmount > 100_000) {
            const [vaultAuth2] = PublicKey.findProgramAddressSync(
              [Buffer.from("vault-authority"), LP_VAULT_CONFIG.toBuffer()], LP_VAULT_PROGRAM_ID);
            const vaultMsolAta = getAssociatedTokenAddressSync(MSOL_MINT, vaultAuth2, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

            const marinTx = new Transaction();
            marinTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
            marinTx.add(SystemProgram.transfer({
              fromPubkey: publicKey, toPubkey: vaultAuth2, lamports: marinadeAmount + 1_000_000,
            }));
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

            await sendAndConfirm(marinTx);
            await refresh();
            toast.success("SOL routed to Marinade staking!", { id: marinToastId });
          } else {
            toast.dismiss(marinToastId);
          }
        } catch (err) {
          console.error("Marinade routing failed:", err);
          toast.info("DLMM deposit succeeded. Marinade routing skipped.", { id: marinToastId });
        }
      }
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Deposit failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, refresh, sendAndConfirm, signTransaction]);

  const collateralize = useCallback(async () => {
    if (!publicKey || !signTransaction) return false;
    setBusy(true);
    const toastId = toast.loading("Depositing hyLP as collateral...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const poolCollateralAta = getAssociatedTokenAddressSync(HYLP_MINT, poolAuthority, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const hylpBalance = await connection.getTokenAccountBalance(userHylpAta);
      const amount = new BN(hylpBalance.value.amount);
      if (amount.isZero()) {
        toast.error("No hyLP to collateralize", { id: toastId });
        return false;
      }

      const tx = new Transaction();
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

      await sendAndConfirm(tx);
      await refresh();
      toast.success("hyLP deposited as collateral!", { id: toastId });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Collateralize failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, refresh, sendAndConfirm, signTransaction]);

  const borrow = useCallback(async (amount: number) => {
    if (!publicKey || !signTransaction) return false;
    if (amount <= 0) return false;
    setBusy(true);
    const toastId = toast.loading("Borrowing USDC...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const poolBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, poolAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const borrowLamports = Math.floor(amount * 1e6);

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

      await sendAndConfirm(tx);
      await refresh();
      toast.success(`Borrowed ${amount} USDC!`, { id: toastId });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Borrow failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, refresh, sendAndConfirm, signTransaction]);

  const repay = useCallback(async (amount: number) => {
    if (!publicKey || !signTransaction) return false;
    setBusy(true);
    const toastId = toast.loading("Repaying loan...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const poolBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, poolAuthority, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const userBorrowAta = getAssociatedTokenAddressSync(TEST_USDC_MINT, publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      const repayLamports = Math.floor(amount * 1e6);

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

      await sendAndConfirm(tx);
      await refresh();
      toast.success("Loan repaid!", { id: toastId });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Repay failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, refresh, sendAndConfirm, signTransaction]);

  const withdrawCollateral = useCallback(async () => {
    if (!publicKey || !signTransaction) return false;
    setBusy(true);
    const toastId = toast.loading("Withdrawing collateral...");
    try {
      const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool-authority"), LENDING_POOL.toBuffer()], LENDING_PROGRAM_ID);
      const [loanPosition] = PublicKey.findProgramAddressSync(
        [Buffer.from("loan"), LENDING_POOL.toBuffer(), publicKey.toBuffer()], LENDING_PROGRAM_ID);

      const userHylpAta = getAssociatedTokenAddressSync(HYLP_MINT, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const poolCollateralAta = getAssociatedTokenAddressSync(HYLP_MINT, poolAuthority, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

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

      await sendAndConfirm(tx);
      await refresh();
      toast.success("Collateral withdrawn!", { id: toastId });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Withdraw collateral failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, refresh, sendAndConfirm, signTransaction]);

  const withdrawPosition = useCallback(async () => {
    if (!publicKey || !signTransaction) return false;
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

      const hylpBalance = await connection.getTokenAccountBalance(userHylpAta);
      const sharesToBurn = new BN(hylpBalance.value.amount);
      if (sharesToBurn.isZero()) {
        toast.info("No hyLP to withdraw", { id: toastId });
        return false;
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

      await sendAndConfirm(tx);
      await refresh();
      toast.success("Withdrawn from Meteora DLMM!", { id: toastId });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Withdraw failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [connection, publicKey, refresh, sendAndConfirm, signTransaction]);

  const claimFees = useCallback(async () => {
    if (!publicKey || !signTransaction) return false;
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

      await sendAndConfirm(tx);
      await refresh();
      toast.success("Fees harvested!", { id: toastId });
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Fee harvest failed", { id: toastId, description: err instanceof Error ? err.message.slice(0, 120) : "Unknown" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [publicKey, refresh, sendAndConfirm, signTransaction]);

  return {
    busy,
    state,
    refresh,
    deposit,
    collateralize,
    borrow,
    repay,
    withdrawCollateral,
    withdrawPosition,
    claimFees,
  };
}
