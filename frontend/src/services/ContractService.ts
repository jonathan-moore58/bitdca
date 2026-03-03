import { JSONRpcProvider, getContract, type AbstractRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { Address } from '@btc-vision/transaction';
import {
    DCA_VAULT_ADDRESS,
    DCA_VAULT_ABI,
    OP20_ABI,
    RPC_URL,
} from '../config/contracts';

// OPNet testnet (Signet fork) — MUST use opnetTestnet, NOT testnet (Testnet4)
const network = networks.opnetTestnet;

let _provider: JSONRpcProvider | null = null;

export function getProvider(): JSONRpcProvider {
    if (!_provider) {
        // JSONRpcProvider takes positional args: (url, network, timeout?)
        _provider = new JSONRpcProvider(RPC_URL, network);
    }
    return _provider;
}

export function getNetwork() {
    return network;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const contractCache = new Map<string, ReturnType<typeof getContract<any>>>();

/**
 * Get the DCA Vault contract instance.
 * Uses getContract<any> because methods are defined dynamically from ABI at runtime.
 * sender accepts unknown to handle duplicate @btc-vision/transaction Address types
 * between direct dep and walletconnect's nested dep.
 *
 * provider — pass the WalletConnect provider for write operations (sendTransaction).
 * Without it, the default JSONRpcProvider is used (read-only, suitable for simulations/queries).
 * Write-mode contracts are NOT cached because the provider may change between sessions.
 */
export function getDCAVault(sender?: unknown, provider?: AbstractRpcProvider) {
    const addr = DCA_VAULT_ADDRESS;
    if (!addr) throw new Error('DCA_VAULT_ADDRESS not set');

    // Write-mode: create a fresh contract with the wallet provider
    if (provider) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = getContract<any>(addr, DCA_VAULT_ABI, provider, network);
        // Cast via any to bridge duplicate @btc-vision/transaction Address types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sender) c.setSender(sender as any);
        return c;
    }

    // Read-only mode: cached with JSONRpcProvider
    const key = `dca-${addr}`;
    if (!contractCache.has(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = getContract<any>(addr, DCA_VAULT_ABI, getProvider(), network);
        contractCache.set(key, c);
    }
    const contract = contractCache.get(key);
    if (!contract) throw new Error('Failed to get DCA vault contract');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (sender) contract.setSender(sender as any);
    return contract;
}

/**
 * Get an OP20 token contract instance.
 * Uses getContract<any> because methods are defined dynamically from ABI at runtime.
 * sender accepts unknown for same reason as getDCAVault.
 *
 * provider — pass the WalletConnect provider for write operations.
 */
export function getOP20(tokenAddress: string, sender?: unknown, provider?: AbstractRpcProvider) {
    // Write-mode: fresh contract with wallet provider
    if (provider) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = getContract<any>(tokenAddress, OP20_ABI, provider, network);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sender) c.setSender(sender as any);
        return c;
    }

    // Read-only mode: cached with JSONRpcProvider
    const key = `op20-${tokenAddress}`;
    if (!contractCache.has(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = getContract<any>(tokenAddress, OP20_ABI, getProvider(), network);
        contractCache.set(key, c);
    }
    const contract = contractCache.get(key);
    if (!contract) throw new Error('Failed to get OP20 contract');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (sender) contract.setSender(sender as any);
    return contract;
}

/**
 * Convert a hex address string (0x...) to an Address object.
 * Required because opnet contract methods expect Address objects, not raw strings.
 *
 * Address.fromString() is the primary factory method — its first parameter is
 * the 32-byte ML-DSA public-key hash in hex (0x-prefixed OK). For contract
 * addresses the 0x hex IS that hash, so a single parameter suffices (no legacy
 * public key needed). This matches how the opnet SDK itself constructs
 * addresses internally (Contract.js → Address.fromString(this.address)).
 */
export function toAddress(addr: string): Address {
    return Address.fromString(addr);
}

export async function getBlockNumber(): Promise<bigint> {
    try {
        const provider = getProvider();
        return BigInt(await provider.getBlockNumber());
    } catch (err) {
        console.error('[ContractService] Failed to get block number:', err);
        throw new Error('Failed to connect to OPNet RPC. Check your network connection.');
    }
}
