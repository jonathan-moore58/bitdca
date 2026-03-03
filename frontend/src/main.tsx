import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 15_000,
        },
    },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <WalletConnectProvider theme="dark">
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </WalletConnectProvider>
    </StrictMode>,
);
