/**
 * BitDCA Keeper Bot
 *
 * Monitors DCA positions and triggers executions when intervals elapse.
 * Uses MotoSwap getAmountsOut for slippage calculation before executing.
 */

import 'dotenv/config';
import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

import { config } from './config.js';
import {
    JSONRpcProvider,
    getContract,
    ABIDataTypes,
    BitcoinAbiTypes,
    MOTOSWAP_ROUTER_ABI,
    NativeSwapAbi,
    type BitcoinInterfaceAbi,
} from 'opnet';
import {
    Mnemonic,
    AddressTypes,
    Address,
} from '@btc-vision/transaction';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks } from '@btc-vision/bitcoin';

// ── DCAVault ABI (partial — only what keeper needs) ────────────────────

const DCA_VAULT_ABI: BitcoinInterfaceAbi = [
    {
        name: 'getStats',
        type: BitcoinAbiTypes.Function,
        inputs: [],
        outputs: [
            { name: 'nextPositionId', type: ABIDataTypes.UINT256 },
            { name: 'totalPositions', type: ABIDataTypes.UINT256 },
            { name: 'activePositions', type: ABIDataTypes.UINT256 },
            { name: 'totalExecutions', type: ABIDataTypes.UINT256 },
            { name: 'totalVolume', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'getPosition',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenIn', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'amountPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'lastExecBlock', type: ABIDataTypes.UINT256 },
            { name: 'totalExecs', type: ABIDataTypes.UINT256 },
            { name: 'totalSpent', type: ABIDataTypes.UINT256 },
            { name: 'totalReceived', type: ABIDataTypes.UINT256 },
            { name: 'depositRemaining', type: ABIDataTypes.UINT256 },
            { name: 'active', type: ABIDataTypes.UINT256 },
            { name: 'createdBlock', type: ABIDataTypes.UINT256 },
            { name: 'posType', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: 'executeDCA',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'minAmountOut', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'amountOut', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'executeBTCDCA',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'positionId', type: ABIDataTypes.UINT256 },
            { name: 'amountOut', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'recorded', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'createBTCPosition',
        type: BitcoinAbiTypes.Function,
        inputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'tokenOut', type: ABIDataTypes.ADDRESS },
            { name: 'satsPerExec', type: ABIDataTypes.UINT256 },
            { name: 'intervalBlocks', type: ABIDataTypes.UINT256 },
            { name: 'totalSatsDeposit', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'positionId', type: ABIDataTypes.UINT256 }],
    },
];

// ── Logging ──────────────────────────────────────────────────────────────

function log(msg: string): void {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] ${msg}`);
}

function logError(msg: string, err?: unknown): void {
    const ts = new Date().toISOString().slice(11, 19);
    console.error(`[${ts}] ERROR ${msg}`, err ?? '');
}

// ── Helpers ─────────────────────────────────────────────────────────────

function extractTxId(receipt: Record<string, unknown>): string {
    const id = receipt.transactionId ?? receipt.txid;
    if (typeof id !== 'string' || !id) {
        throw new Error(`Failed to extract transaction ID from receipt: ${JSON.stringify(receipt)}`);
    }
    return id;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    console.log('');
    console.log('  ╔════════════════════════════════════════╗');
    console.log('  ║   BitDCA Keeper Bot v1.1               ║');
    console.log('  ╚════════════════════════════════════════╝');
    console.log('');

    // 1. Determine network
    const network =
        config.network === 'testnet'
            ? networks.opnetTestnet
            : config.network === 'mainnet'
              ? networks.bitcoin
              : networks.regtest;

    // 2. Init wallet
    log('Restoring keeper wallet...');
    const wallet = new Mnemonic(
        config.mnemonic,
        '',
        network,
        MLDSASecurityLevel.LEVEL2,
    ).deriveOPWallet(AddressTypes.P2TR, 0);
    log(`  Keeper address: ${wallet.p2tr}`);

    // 3. Init provider
    log('Connecting to OPNet...');
    const provider = new JSONRpcProvider({ url: config.rpcUrl, network });
    const blockNumber = await provider.getBlockNumber();
    log(`  Block: ${blockNumber}`);
    log(`  DCA Vault: ${config.dcaVaultAddress}`);
    log(`  Router:    ${config.routerAddress}`);

    // 4. Get contract proxies
    const dcaVault = getContract<any>(
        config.dcaVaultAddress,
        DCA_VAULT_ABI,
        provider,
        network,
    );
    dcaVault.setSender(wallet.address);

    const router = getContract<any>(
        config.routerAddress,
        MOTOSWAP_ROUTER_ABI,
        provider,
        network,
    );

    // NativeSwap proxy (for BTC→Token DCA)
    let nativeSwap: any = null;
    if (config.nativeSwapAddress) {
        nativeSwap = getContract<any>(
            config.nativeSwapAddress,
            NativeSwapAbi,
            provider,
            network,
        );
        nativeSwap.setSender(wallet.address);
        log(`  NativeSwap: ${config.nativeSwapAddress}`);
    } else {
        log('  NativeSwap: not configured (BTC->Token DCA disabled)');
    }

    // 5. Main loop with exponential backoff on consecutive errors
    log(`Starting poll loop (every ${config.pollIntervalMs / 1000}s)...`);
    console.log('');

    let consecutiveErrors = 0;
    const MAX_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes max backoff

    while (true) {
        try {
            await pollAndExecute(dcaVault, router, nativeSwap, provider, wallet, network);
            consecutiveErrors = 0; // Reset on success
        } catch (err) {
            consecutiveErrors++;
            const backoffMs = Math.min(
                config.pollIntervalMs * Math.pow(2, consecutiveErrors - 1),
                MAX_BACKOFF_MS,
            );
            logError(`Poll cycle failed (${consecutiveErrors} consecutive). Next retry in ${Math.round(backoffMs / 1000)}s:`, err);
            await sleep(backoffMs);
            continue;
        }
        await sleep(config.pollIntervalMs);
    }
}

async function pollAndExecute(
    dcaVault: any,
    router: any,
    nativeSwap: any,
    provider: JSONRpcProvider,
    wallet: any,
    network: any,
): Promise<void> {
    // Get current block
    const currentBlock = await provider.getBlockNumber();

    // Get stats to know how many positions exist
    const stats = await dcaVault.getStats();
    const nextId = stats.properties.nextPositionId as bigint;
    const activeCount = stats.properties.activePositions as bigint;

    if (activeCount === 0n) {
        log(`Block ${currentBlock} | No active positions`);
        return;
    }

    log(`Block ${currentBlock} | Scanning ${nextId - 1n} positions (${activeCount} active)...`);

    // Scan all positions
    for (let id = 1n; id < nextId; id++) {
        try {
            const pos = await dcaVault.getPosition(id);
            const props = pos.properties;

            const active = props.active as bigint;
            if (active !== 1n) continue;

            const lastExecBlock = props.lastExecBlock as bigint;
            const intervalBlocks = props.intervalBlocks as bigint;
            const amountPerExec = props.amountPerExec as bigint;
            const depositRemaining = props.depositRemaining as bigint;
            const posType = (props.posType as bigint) ?? 0n;

            // Check if interval has elapsed
            const blocksSince = BigInt(currentBlock) - lastExecBlock;
            if (blocksSince < intervalBlocks) {
                const blocksLeft = intervalBlocks - blocksSince;
                log(`  Position #${id}: ${blocksLeft} blocks until next exec`);
                continue;
            }

            // Check deposit
            if (depositRemaining < amountPerExec) {
                log(`  Position #${id}: Deposit exhausted`);
                continue;
            }

            if (posType === 1n) {
                // ── BTC→Token via NativeSwap ──
                await executeBTCPosition(id, props, dcaVault, nativeSwap, provider, wallet, network);
            } else {
                // ── Token→Token via MotoSwap ──
                await executeTokenPosition(id, props, dcaVault, router, wallet, network);
            }
        } catch (posErr) {
            logError(`  Position #${id} error:`, posErr);
        }

        // Small delay between positions to avoid rate limits
        await sleep(200);
    }
}

/**
 * Execute a Token→Token position via MotoSwap (existing flow).
 */
async function executeTokenPosition(
    id: bigint,
    props: any,
    dcaVault: any,
    router: any,
    wallet: any,
    network: any,
): Promise<void> {
    const amountPerExec = props.amountPerExec as bigint;
    const tokenIn = props.tokenIn;
    const tokenOut = props.tokenOut;

    log(`  Position #${id} [TOKEN]: DUE! Executing swap of ${amountPerExec}...`);

    // Get quote from MotoSwap for slippage calc
    let minAmountOut = 0n;
    try {
        const path = [
            Address.fromString(tokenIn.toString()),
            Address.fromString(tokenOut.toString()),
        ];
        const quote = await router.getAmountsOut(amountPerExec, path);
        const amountsOut = quote.properties.amountsOut as bigint[];
        const expectedOut = amountsOut[1];
        const slippageMul = BigInt(100 - config.slippagePercent);
        minAmountOut = (expectedOut * slippageMul) / 100n;
        log(`    Quote: ${expectedOut} (min: ${minAmountOut})`);
    } catch (quoteErr) {
        logError(`    Quote failed, skipping position #${id} to avoid bad execution:`, quoteErr);
        return;
    }

    if (minAmountOut === 0n) {
        logError(`    Quote returned zero output, skipping position #${id}`);
        return;
    }

    // Simulate execution
    const sim = await dcaVault.executeDCA(id, minAmountOut);
    if (sim.revert) {
        logError(`    Simulation reverted: ${sim.revert}`);
        return;
    }

    // Send
    const receipt = await sim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: config.maxSatsPerTx,
        network,
        feeRate: config.feeRate,
    });

    const txId = extractTxId(receipt);
    log(`    Executed! TX: ${txId}`);
}

/**
 * Execute a BTC→Token position via NativeSwap two-phase commit.
 *
 * Phase 1: reserve() — locks price, returns LP payment recipients
 * Phase 2: swap() — pays LPs via extraOutputs, receives tokens
 * Phase 3: executeBTCDCA() — records result on-chain in DCAVault
 */
async function executeBTCPosition(
    id: bigint,
    props: any,
    dcaVault: any,
    nativeSwap: any,
    provider: JSONRpcProvider,
    wallet: any,
    network: any,
): Promise<void> {
    if (!nativeSwap) {
        log(`  Position #${id} [BTC]: NativeSwap not configured, skipping`);
        return;
    }

    const satsPerExec = props.amountPerExec as bigint;
    const tokenOut = props.tokenOut;

    // Deduct 0.75% BTC fee (75 bps) — keeper retains this as protocol revenue
    const BTC_FEE_BPS = 75n;
    const feeAmount = (satsPerExec * BTC_FEE_BPS) / 10000n;
    const satsForSwap = satsPerExec - feeAmount;

    log(`  Position #${id} [BTC]: DUE! NativeSwap swap of ${satsForSwap} sats (fee: ${feeAmount} sats)...`);

    // ── Phase 1: Reserve ──
    log(`    Phase 1: Reserving liquidity...`);

    // Get quote for slippage calculation (using sats after fee deduction)
    let minimumAmountOut = 0n;
    try {
        const tokenOutAddr = Address.fromString(tokenOut.toString());
        const quote = await nativeSwap.getQuote(tokenOutAddr, satsForSwap);
        if (!quote.revert) {
            const expectedOut = quote.properties.expectedAmountOut as bigint;
            const slippageMul = BigInt(100 - config.slippagePercent);
            minimumAmountOut = (expectedOut * slippageMul) / 100n;
            log(`    Quote: ${expectedOut} tokens (min: ${minimumAmountOut})`);
        }
    } catch (quoteErr) {
        logError(`    Quote failed, skipping position #${id}:`, quoteErr);
        return;
    }

    if (minimumAmountOut === 0n) {
        logError(`    Quote returned zero output, skipping position #${id}`);
        return;
    }

    // Simulate reserve
    const tokenOutAddr = Address.fromString(tokenOut.toString());
    const reserveSim = await nativeSwap.reserve(
        tokenOutAddr,
        satsForSwap,
        minimumAmountOut,
        BigInt(config.reserveActivationDelay),
    );

    if (reserveSim.revert) {
        logError(`    Reserve simulation reverted: ${reserveSim.revert}`);
        return;
    }

    // Send reserve transaction
    const reserveReceipt = await reserveSim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: config.maxSatsPerTx,
        network,
        feeRate: config.feeRate,
    });

    const reserveTxId = extractTxId(reserveReceipt);
    log(`    Reserve TX: ${reserveTxId}`);

    // Wait for reserve confirmation
    log(`    Waiting for reserve confirmation...`);
    const reserveTxResult = await waitForConfirmation(provider, reserveTxId);
    if (!reserveTxResult) {
        logError(`    Reserve tx not confirmed after timeout`);
        return;
    }

    // Parse LiquidityReserved events to get LP payment addresses
    const events = reserveTxResult.events ?? [];
    const lpPayments: Array<{ address: string; amount: bigint }> = [];

    for (const evt of events) {
        if (evt.eventType === 'LiquidityReserved' || evt.type === 'LiquidityReserved') {
            const vals = evt.values ?? evt.properties ?? {};
            const depositAddr = vals.depositAddress?.toString() ?? '';
            const satsAmount = (vals.satoshisAmount as bigint) ?? 0n;
            if (depositAddr && satsAmount > 0n) {
                lpPayments.push({ address: depositAddr, amount: satsAmount });
            }
        }
    }

    if (lpPayments.length === 0) {
        logError(`    No LiquidityReserved events found in reserve receipt`);
        return;
    }

    log(`    Found ${lpPayments.length} LP payment(s)`);

    // ── Phase 2: Swap (with LP payments as extraOutputs) ──
    log(`    Phase 2: Executing swap with LP payments...`);

    // Build extraOutputs for LP payments
    const extraOutputs = lpPayments.map((lp) => ({
        to: lp.address,
        value: Number(lp.amount),
    }));

    // Set transaction details before simulation (index 0 is reserved)
    nativeSwap.setTransactionDetails({
        outputs: extraOutputs.map((o) => ({
            address: o.to,
            value: o.value,
        })),
    });

    // Simulate swap
    const swapSim = await nativeSwap.swap(tokenOutAddr);
    if (swapSim.revert) {
        logError(`    Swap simulation reverted: ${swapSim.revert}`);
        return;
    }

    // Send swap with LP payments
    const swapReceipt = await swapSim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: config.maxSatsPerTx + satsPerExec,
        network,
        feeRate: config.feeRate,
        extraOutputs,
    });

    const swapTxId = extractTxId(swapReceipt);
    log(`    Swap TX: ${swapTxId}`);

    // Wait for swap confirmation and parse amountOut
    log(`    Waiting for swap confirmation...`);
    const swapTxResult = await waitForConfirmation(provider, swapTxId);
    if (!swapTxResult) {
        logError(`    Swap tx not confirmed after timeout`);
        return;
    }

    // Parse SwapExecuted event for actual amountOut
    let amountOut = 0n;
    const swapEvents = swapTxResult.events ?? [];
    for (const evt of swapEvents) {
        if (evt.eventType === 'SwapExecuted' || evt.type === 'SwapExecuted') {
            const vals = evt.values ?? evt.properties ?? {};
            amountOut = (vals.amountOut as bigint) ?? (vals.tokensReceived as bigint) ?? 0n;
            break;
        }
    }

    if (amountOut === 0n) {
        // Fallback: use simulation result, but validate it's reasonable
        const simAmountOut = swapSim.properties?.amountOut as bigint | undefined;
        if (simAmountOut && simAmountOut > 0n) {
            amountOut = simAmountOut;
            log(`    No SwapExecuted event, using simulation amountOut: ${amountOut}`);
        } else {
            logError(`    Swap produced zero output, aborting on-chain record for position #${id}`);
            return;
        }
    } else {
        log(`    Swap result: ${amountOut} tokens received`);
    }

    // ── Phase 3: Record on-chain via executeBTCDCA ──
    log(`    Phase 3: Recording execution on-chain...`);

    const recordSim = await dcaVault.executeBTCDCA(id, amountOut);
    if (recordSim.revert) {
        logError(`    executeBTCDCA simulation reverted: ${recordSim.revert}`);
        return;
    }

    const recordReceipt = await recordSim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: config.maxSatsPerTx,
        network,
        feeRate: config.feeRate,
    });

    const recordTxId = extractTxId(recordReceipt);
    log(`    BTC DCA recorded! TX: ${recordTxId}`);
}

/**
 * Wait for a transaction to be confirmed on-chain.
 * Polls getTransactionReceipt every 5s, up to 30 attempts (~2.5 min).
 */
async function waitForConfirmation(
    provider: JSONRpcProvider,
    txId: string,
    maxAttempts = 30,
    intervalMs = 5000,
): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
        await sleep(intervalMs);
        try {
            const receipt = await provider.getTransactionReceipt(txId);
            if (receipt) return receipt;
        } catch {
            // Not found yet, keep polling
        }
    }
    return null;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Start ────────────────────────────────────────────────────────────────

main().catch((err) => {
    console.error('\n  Keeper crashed:\n');
    console.error(err);
    process.exit(1);
});
