import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LP_VAULT_PROGRAM_ID, LP_VAULT_CONFIG, HYLP_MINT,
  LENDING_PROGRAM_ID, LENDING_POOL, MSOL_MINT,
} from "@/lib/lp-constants";

export interface VaultState {
  totalDepositedX: number;    // USDC in vault (6 decimals)
  totalDepositedY: number;    // SOL in vault (9 decimals)
  totalShares: number;        // total hyLP shares
  userHylpBalance: number;    // user's hyLP balance (9 decimals)
  userSolBalance: number;     // user's SOL balance
  vaultMsolBalance: number;   // vault's mSOL balance (9 decimals)
  collateralDeposited: number; // user's hyLP in lending pool
  borrowedAmount: number;     // user's borrowed USDC
  positionInitialized: boolean;
  marinadeAllocationBps: number; // current Marinade allocation in basis points
}

const VAULT_AUTHORITY = new PublicKey("9t6Zv8xtZrogbZL44EqdXknNHgron5MTdtSvTHww1vpc");

function readU64LE(buf: Buffer, offset: number): number {
  // Read as two u32s to avoid precision loss for values < Number.MAX_SAFE_INTEGER
  const lo = buf.readUInt32LE(offset);
  const hi = buf.readUInt32LE(offset + 4);
  return lo + hi * 0x100000000;
}

export async function readVaultState(
  connection: Connection,
  userPublicKey: PublicKey,
): Promise<VaultState> {
  const defaults: VaultState = {
    totalDepositedX: 0,
    totalDepositedY: 0,
    totalShares: 0,
    userHylpBalance: 0,
    userSolBalance: 0,
    vaultMsolBalance: 0,
    collateralDeposited: 0,
    borrowedAmount: 0,
    positionInitialized: false,
    marinadeAllocationBps: 3000,
  };

  // Derive PDAs and ATAs
  const userHylpAta = getAssociatedTokenAddressSync(
    HYLP_MINT, userPublicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const vaultMsolAta = getAssociatedTokenAddressSync(
    MSOL_MINT, VAULT_AUTHORITY, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [loanPosition] = PublicKey.findProgramAddressSync(
    [Buffer.from("loan"), LENDING_POOL.toBuffer(), userPublicKey.toBuffer()],
    LENDING_PROGRAM_ID,
  );

  // Fire all RPC calls in parallel
  const [vaultConfigInfo, userHylpInfo, vaultMsolInfo, loanInfo, userSolBalance] =
    await Promise.all([
      connection.getAccountInfo(LP_VAULT_CONFIG).catch(() => null),
      connection.getTokenAccountBalance(userHylpAta).catch(() => null),
      connection.getTokenAccountBalance(vaultMsolAta).catch(() => null),
      connection.getAccountInfo(loanPosition).catch(() => null),
      connection.getBalance(userPublicKey).catch(() => 0),
    ]);

  // 1. Parse vault_config account
  if (vaultConfigInfo?.data) {
    const buf = Buffer.from(vaultConfigInfo.data);
    if (buf.length >= 177) {
      defaults.totalDepositedX = readU64LE(buf, 136);
      defaults.totalDepositedY = readU64LE(buf, 144);
      defaults.totalShares = readU64LE(buf, 152);
      defaults.positionInitialized = buf.readUInt8(176) === 1;
      // marinade_allocation_bps at offset 179 (after bump bytes at 177, 178)
      if (buf.length >= 181) {
        defaults.marinadeAllocationBps = buf.readUInt16LE(179);
      }
    }
  }

  // 2. User hyLP balance
  if (userHylpInfo?.value) {
    defaults.userHylpBalance = Number(userHylpInfo.value.amount);
  }

  // 3. User SOL balance
  defaults.userSolBalance = userSolBalance as number;

  // 4. Vault mSOL balance
  if (vaultMsolInfo?.value) {
    defaults.vaultMsolBalance = Number(vaultMsolInfo.value.amount);
  }

  // 5. Loan position (if exists)
  if (loanInfo?.data) {
    const buf = Buffer.from(loanInfo.data);
    // Layout: 8 disc + 32 borrower + 8 collateral_deposited + 8 borrowed_amount + ...
    if (buf.length >= 56) {
      defaults.collateralDeposited = readU64LE(buf, 40);
      defaults.borrowedAmount = readU64LE(buf, 48);
    }
  }

  return defaults;
}
