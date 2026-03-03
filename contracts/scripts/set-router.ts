#!/usr/bin/env tsx
/**
 * BitDCA — Update Router Address on Deployed DCAVault
 *
 * Calls setRouter(newRouter) on the deployed DCAVault contract.
 * Only the deployer (contract owner) can call this.
 *
 * Usage:
 *   cd contracts
 *   NETWORK=testnet npx tsx scripts/set-router.ts
 *
 * Environment:
 *   NETWORK          — regtest | testnet (default: testnet)
 *   RPC_URL          — OPNet RPC (default: auto from NETWORK)
 *   DCA_VAULT_ADDRESS — Deployed DCAVault address
 *   NEW_ROUTER       — New MotoSwap router hex address
 *   DEPLOYER_MNEMONIC — Wallet mnemonic (must be deployer)
 */

import { setDefaultResultOrder } from 'node:dns';
setDefaultResultOrder('ipv4first');

import {
    Mnemonic,
    AddressTypes,
    Address,
} from '@btc-vision/transaction';
import {
    JSONRpcProvider,
    getContract,
    ABIDataTypes,
    BitcoinAbiTypes,
    type BitcoinInterfaceAbi,
} from 'opnet';
import { MLDSASecurityLevel } from '@btc-vision/bip32';
import { networks, type Network } from '@btc-vision/bitcoin';

// ── Configuration ─────────────────────────────────────────────────────────

const NETWORK = process.env.NETWORK ?? 'testnet';

const RPC_URLS: Record<string, string> = {
    regtest: 'https://regtest.opnet.org',
    testnet: 'https://testnet.opnet.org',
};

const ROUTER_TESTNET =
    '0xa02aa5ca4c307107484d5fb690d811df1cf526f8de204d24528653dcae369a0f';

const DCA_VAULT =
    process.env.DCA_VAULT_ADDRESS ?? 'opt1sqrn38x90fcjylzsttvaarkmtq8fevm2dtg99v63v';

const NEW_ROUTER = process.env.NEW_ROUTER ?? ROUTER_TESTNET;

const MNEMONIC_PHRASE =
    process.env.DEPLOYER_MNEMONIC ??
    'boring this wonder armor almost illegal front dance latin naive camp mushroom';

const FEE_RATE = parseInt(process.env.FEE_RATE ?? '10', 10);

// ── ABI (only setRouter) ──────────────────────────────────────────────────

const SET_ROUTER_ABI: BitcoinInterfaceAbi = [
    {
        name: 'setRouter',
        type: BitcoinAbiTypes.Function,
        inputs: [{ name: 'newRouter', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    },
];

// ── Main ──────────────────────────────────────────────────────────────────

function getNetwork(): Network {
    switch (NETWORK) {
        case 'testnet': return networks.opnetTestnet;
        case 'mainnet': return networks.bitcoin;
        default: return networks.regtest;
    }
}

async function main(): Promise<void> {
    const network = getNetwork();
    const rpcUrl = process.env.RPC_URL ?? RPC_URLS[NETWORK] ?? RPC_URLS.testnet;

    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════╗');
    console.log('  ║   BitDCA — setRouter Admin Call                      ║');
    console.log('  ╚══════════════════════════════════════════════════════╝');
    console.log('');

    // 1. Restore deployer wallet
    console.log('[1/3] Restoring deployer wallet...');
    const wallet = new Mnemonic(
        MNEMONIC_PHRASE,
        '',
        network,
        MLDSASecurityLevel.LEVEL2,
    ).deriveOPWallet(AddressTypes.P2TR, 0);
    console.log(`  Deployer: ${wallet.p2tr}`);
    console.log('');

    // 2. Connect
    console.log('[2/3] Connecting...');
    const provider = new JSONRpcProvider({ url: rpcUrl, network });
    const blockNumber = await provider.getBlockNumber();
    console.log(`  RPC:   ${rpcUrl}`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  Vault: ${DCA_VAULT}`);
    console.log(`  New Router: ${NEW_ROUTER}`);
    console.log('');

    // 3. Call setRouter
    console.log('[3/3] Calling setRouter...');

    const vault = getContract<any>(
        DCA_VAULT,
        SET_ROUTER_ABI,
        provider,
        network,
    );
    vault.setSender(wallet.address);

    // Simulate
    const routerAddress = Address.fromString(NEW_ROUTER);
    const sim = await vault.setRouter(routerAddress);

    if (sim.revert) {
        throw new Error(`Simulation reverted: ${sim.revert}`);
    }

    console.log('  Simulation OK');

    // Send
    const receipt = await sim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: 50000n,
        network,
        feeRate: FEE_RATE,
    });

    console.log(`  TX: ${receipt.transactionId}`);
    console.log('');
    console.log('  Router updated successfully!');
    console.log('');
}

main().catch((err) => {
    console.error('\n  setRouter failed:\n');
    console.error(err);
    process.exit(1);
});
