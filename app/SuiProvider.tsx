"use client"
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl('localnet') },
    mainnet: { url: 'https://sui-rpc.publicnode.com' },
});
const queryClient = new QueryClient();

interface SuiProviderProps {
    children: ReactNode;
}

export function SuiProvider({ children }: SuiProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                <WalletProvider>
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}