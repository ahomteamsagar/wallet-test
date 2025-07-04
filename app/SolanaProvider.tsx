"use client";

import React, { FC, ReactNode, useMemo } from "react";
import {
    ConnectionProvider,
    WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
    children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
    // Use custom mainnet endpoint with API key
    const BLOCKDAEMON_API_KEY = process.env.NEXT_PUBLIC_BLOCKDAEMON_API_KEY;
    const endpoint = useMemo(
        () =>
            `https://svc.blockdaemon.com/solana/mainnet/native${
                BLOCKDAEMON_API_KEY ? `?apiKey=${BLOCKDAEMON_API_KEY}` : ""
            }`,
        [BLOCKDAEMON_API_KEY]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={[]} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};