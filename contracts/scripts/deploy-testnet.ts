#!/usr/bin/env tsx
/**
 * BitDCA — Contract Deployment Script (OPNet Testnet)
 *
 * Deploys the DCAVault contract with calldata:
 *   [routerAddress(u256), keeperAddress(u256), nativeSwapAddress(u256), feeRecipient(u256)]
 *
 * Usage:
 *   cd contracts
 *   NETWORK=testnet npx tsx scripts/deploy-testnet.ts
 */

import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    Mnemonic,
    TransactionFactory,
    BinaryWriter,
    AddressTypes,
    EcKeyPair,
} from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, type Network } from '@btc-vision/bitcoin';
import { bech32m } from 'bech32';

// ─── Configuration ─────────────────────────────────────────────────────────

const NETWORK = process.env.NETWORK ?? 'testnet';

const RPC_URLS: Record<string, string> = {
    regtest: 'https://regtest.opnet.org',
    testnet: 'https://testnet.opnet.org',
};

const ROUTER_ADDRESSES: Record<string, string> = {
    regtest: '0x80f8375d061d638a0b45a4eb4decbfd39e9abba913f464787194ce3c02d2ea5a',
    testnet: '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f',
};

const NATIVE_SWAP_ADDRESSES: Record<string, string> = {
    regtest: '0x0000000000000000000000000000000000000000000000000000000000000000',
    testnet: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

const MNEMONIC_PHRASE =
    process.env.DEPLOYER_MNEMONIC ??
    'boring this wonder armor almost illegal front dance latin naive camp mushroom';

const GAS_SAT_FEE = BigInt(process.env.GAS_FEE ?? '50000');
const FEE_RATE = parseInt(process.env.FEE_RATE ?? '10', 10);

// ─── Paths ─────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILD_DIR = path.resolve(__dirname, '..', 'build');

// ─── Utilities ─────────────────────────────────────────────────────────────

function getNetwork(): Network {
    switch (NETWORK) {
        case 'testnet': return networks.opnetTestnet;   // bech32: "opt" (Signet fork)
        case 'mainnet': return networks.bitcoin;
        default: return networks.regtest;
    }
}

function decodeOPNetAddress(addr: string): bigint {
    if (addr.startsWith('0x') || addr.startsWith('0X')) {
        return BigInt(addr);
    }
    const decoded = bech32m.decode(addr, addr.length);
    const rawBytes = bech32m.fromWords(decoded.words.slice(1));
    const padded = new Uint8Array(32);
    padded.set(rawBytes, 32 - rawBytes.length);
    let hex = '0x';
    for (const b of padded) hex += b.toString(16).padStart(2, '0');
    return BigInt(hex);
}

function padHex(n: bigint): string {
    return '0x' + n.toString(16).padStart(64, '0');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const network = getNetwork();
    const rpcUrl = process.env.RPC_URL ?? RPC_URLS[NETWORK] ?? RPC_URLS.testnet;
    const routerHex = process.env.ROUTER_ADDRESS ?? ROUTER_ADDRESSES[NETWORK] ?? ROUTER_ADDRESSES.testnet;
    const nativeSwapHex = process.env.NATIVE_SWAP_ADDRESS ?? NATIVE_SWAP_ADDRESSES[NETWORK] ?? NATIVE_SWAP_ADDRESSES.testnet;

    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════╗');
    console.log(`  ║   BitDCA — ${NETWORK.toUpperCase().padEnd(8)} Deployment                  ║`);
    console.log('  ╚══════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Restore wallet
    console.log('[1/4] Restoring wallet...');
    const wallet = new Mnemonic(
        MNEMONIC_PHRASE,
        '',
        network,
        MLDSASecurityLevel.LEVEL2,
    ).deriveOPWallet(AddressTypes.P2TR, 0);

    const deployerAddress = wallet.p2tr;
    console.log(`  Deployer: ${deployerAddress}`);

    // Keeper address (separate from deployer in production)
    const keeperAddress = process.env.KEEPER_ADDRESS ?? deployerAddress;
    console.log(`  Keeper:   ${keeperAddress}`);

    // Fee recipient address
    const feeRecipientAddress = process.env.FEE_RECIPIENT ?? deployerAddress;
    console.log(`  Fee To:   ${feeRecipientAddress}`);

    // P2OP address for smart contract interactions
    try {
        const p2opAddr = EcKeyPair.p2op(wallet._tweakedKey ?? wallet._bufferPubKey, network);
        console.log(`  P2OP:             ${p2opAddr}`);
    } catch { /* older version may not support p2op */ }
    console.log('');

    // 2. Connect
    console.log('[2/4] Connecting...');
    const provider = new JSONRpcProvider({ url: rpcUrl, network });
    const blockNumber = await provider.getBlockNumber();
    console.log(`  RPC:   ${rpcUrl}`);
    console.log(`  Block: ${blockNumber}`);
    console.log('');

    // 3. Load WASM
    console.log('[3/4] Loading bytecode...');
    const wasmPath = path.join(BUILD_DIR, 'DCAVault.wasm');
    if (!fs.existsSync(wasmPath)) {
        throw new Error(`Missing WASM: ${wasmPath}\n  Run 'npm run build' first.`);
    }
    const bytecode = new Uint8Array(fs.readFileSync(wasmPath));
    console.log(`  DCAVault.wasm — ${bytecode.length.toLocaleString()} bytes`);
    console.log('');

    // 4. Deploy
    console.log('[4/4] Deploying DCAVault...');

    const routerU256 = decodeOPNetAddress(routerHex);
    const keeperU256 = decodeOPNetAddress(keeperAddress);
    const nativeSwapU256 = decodeOPNetAddress(nativeSwapHex);
    const feeRecipientU256 = decodeOPNetAddress(feeRecipientAddress);

    console.log(`  Router u256:        ${padHex(routerU256)}`);
    console.log(`  Keeper u256:        ${padHex(keeperU256)}`);
    console.log(`  NativeSwap u256:    ${padHex(nativeSwapU256)}`);
    console.log(`  FeeRecipient u256:  ${padHex(feeRecipientU256)}`);

    const calldata = new BinaryWriter();
    calldata.writeU256(routerU256);
    calldata.writeU256(keeperU256);
    calldata.writeU256(nativeSwapU256);
    calldata.writeU256(feeRecipientU256);

    const utxos = await provider.utxoManager.getUTXOs({ address: deployerAddress });
    if (utxos.length === 0) {
        throw new Error(
            `No UTXOs. Fund this address on OPNet testnet:\n` +
            `  ${deployerAddress}\n\n` +
            `  Get testnet BTC from the OPNet faucet or Signet faucet.`,
        );
    }
    const totalSats = utxos.reduce((sum: bigint, u: { value: number }) => sum + BigInt(u.value), 0n);
    console.log(`  UTXOs: ${utxos.length} (${totalSats.toLocaleString()} sats)`);

    const txFactory = new TransactionFactory();
    const challenge = await provider.getChallenge();

    const deployment = await txFactory.signDeployment({
        from: deployerAddress,
        utxos,
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        network,
        feeRate: FEE_RATE,
        priorityFee: 0n,
        gasSatFee: GAS_SAT_FEE,
        bytecode,
        calldata: calldata.getBuffer(),
        challenge,
        linkMLDSAPublicKeyToAddress: true,
        revealMLDSAPublicKey: true,
    });

    console.log(`  Contract: ${deployment.contractAddress}`);

    const fundingResult = await provider.sendRawTransaction(deployment.transaction[0], false);
    const fid = typeof fundingResult === 'object'
        ? (fundingResult as Record<string, unknown>).result ?? JSON.stringify(fundingResult)
        : fundingResult;
    console.log(`  Funding TX: ${fid}`);

    const revealResult = await provider.sendRawTransaction(deployment.transaction[1], false);
    const rid = typeof revealResult === 'object'
        ? (revealResult as Record<string, unknown>).result ?? JSON.stringify(revealResult)
        : revealResult;
    console.log(`  Reveal TX:  ${rid}`);
    console.log('');
    console.log('  DCAVault deployed successfully!');
    console.log('');

    const outputPath = path.resolve(__dirname, '..', `deployed-${NETWORK}.json`);
    const output = {
        network: NETWORK,
        rpc: rpcUrl,
        contracts: { dcaVault: deployment.contractAddress },
        config: {
            router: routerHex,
            keeper: keeperAddress,
            keeperBtc: keeperAddress,
            nativeSwap: nativeSwapHex,
            feeRecipient: feeRecipientAddress,
        },
        deployedAt: new Date().toISOString(),
    };
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`  Saved to: ${outputPath}`);
    console.log('');
    console.log('  NEXT STEPS:');
    console.log(`  1. Update DCA_VAULT_ADDRESS in frontend/src/config/contracts.ts`);
    console.log(`     with: ${deployment.contractAddress}`);
    console.log('  2. Set DCA_VAULT_ADDRESS env var for keeper bot');
    console.log('  3. Run: cd keeper && npm start');
    console.log('');
}

main().catch((err) => {
    console.error('\n  Deployment failed:\n');
    console.error(err);
    process.exit(1);
});
