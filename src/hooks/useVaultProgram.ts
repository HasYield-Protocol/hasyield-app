"use client";

import { useCallback } from "react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

export function useVaultProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const sendTx = useCallback(
    async (
      instructions: TransactionInstruction[],
      signers?: { publicKey: { toBuffer(): Buffer }; secretKey: Uint8Array }[]
    ) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      const tx = new Transaction();
      for (const ix of instructions) {
        tx.add(ix);
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      return sig;
    },
    [connection, wallet]
  );

  return {
    connection,
    wallet,
    publicKey: wallet.publicKey,
    connected: wallet.connected,
    sendTx,
  };
}
