/**
 * BitDCA Keeper Configuration
 *
 * All sensitive values MUST be set via environment variables.
 * Copy .env.example to .env and fill in the values.
 */

function requireEnv(name: string, fallback?: string): string {
    const val = process.env[name] ?? fallback;
    if (!val) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return val;
}

function requirePositiveInt(name: string, fallback: string): number {
    const val = parseInt(process.env[name] ?? fallback, 10);
    if (isNaN(val) || val <= 0) {
        throw new Error(`${name} must be a positive integer, got: ${process.env[name]}`);
    }
    return val;
}

function requirePositiveBigInt(name: string, fallback: string): bigint {
    const raw = process.env[name] ?? fallback;
    const val = BigInt(raw);
    if (val <= 0n) {
        throw new Error(`${name} must be a positive value, got: ${raw}`);
    }
    return val;
}

export const config = {
    /** OPNet RPC endpoint (default: testnet) */
    rpcUrl: requireEnv('RPC_URL', 'https://testnet.opnet.org'),

    /** Network: 'regtest' | 'testnet' | 'mainnet' */
    network: requireEnv('NETWORK', 'testnet'),

    /** DCAVault contract address (REQUIRED — set after deployment) */
    dcaVaultAddress: requireEnv('DCA_VAULT_ADDRESS'),

    /** MotoSwap router address — hex format */
    routerAddress: requireEnv(
        'ROUTER_ADDRESS',
        '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f',
    ),

    /** Keeper wallet mnemonic (REQUIRED — NEVER hardcode in production!) */
    mnemonic: requireEnv('KEEPER_MNEMONIC'),

    /** Poll interval in ms (min: 5000) */
    pollIntervalMs: Math.max(5000, requirePositiveInt('POLL_INTERVAL_MS', '30000')),

    /** Slippage tolerance in percent (1-50) */
    slippagePercent: (() => {
        const val = requirePositiveInt('SLIPPAGE_PERCENT', '5');
        if (val > 50) throw new Error('SLIPPAGE_PERCENT must be <= 50');
        return val;
    })(),

    /** Max sats to spend per execution TX */
    maxSatsPerTx: requirePositiveBigInt('MAX_SATS_PER_TX', '50000'),

    /** Fee rate sat/vB */
    feeRate: requirePositiveInt('FEE_RATE', '10'),

    /** NativeSwap contract address (for BTC→Token DCA) — optional */
    nativeSwapAddress: process.env.NATIVE_SWAP_ADDRESS ?? '',

    /** NativeSwap reserve activation delay (blocks) */
    reserveActivationDelay: parseInt(process.env.RESERVE_ACTIVATION_DELAY ?? '0', 10),
};
