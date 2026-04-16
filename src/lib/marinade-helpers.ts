import { PublicKey } from "@solana/web3.js";
import { MARINADE_PROGRAM_ID, MARINADE_STATE } from "./lp-constants";

/** Derive Marinade reserve PDA */
export function deriveMarinadeReserve(): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [MARINADE_STATE.toBuffer(), Buffer.from("reserve")],
    MARINADE_PROGRAM_ID
  );
  return addr;
}

/** Derive Marinade liq pool SOL leg PDA */
export function deriveLiqSolLeg(): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [MARINADE_STATE.toBuffer(), Buffer.from("liq_sol")],
    MARINADE_PROGRAM_ID
  );
  return addr;
}

/** Derive Marinade liq pool mSOL leg authority PDA */
export function deriveLiqMsolLegAuth(): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [MARINADE_STATE.toBuffer(), Buffer.from("liq_st_sol_authority")],
    MARINADE_PROGRAM_ID
  );
  return addr;
}

/** Derive mSOL mint authority PDA */
export function deriveMsolMintAuth(): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [MARINADE_STATE.toBuffer(), Buffer.from("st_mint")],
    MARINADE_PROGRAM_ID
  );
  return addr;
}
