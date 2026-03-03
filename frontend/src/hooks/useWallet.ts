import { useWalletConnect } from '@btc-vision/walletconnect';

/**
 * Convenience wrapper around useWalletConnect.
 * Provides backward-compatible `connected`, `address`, `connect`, `disconnect`
 * plus OPNet-specific fields for contract interaction.
 */
export function useWallet() {
    const wc = useWalletConnect();

    // No `isConnected` in walletconnect v2 — check publicKey
    const connected = wc.publicKey !== null;

    return {
        // Backward-compatible (used by Header, Dashboard, etc.)
        connected,
        address: wc.walletAddress ?? '',       // bech32m for display
        connecting: wc.connecting,
        connect: wc.openConnectModal,          // opens wallet selection modal
        disconnect: wc.disconnect,

        // OPNet-specific fields
        walletAddress: wc.walletAddress ?? '', // bech32m for refundTo
        publicKey: wc.publicKey ?? '',         // tweaked public key hex
        addressObj: wc.address ?? null,        // Address object for comparison
        provider: wc.provider,                 // AbstractRpcProvider
        network: wc.network,
        walletBalance: wc.walletBalance,
        signer: wc.signer,
    };
}
