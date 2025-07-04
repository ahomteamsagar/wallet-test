'use client'
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Home() {
    const { connection } = useConnection();

    // Try to detect the network from the connection endpoint
    const network = useMemo(() => {
        if (!connection || !connection.rpcEndpoint) return "Unknown";
        const endpoint = connection.rpcEndpoint;
        if (endpoint.includes("devnet")) return "devnet";
        if (endpoint.includes("testnet")) return "testnet";
        if (endpoint.includes("mainnet")) return "mainnet-beta";
        return endpoint;
    }, [connection]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-white mb-2">Multi-Chain Wallet Demo</h1>
                    <p className="text-gray-400 text-lg">Connect to both Solana and EVM chains seamlessly</p>
                </div>

                {/* Network Status Card */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-gray-300 font-medium">Solana Network:</span>
                            <span className="text-green-400 font-mono bg-gray-800 px-3 py-1 rounded-lg">{network}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                            Real-time connection status
                        </div>
                    </div>
                </div>

                {/* Wallet Connection Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* EVM Wallet Card */}
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">EVM</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Ethereum & EVM Chains</h2>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Connect to Ethereum, Polygon, Arbitrum, Optimism, and Base networks
                            </p>
                            <div className="flex justify-center">
                                <ConnectButton />
                            </div>
                        </div>
                    </div>

                    {/* Solana Wallet Card */}
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">SOL</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Solana Network</h2>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Connect to Solana mainnet, devnet, or testnet
                            </p>
                            <div className="flex flex-col space-y-2">
                                <WalletMultiButton />
                                <WalletDisconnectButton />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <h3 className="text-xl font-semibold text-white mb-4">Features</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <span className="text-blue-400 text-xl">🔗</span>
                            </div>
                            <h4 className="text-white font-medium mb-2">Multi-Chain</h4>
                            <p className="text-gray-400 text-sm">Support for both EVM and Solana ecosystems</p>
                        </div>
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <span className="text-green-400 text-xl">⚡</span>
                            </div>
                            <h4 className="text-white font-medium mb-2">Real-time</h4>
                            <p className="text-gray-400 text-sm">Live network status and connection monitoring</p>
                        </div>
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <span className="text-purple-400 text-xl">🎨</span>
                            </div>
                            <h4 className="text-white font-medium mb-2">Modern UI</h4>
                            <p className="text-gray-400 text-sm">Beautiful, responsive design with dark theme</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
