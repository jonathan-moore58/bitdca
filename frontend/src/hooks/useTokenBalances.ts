import { useQuery } from '@tanstack/react-query';
import { useWallet } from './useWallet';
import { getOP20 } from '../services/ContractService';
import { KNOWN_TOKENS } from '../config/contracts';

export interface TokenBalance {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: bigint;
}

/**
 * Fetches OP20 balances for all known tokens.
 * Returns map of token address → balance.
 */
export function useTokenBalances() {
    const { connected, addressObj } = useWallet();

    return useQuery<TokenBalance[]>({
        queryKey: ['token-balances', addressObj?.toString()],
        queryFn: async () => {
            if (!addressObj) return [];

            const results: TokenBalance[] = [];

            for (const token of KNOWN_TOKENS) {
                try {
                    const contract = getOP20(token.address, addressObj);

                    // Read actual decimals from chain (don't trust hardcoded config)
                    let decimals = token.decimals;
                    try {
                        const decResult = await contract.decimals();
                        if (!decResult.revert) {
                            decimals = Number(decResult.properties.decimals) || token.decimals;
                        }
                    } catch {
                        // fallback to config decimals
                    }

                    const result = await contract.balanceOf(addressObj);
                    if (!result.revert) {
                        results.push({
                            address: token.address,
                            symbol: token.symbol,
                            name: token.name,
                            decimals,
                            balance: (result.properties.balance as bigint) ?? 0n,
                        });
                    } else {
                        results.push({
                            ...token,
                            decimals,
                            balance: 0n,
                        });
                    }
                } catch {
                    results.push({
                        ...token,
                        balance: 0n,
                    });
                }
            }

            return results;
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
        enabled: connected && !!addressObj,
    });
}

/**
 * Get a single token balance.
 */
export function useTokenBalance(tokenAddress: string | undefined) {
    const { connected, addressObj } = useWallet();

    return useQuery<bigint>({
        queryKey: ['token-balance', tokenAddress, addressObj?.toString()],
        queryFn: async () => {
            if (!addressObj || !tokenAddress) return 0n;
            try {
                const contract = getOP20(tokenAddress, addressObj);
                const result = await contract.balanceOf(addressObj);
                if (!result.revert) {
                    return (result.properties.balance as bigint) ?? 0n;
                }
            } catch {
                // fallthrough
            }
            return 0n;
        },
        staleTime: 15_000,
        refetchInterval: 30_000,
        enabled: connected && !!addressObj && !!tokenAddress,
    });
}
