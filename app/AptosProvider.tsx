// import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
// import { PropsWithChildren } from "react";
// import { Network } from "@aptos-labs/ts-sdk";

// export const AptosWalletProvider = ({ children }: PropsWithChildren) => {
//     return (
//         <AptosWalletAdapterProvider
//             autoConnect={true}
//             dappConfig={{ network: Network.MAINNET }}
//             onError={(error : unknown) => {
//                 console.log("error", error);
//             }}
//         >
//             {children}
//         </AptosWalletAdapterProvider>
//     );
// };