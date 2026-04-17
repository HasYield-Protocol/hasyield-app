import { PublicKey } from "@solana/web3.js";

// Meteora DLMM
export const DLMM_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
export const DEMO_POOL_ADDRESS = new PublicKey("EUcPNLCoVFb4YTM87m4Kudv3PAG71k5wGxy2Pug5YknE");

// Token mints — pool order: X = USDC, Y = SOL
export const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

// HasYield programs
export const LP_VAULT_PROGRAM_ID = new PublicKey("BH6rAqBajhmzjVPoSqyvuyhCphGVWfKGAD7wXwJU9Y7T");
export const LENDING_PROGRAM_ID = new PublicKey("J9cqrTyPAajYNUp5ayDQBso7mMAwyatNg7VMpx8wbzwf");

// Vault state (from devnet deployment)
export const LP_VAULT_CONFIG = new PublicKey("5hAGZFirTf7yB9MAfF4MN2iyQ89xDjSewymBAJ5gKZ21");
export const HYLP_MINT = new PublicKey("58WoS25fsv2Pod6LkcuvrsF5p19YFfavmaAJAjRuvvMF");

// DLMM position and derived accounts
export const DLMM_POSITION = new PublicKey("F3uAc3cjmyRQAvDae2DygXHmmKowhPhZmtzqb1yEanGg");
export const DLMM_RESERVE_X = new PublicKey("521wLNU817BuvNuGQbfy8qi3hvSLxRw5vMuHjbMALpit");
export const DLMM_RESERVE_Y = new PublicKey("FLMEkRb9LUk3tsh4RhrgMMi4MLDQkTgrtVApHEQ89L9j");

// Vault position config
export const POSITION_LOWER_BIN_ID = -34;
export const POSITION_WIDTH = 69;
export const ACTIVE_ID = 0;

// Lending pool (hyLP collateral, test USDC borrow)
export const LENDING_POOL = new PublicKey("ATqRiY6Ug65qZaeunp9sbQwGCV9aCqAmgJHo7i62MHke");
export const TEST_USDC_MINT = new PublicKey("EhdjGXnVoVyvCEvbZA421VGZ4PxE1aVWU4RiT8dpb51h");

// Marinade Finance
export const MARINADE_PROGRAM_ID = new PublicKey("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD");
export const MARINADE_STATE = new PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC");
export const MSOL_MINT = new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So");
export const LIQ_POOL_MSOL_LEG = new PublicKey("7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE");
