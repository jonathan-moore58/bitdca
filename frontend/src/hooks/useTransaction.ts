import { useState, useCallback } from 'react';
import { getNetwork } from '../services/ContractService';
import { useToast } from '../components/Toast';

interface TransactionState {
    loading: boolean;
    error: string | null;
    txId: string | null;
}

/**
 * Hook for executing OPNet contract transactions.
 * Handles simulation → wallet signing → receipt.
 * Shows toast notifications for tx lifecycle.
 *
 * FRONTEND SIGNER RULE: signer and mldsaSigner are ALWAYS null.
 * The browser wallet (OP_WALLET) handles ALL signing.
 */
export function useTransaction() {
    const [state, setState] = useState<TransactionState>({
        loading: false,
        error: null,
        txId: null,
    });
    const toast = useToast();

    const execute = useCallback(
        async (
            simulateCall: () => Promise<{
                revert?: string;
                sendTransaction: (params: Record<string, unknown>) => Promise<{
                    transactionId?: string;
                    txid?: string;
                }>;
            }>,
            walletAddress: string,
            maxSats?: bigint,
            extraTxParams?: Record<string, unknown>,
        ): Promise<string | null> => {
            setState({ loading: true, error: null, txId: null });
            toast.info('Simulating transaction...', 'Verifying on-chain state before signing');
            try {
                // 1. Simulate
                const callResult = await simulateCall();

                if (callResult.revert) {
                    throw new Error(`Simulation reverted: ${callResult.revert}`);
                }

                toast.info('Awaiting wallet signature...', 'Please confirm in your OP_WALLET');

                // 2. Send transaction — wallet handles signing
                // signer: null and mldsaSigner: null are MANDATORY on frontend
                // extraTxParams allows passing additional params like extraOutputs
                const receipt = await callResult.sendTransaction({
                    signer: null,
                    mldsaSigner: null,
                    refundTo: walletAddress,
                    network: getNetwork(),
                    maximumAllowedSatToSpend: maxSats ?? 100_000n,
                    feeRate: 10,
                    ...extraTxParams,
                });

                const txId = receipt.transactionId || receipt.txid || '';
                setState({ loading: false, error: null, txId });
                toast.success('Transaction submitted!', txId ? `TX: ${txId.slice(0, 12)}...` : undefined);
                return txId;
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Transaction failed';
                setState({ loading: false, error: msg, txId: null });
                toast.error('Transaction failed', msg);
                return null;
            }
        },
        [toast],
    );

    const reset = useCallback(() => {
        setState({ loading: false, error: null, txId: null });
    }, []);

    return { ...state, execute, reset };
}
