import { PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import { DLMM_PROGRAM_ID, DEMO_POOL_ADDRESS } from "./lp-constants";

const MAX_BIN_PER_ARRAY = 70;

/** Write a signed 64-bit int as little-endian into an 8-byte buffer (two's complement). */
function writeI64LE(value: bigint): Buffer {
  const mask = (1n << 64n) - 1n;
  const unsigned = value < 0n ? (value + (1n << 64n)) & mask : value & mask;
  const buf = Buffer.alloc(8);
  let v = unsigned;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
}

/** Derive DLMM bin array PDA — uses two's complement i64 LE for negative indices */
export function deriveBinArrayPda(lbPair: PublicKey, index: number): PublicKey {
  const indexBuf = writeI64LE(BigInt(index));
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("bin_array"), lbPair.toBuffer(), indexBuf],
    DLMM_PROGRAM_ID
  );
  return addr;
}

/** Derive DLMM event authority PDA */
export function deriveEventAuthority(): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    DLMM_PROGRAM_ID
  );
  return addr;
}

/** Derive DLMM bitmap extension PDA */
export function deriveBitmapExtension(lbPair: PublicKey): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [Buffer.from("bitmap"), lbPair.toBuffer()],
    DLMM_PROGRAM_ID
  );
  return addr;
}

/** Calculate bin array index from bin ID */
export function binArrayIndex(binId: number): number {
  return Math.floor(binId / MAX_BIN_PER_ARRAY);
}

/** Get compute budget instruction for DLMM transactions */
export function dlmmComputeBudget(units: number = 800_000) {
  return ComputeBudgetProgram.setComputeUnitLimit({ units });
}

/** Get all DLMM-related account addresses for a given position range */
export function getDlmmAccounts(lowerBinId: number, width: number) {
  const upperBinId = lowerBinId + width - 1;
  const lowerIdx = binArrayIndex(lowerBinId);
  const upperIdx = binArrayIndex(upperBinId);

  return {
    binArrayLower: deriveBinArrayPda(DEMO_POOL_ADDRESS, lowerIdx),
    binArrayUpper: deriveBinArrayPda(DEMO_POOL_ADDRESS, upperIdx),
    eventAuthority: deriveEventAuthority(),
    bitmapExtension: DLMM_PROGRAM_ID, // placeholder when not needed
  };
}
