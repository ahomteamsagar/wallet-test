"use client"
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PropsWithChildren } from "react";
import { Network } from "@aptos-labs/ts-sdk";
 
export const WalletProvider = ({ children }: PropsWithChildren) => {
  console.log("AptosProvider: Initializing with mainnet configuration");
  
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{ 
        network: Network.MAINNET
      }}
      onError={(error) => {
        console.error("Aptos wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
};