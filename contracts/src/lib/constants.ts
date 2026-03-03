import { u256 } from '@btc-vision/as-bignum/assembly';

/** Position states */
export const POSITION_ACTIVE: u256 = u256.One;
export const POSITION_CANCELLED: u256 = u256.Zero;

/** Position types */
export const POSITION_TYPE_TOKEN: u256 = u256.Zero; // OP20-to-OP20 via MotoSwap
export const POSITION_TYPE_BTC: u256 = u256.One; // BTC-to-Token via NativeSwap

/** Minimum interval between executions: 6 blocks (~1 hour) */
export const MIN_INTERVAL_BLOCKS: u256 = u256.fromU64(6);

/** Maximum interval: 4320 blocks (~30 days) */
export const MAX_INTERVAL_BLOCKS: u256 = u256.fromU64(4320);

/** Minimum amount per execution: 1 token unit (prevents dust) */
export const MIN_AMOUNT_PER_EXEC: u256 = u256.One;

/** Maximum slippage the keeper can pass: 50% = 5000 bps */
export const MAX_SLIPPAGE_BPS: u256 = u256.fromU64(5000);

/** Basis points denominator */
export const BPS_DENOMINATOR: u256 = u256.fromU64(10000);

/** Fee: 0.25% (25 bps) on OP20→OP20 swap output */
export const OP20_FEE_BPS: u256 = u256.fromU64(25);

/** Fee: 0.75% (75 bps) on BTC→Token swap (keeper deducts from sats) */
export const BTC_FEE_BPS: u256 = u256.fromU64(75);

/**
 * MotoSwap router swap function signature.
 * Uses swapExactTokensForTokensSupportingFeeOnTransferTokens — the ONLY swap
 * function on the MotoSwap router. Returns void (no output), so we use
 * balance-before/after to compute amountOut.
 *
 * NOTE: All selectors use encodeSelector() which computes SHA256[:4] — NOT
 * keccak256 like EVM. Never hardcode EVM selectors!
 */
export const SWAP_FEE_ON_TRANSFER_SIGNATURE: string =
    'swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256,uint256,address[],address,uint64)';
