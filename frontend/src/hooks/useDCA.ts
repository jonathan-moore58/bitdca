import { useQuery } from '@tanstack/react-query';
import { getDCAVault, getBlockNumber } from '../services/ContractService';
import { useWallet } from './useWallet';
import { DCA_VAULT_ADDRESS } from '../config/contracts';

// ── Types ──────────────────────────────────────────────────────────────────
export interface DCAStats {
    nextPositionId: bigint;
    totalPositions: bigint;
    activePositions: bigint;
    totalExecutions: bigint;
    totalVolume: bigint;
}

export interface DCAPosition {
    id: bigint;
    owner: string;
    tokenIn: string;
    tokenOut: string;
    amountPerExec: bigint;
    intervalBlocks: bigint;
    lastExecBlock: bigint;
    totalExecs: bigint;
    totalSpent: bigint;
    totalReceived: bigint;
    depositRemaining: bigint;
    active: boolean;
    createdBlock: bigint;
    /** 0 = Token→Token (MotoSwap), 1 = BTC→Token (NativeSwap) */
    posType: number;
}

// ── Global Stats ───────────────────────────────────────────────────────────
export function useDCAStats() {
    return useQuery<DCAStats | null>({
        queryKey: ['dca-stats'],
        queryFn: async () => {
            if (!DCA_VAULT_ADDRESS) return null;
            try {
                const vault = getDCAVault();
                const result = await vault.getStats();
                if (result.revert) {
                    console.warn('[DCA] getStats reverted:', result.revert);
                    return null;
                }
                const p = result.properties;
                console.log('[DCA] getStats:', {
                    nextPositionId: String(p.nextPositionId),
                    totalPositions: String(p.totalPositions),
                    activePositions: String(p.activePositions),
                });
                return {
                    nextPositionId: p.nextPositionId as bigint,
                    totalPositions: p.totalPositions as bigint,
                    activePositions: p.activePositions as bigint,
                    totalExecutions: p.totalExecutions as bigint,
                    totalVolume: p.totalVolume as bigint,
                };
            } catch (err) {
                console.error('[DCA] Failed to fetch stats:', err);
                return null;
            }
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
        enabled: !!DCA_VAULT_ADDRESS,
        retry: 2,
    });
}

// ── User Positions ─────────────────────────────────────────────────────────
export function useDCAPositions() {
    const { address, connected, addressObj } = useWallet();

    return useQuery<DCAPosition[]>({
        queryKey: ['dca-positions', address],
        queryFn: async () => {
            if (!DCA_VAULT_ADDRESS || !address) return [];

            const vault = getDCAVault(addressObj ?? undefined);
            const stats = await vault.getStats();
            if (stats.revert) {
                console.warn('[DCA] getStats reverted in positions fetch:', stats.revert);
                return [];
            }

            const nextId = stats.properties.nextPositionId as bigint;
            const positions: DCAPosition[] = [];

            // Get the wallet's address in hex for comparison with on-chain owner
            const myAddressHex = addressObj?.toString()?.toLowerCase() ?? '';
            console.log('[DCA] Fetching positions: nextId=%s, myAddress=%s', String(nextId), myAddressHex);

            for (let id = 1n; id < nextId; id++) {
                try {
                    const result = await vault.getPosition(id);
                    if (result.revert) {
                        console.warn('[DCA] getPosition(%s) reverted:', String(id), result.revert);
                        continue;
                    }
                    const p = result.properties;

                    // Address comparison: on-chain owner (hex from ABI) vs wallet address (hex via Address obj)
                    const ownerHex = p.owner?.toString()?.toLowerCase() ?? '';
                    console.log('[DCA] Position %s owner=%s vs my=%s match=%s', String(id), ownerHex, myAddressHex, ownerHex === myAddressHex);

                    // Show all positions for the connected wallet
                    if (!myAddressHex || ownerHex !== myAddressHex) continue;

                    positions.push({
                        id,
                        owner: ownerHex,
                        tokenIn: p.tokenIn?.toString() || '',
                        tokenOut: p.tokenOut?.toString() || '',
                        amountPerExec: p.amountPerExec as bigint,
                        intervalBlocks: p.intervalBlocks as bigint,
                        lastExecBlock: p.lastExecBlock as bigint,
                        totalExecs: p.totalExecs as bigint,
                        totalSpent: p.totalSpent as bigint,
                        totalReceived: p.totalReceived as bigint,
                        depositRemaining: p.depositRemaining as bigint,
                        active: (p.active as bigint) === 1n,
                        createdBlock: p.createdBlock as bigint,
                        posType: Number((p.posType as bigint) ?? 0n),
                    });
                } catch (err) {
                    console.error('[DCA] Error fetching position %s:', String(id), err);
                }
            }
            console.log('[DCA] Found %d matching positions out of %s total', positions.length, String(nextId - 1n));
            return positions;
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
        enabled: connected && !!address && !!DCA_VAULT_ADDRESS,
        retry: 2,
    });
}

// ── Single Position ────────────────────────────────────────────────────────
export function useDCAPosition(positionId: string | undefined) {
    const { addressObj } = useWallet();

    return useQuery<DCAPosition | null>({
        queryKey: ['dca-position', positionId],
        queryFn: async () => {
            if (!DCA_VAULT_ADDRESS || !positionId) return null;

            const vault = getDCAVault(addressObj ?? undefined);
            const id = BigInt(positionId);
            const result = await vault.getPosition(id);
            if (result.revert) return null;

            const p = result.properties;
            return {
                id,
                owner: p.owner?.toString() || '',
                tokenIn: p.tokenIn?.toString() || '',
                tokenOut: p.tokenOut?.toString() || '',
                amountPerExec: p.amountPerExec as bigint,
                intervalBlocks: p.intervalBlocks as bigint,
                lastExecBlock: p.lastExecBlock as bigint,
                totalExecs: p.totalExecs as bigint,
                totalSpent: p.totalSpent as bigint,
                totalReceived: p.totalReceived as bigint,
                depositRemaining: p.depositRemaining as bigint,
                active: (p.active as bigint) === 1n,
                createdBlock: p.createdBlock as bigint,
                posType: Number((p.posType as bigint) ?? 0n),
            };
        },
        staleTime: 10_000,
        refetchInterval: 20_000,
        enabled: !!positionId && !!DCA_VAULT_ADDRESS,
        retry: 2,
    });
}

// ── Current Block ──────────────────────────────────────────────────────────
export function useBlockNumber() {
    return useQuery<bigint>({
        queryKey: ['block-number'],
        queryFn: getBlockNumber,
        staleTime: 10_000,
        refetchInterval: 15_000,
    });
}
