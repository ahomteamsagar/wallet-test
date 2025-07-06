'use client'
import { WalletDisconnectButton, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo, useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import TOKENLIST from '../tokenList.json';
import SUI_TOKENLIST from '../suiTokenList.json';
import { getQuote } from '../jupiter/quote';
import { buildTx } from '../jupiter/swap';
import { getAftermathQuote } from '../aftermath/quote';
import { doAftermathTrade } from '../aftermath/doTrade';
import '@mysten/dapp-kit/dist/index.css';
import { ConnectButton as SuiConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useWallet as aptosUseWallet } from "@aptos-labs/wallet-adapter-react";

export default function Home() {
    const [isClient, setIsClient] = useState(false);
    const { account, connected, connect, disconnect, wallets } = aptosUseWallet();

    // Use useEffect to ensure we're on the client side
    useEffect(() => {
        setIsClient(true);
        console.log('Aptos wallet state:', { account, connected, wallets });
    }, [account, connected, wallets]);

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
    const { data: evmBalance } = useBalance({ address: evmAddress });
    const currentAccount = useCurrentAccount();
    const signAndExecuteTransaction = useSignAndExecuteTransaction();

    // Transaction state
    const [recipientAddress, setRecipientAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [selectedChain, setSelectedChain] = useState<"evm" | "solana">("evm");
    const [isLoading, setIsLoading] = useState(false);
    const [txHash, setTxHash] = useState("");

    // EVM transaction hooks
    const { data: evmTxHash, sendTransaction: sendEvmTransaction, isPending: isEvmPending } = useSendTransaction();
    const { isLoading: isEvmConfirming, isSuccess: isEvmSuccess } = useWaitForTransactionReceipt({
        hash: evmTxHash,
    });

    // Try to detect the network from the connection endpoint
    const network = useMemo(() => {
        if (!connection || !connection.rpcEndpoint) return "Unknown";
        const endpoint = connection.rpcEndpoint;
        if (endpoint.includes("devnet")) return "devnet";
        if (endpoint.includes("testnet")) return "testnet";
        if (endpoint.includes("mainnet")) return "mainnet-beta";
        return endpoint;
    }, [connection]);

    // Handle EVM transaction
    const handleEvmTransaction = async () => {
        if (!evmAddress || !recipientAddress || !amount) return;

        try {
            setIsLoading(true);
            setTxHash("");

            sendEvmTransaction({
                to: recipientAddress as `0x${string}`,
                value: parseEther(amount),
            });
        } catch (error) {
            console.error("EVM transaction error:", error);
            alert("Transaction failed: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle Solana transaction
    const handleSolanaTransaction = async () => {
        if (!publicKey || !recipientAddress || !amount) return;

        try {
            setIsLoading(true);
            setTxHash("");

            const recipientPubKey = new PublicKey(recipientAddress);
            const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: recipientPubKey,
                    lamports: lamports,
                })
            );

            const signature = await sendTransaction(transaction, connection);
            setTxHash(signature);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');
            alert("Solana transaction successful!");

        } catch (error) {
            console.error("Solana transaction error:", error);
            alert("Transaction failed: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle transaction based on selected chain
    const handleTransaction = () => {
        if (selectedChain === "evm") {
            handleEvmTransaction();
        } else {
            handleSolanaTransaction();
        }
    };

    // Get current balance
    const getCurrentBalance = () => {
        if (selectedChain === "evm" && evmBalance) {
            return formatEther(evmBalance.value);
        }
        return "0";
    };

    // Get current address
    const getCurrentAddress = () => {
        if (selectedChain === "evm" && evmAddress) {
            return evmAddress;
        }
        if (selectedChain === "solana" && publicKey) {
            return publicKey.toString();
        }
        return "";
    };

    // Check if transaction can be sent
    const canSendTransaction = () => {
        const isConnected = selectedChain === "evm" ? isEvmConnected : !!publicKey;
        return isConnected && recipientAddress && amount && parseFloat(amount) > 0;
    };

    // --- Jupiter Swap State ---
    const tokenOptions = Object.entries(TOKENLIST);
    const [fromToken, setFromToken] = useState('WSOL');
    const [toToken, setToToken] = useState('USDC');
    const [swapAmount, setSwapAmount] = useState('');
    const [quote, setQuote] = useState<{ outAmount: string; priceImpactPct?: string } | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [swapLoading, setSwapLoading] = useState(false);
    const [swapStatus, setSwapStatus] = useState<string | null>(null);
    const [swapError, setSwapError] = useState<string | null>(null);

    // --- Aftermath Swap State ---
    const suiTokenOptions = Object.entries(SUI_TOKENLIST);
    const [suiFromToken, setSuiFromToken] = useState('SUI');
    const [suiToToken, setSuiToToken] = useState('USDC');
    const [suiSwapAmount, setSuiSwapAmount] = useState('');
    const [suiQuote, setSuiQuote] = useState<{ quoteAmount: bigint } | null>(null);
    const [suiQuoteLoading, setSuiQuoteLoading] = useState(false);
    const [suiSwapLoading, setSuiSwapLoading] = useState(false);
    const [suiSwapStatus, setSuiSwapStatus] = useState<string | null>(null);
    const [suiSwapError, setSuiSwapError] = useState<string | null>(null);

    // --- Jupiter Swap Handlers ---
    const handleGetQuote = async () => {
        setQuote(null);
        setSwapError(null);
        setQuoteLoading(true);
        try {
            const decimals = fromToken === 'WSOL' ? 9 : 6; // crude, for demo
            const amount = Math.floor(Number(swapAmount) * 10 ** decimals);
            const result = await getQuote({
                inputMint: TOKENLIST[fromToken as keyof typeof TOKENLIST],
                outputMint: TOKENLIST[toToken as keyof typeof TOKENLIST],
                amount,
                slippageBps: 50,
                restrictIntermediateTokens: true,
            });
            setQuote(result);
        } catch (e: unknown) {
            setSwapError((e as Error).message || 'Failed to get quote');
        } finally {
            setQuoteLoading(false);
        }
    };

    const handleSwap = async () => {
        setSwapStatus(null);
        setSwapError(null);
        setSwapLoading(true);
        try {
            if (!publicKey) throw new Error('Connect your Solana wallet');
            if (!quote) throw new Error('No quote available');
            const swapTxBase64 = await buildTx(quote, { publicKey });
            // Send transaction using wallet adapter
            const { Transaction, VersionedTransaction } = await import('@solana/web3.js');
            const swapTxBuffer = Buffer.from(swapTxBase64, 'base64');
            let transaction;
            try {
                transaction = VersionedTransaction.deserialize(swapTxBuffer);
            } catch {
                transaction = Transaction.from(swapTxBuffer);
            }
            const signature = await sendTransaction(transaction, connection);
            setSwapStatus('Transaction sent: ' + signature);
            await connection.confirmTransaction(signature, 'confirmed');
            setSwapStatus('Swap confirmed! Tx: ' + signature);
        } catch (e: unknown) {
            setSwapError((e as Error).message || 'Swap failed');
        } finally {
            setSwapLoading(false);
        }
    };

    // --- Aftermath Swap Handlers ---
    const handleSuiGetQuote = async () => {
        setSuiQuote(null);
        setSuiSwapError(null);
        setSuiQuoteLoading(true);
        try {
            const decimals = suiFromToken === 'SUI' ? 9 : 6; // crude, for demo
            const amount = Math.floor(Number(suiSwapAmount) * 10 ** decimals);
            const result = await getAftermathQuote(
                SUI_TOKENLIST[suiFromToken as keyof typeof SUI_TOKENLIST],
                SUI_TOKENLIST[suiToToken as keyof typeof SUI_TOKENLIST],
                amount.toString()
            );
            setSuiQuote(result);
        } catch (e: unknown) {
            setSuiSwapError((e as Error).message || 'Failed to get quote');
        } finally {
            setSuiQuoteLoading(false);
        }
    };

    const handleSuiSwap = async () => {
        setSuiSwapStatus(null);
        setSuiSwapError(null);
        setSuiSwapLoading(true);
        try {
            if (!currentAccount) throw new Error('Connect your Sui wallet');
            if (!currentAccount.address) throw new Error('Wallet address not available');
            if (!suiQuote) throw new Error('No quote available');

            console.log('Current account:', currentAccount);
            console.log('Wallet address:', currentAccount.address);
            console.log('Sign and execute transaction function:', signAndExecuteTransaction);
            console.log('Network configuration should be using mainnet RPC');

            const inputDecimals = suiFromToken === 'SUI' ? 9 : 6;
            const outputDecimals = suiToToken === 'SUI' ? 9 : 6;

            const txDigest = await doAftermathTrade(
                SUI_TOKENLIST[suiFromToken as keyof typeof SUI_TOKENLIST],
                SUI_TOKENLIST[suiToToken as keyof typeof SUI_TOKENLIST],
                inputDecimals,
                outputDecimals,
                suiSwapAmount,
                currentAccount.address,
                (params: { transaction: unknown }) => signAndExecuteTransaction.mutateAsync({
                    transaction: params.transaction as string
                })
            );

            setSuiSwapStatus('Swap confirmed! Tx: ' + txDigest);
        } catch (e: unknown) {
            setSuiSwapError((e as Error).message || 'Swap failed');
        } finally {
            setSuiSwapLoading(false);
        }
    };

    // Don't render wallet-dependent content until we're on the client
    if (!isClient) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold text-white mb-2">Multi-Chain Wallet Demo</h1>
                        <p className="text-gray-400 text-lg">Loading...</p>
                    </div>
                </div>
            </main>
        );
    }

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
                    <div className="grid md:grid-cols-3 gap-4">
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                                <span className="text-gray-300 font-medium">Sui Network:</span>
                                <span className="text-purple-400 font-mono bg-gray-800 px-3 py-1 rounded-lg">mainnet</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                Using public RPC endpoint
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-gray-300 font-medium">Aptos Network:</span>
                                <span className="text-green-500 font-mono bg-gray-800 px-3 py-1 rounded-lg">mainnet</span>
                            </div>
                            <div className="text-sm text-gray-500">
                                Using mainnet RPC
                            </div>
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
                            {isEvmConnected && evmBalance && (
                                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                                    <p className="text-sm text-gray-400">Balance: {formatEther(evmBalance.value)} {evmBalance.symbol}</p>
                                </div>
                            )}
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

                    {/* Sui Wallet Card */}
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">SUI</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">SUI Network</h2>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Connect to SUI mainnet, devnet, or testnet
                            </p>
                            <div className="flex flex-col space-y-2">
                                <SuiConnectButton />
                                {currentAccount && (
                                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                                        <p className="text-sm text-gray-400">Connected: {currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}</p>
                                        <button
                                            onClick={() => console.log('Wallet info:', currentAccount)}
                                            className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                        >
                                            Debug Wallet
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log('Testing network connection...');
                                                // Test the network connection
                                                fetch('https://sui-rpc.publicnode.com', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        jsonrpc: '2.0',
                                                        id: 1,
                                                        method: 'sui_getLatestCheckpointSequenceNumber'
                                                    })
                                                })
                                                    .then(response => response.json())
                                                    .then(data => console.log('Network test result:', data))
                                                    .catch(error => console.error('Network test error:', error));
                                            }}
                                            className="mt-2 ml-2 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                        >
                                            Test Network
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Aptos Wallet Card */}
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">APT</span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">Aptos Network</h2>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Connect to Aptos mainnet, devnet, or testnet
                            </p>
                            <div className="flex flex-col space-y-2">
                                {/* Debug Info */}
                                <div className="text-xs text-gray-500 mb-2">
                                    Available wallets: {wallets?.length || 0}
                                </div>
                                
                                {connected ? (
                                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                                        <p className="text-sm text-gray-400">
                                            Connected: {account?.address?.toString().slice(0, 8)}...{account?.address?.toString().slice(-6)}
                                        </p>
                                        <button
                                            onClick={() => console.log('Wallet info:', account)}
                                            className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                        >
                                            Debug Wallet
                                        </button>
                                        <button
                                            onClick={disconnect}
                                            className="mt-2 ml-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {/* Show available wallets */}
                                        {wallets && wallets.length > 0 ? (
                                            wallets.map((wallet) => (
                                                <button
                                                    key={wallet.name}
                                                    onClick={() => {
                                                        console.log('Attempting to connect to:', wallet.name);
                                                        connect(wallet.name);
                                                    }}
                                                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                >
                                                    Connect {wallet.name}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="text-center">
                                                <p className="text-sm text-gray-400 mb-2">No Aptos wallets detected</p>
                                                <p className="text-xs text-gray-500">
                                                    Please install Petra, Martian, or another Aptos wallet
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        console.log('Available wallets:', wallets);
                                                        console.log('Wallet state:', { connected, account });
                                                    }}
                                                    className="mt-2 px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                                                >
                                                    Debug State
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Section */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white">Send Transaction</h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setSelectedChain("evm")}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedChain === "evm"
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        }`}
                                >
                                    EVM
                                </button>
                                <button
                                    onClick={() => setSelectedChain("solana")}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedChain === "solana"
                                            ? "bg-purple-500 text-white"
                                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                        }`}
                                >
                                    Solana
                                </button>
                            </div>
                        </div>

                        {/* Current Wallet Info */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400 mb-1">Current Address</p>
                                <p className="text-white font-mono text-sm break-all">
                                    {getCurrentAddress() || "Not connected"}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-lg">
                                <p className="text-sm text-gray-400 mb-1">Current Balance</p>
                                <p className="text-white font-mono text-sm">
                                    {getCurrentBalance()} {selectedChain === "evm" ? "ETH" : "SOL"}
                                </p>
                            </div>
                        </div>

                        {/* Transaction Form */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Recipient Address
                                </label>
                                <input
                                    type="text"
                                    value={recipientAddress}
                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                    placeholder={selectedChain === "evm" ? "0x..." : "Solana public key..."}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Amount ({selectedChain === "evm" ? "ETH" : "SOL"})
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.0"
                                    step="0.000001"
                                    min="0"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                onClick={handleTransaction}
                                disabled={!canSendTransaction() || isLoading || isEvmPending || isEvmConfirming}
                                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${canSendTransaction() && !isLoading && !isEvmPending && !isEvmConfirming
                                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {isLoading || isEvmPending || isEvmConfirming ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </div>
                                ) : (
                                    `Send ${selectedChain === "evm" ? "ETH" : "SOL"}`
                                )}
                            </button>
                        </div>

                        {/* Transaction Status */}
                        {txHash && (
                            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                <p className="text-green-400 text-sm font-medium mb-2">Transaction Hash:</p>
                                <p className="text-green-300 font-mono text-sm break-all">{txHash}</p>
                            </div>
                        )}

                        {isEvmSuccess && (
                            <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                <p className="text-green-400 text-sm">✅ EVM transaction confirmed successfully!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Jupiter Swap UI --- */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-yellow-700/50 shadow-xl mt-8">
                    <h3 className="text-xl font-semibold text-yellow-300 mb-4">Solana Token Swap (Jupiter)</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
                            <select
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                value={fromToken}
                                onChange={e => setFromToken(e.target.value)}
                            >
                                {tokenOptions.map(([symbol]) => (
                                    <option key={symbol} value={symbol}>{symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
                            <select
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                value={toToken}
                                onChange={e => setToToken(e.target.value)}
                            >
                                {tokenOptions.map(([symbol]) => (
                                    <option key={symbol} value={symbol}>{symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                value={swapAmount}
                                onChange={e => setSwapAmount(e.target.value)}
                                placeholder="0.0"
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>
                    <div className="flex space-x-4 mb-4">
                        <button
                            className="px-6 py-3 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-50"
                            onClick={handleGetQuote}
                            disabled={quoteLoading || !swapAmount || fromToken === toToken}
                        >
                            {quoteLoading ? 'Getting Quote...' : 'Get Quote'}
                        </button>
                        <button
                            className="px-6 py-3 rounded-lg bg-green-500 text-white font-bold hover:bg-green-400 disabled:opacity-50"
                            onClick={handleSwap}
                            disabled={swapLoading || !quote}
                        >
                            {swapLoading ? 'Swapping...' : 'Swap'}
                        </button>
                    </div>
                    {swapError && <div className="text-red-400 mb-2">{swapError}</div>}
                    {swapStatus && <div className="text-green-400 mb-2">{swapStatus}</div>}
                    {quote && (
                        <div className="bg-gray-800/70 rounded-lg p-4 mt-2">
                            <div className="text-gray-300 text-sm mb-2">Quote:</div>
                            <div className="text-white text-lg font-mono">
                                {Number(quote.outAmount) / 10 ** (toToken === 'WSOL' ? 9 : 6)} {toToken}
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                                Price Impact: {quote.priceImpactPct ? (Number(quote.priceImpactPct) * 100).toFixed(2) + '%' : 'N/A'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Aftermath Swap UI */}
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-green-700/50 shadow-xl mt-8">
                    <h3 className="text-xl font-semibold text-green-300 mb-4">Sui Token Swap (Aftermath)</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
                            <select
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                value={suiFromToken}
                                onChange={e => setSuiFromToken(e.target.value)}
                            >
                                {suiTokenOptions.map(([symbol]) => (
                                    <option key={symbol} value={symbol}>{symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
                            <select
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                value={suiToToken}
                                onChange={e => setSuiToToken(e.target.value)}
                            >
                                {suiTokenOptions.map(([symbol]) => (
                                    <option key={symbol} value={symbol}>{symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                                value={suiSwapAmount}
                                onChange={e => setSuiSwapAmount(e.target.value)}
                                placeholder="0.0"
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>
                    <div className="flex space-x-4 mb-4">
                        <button
                            className="px-6 py-3 rounded-lg bg-green-500 text-black font-bold hover:bg-green-400 disabled:opacity-50"
                            onClick={handleSuiGetQuote}
                            disabled={suiQuoteLoading || !suiSwapAmount || suiFromToken === suiToToken}
                        >
                            {suiQuoteLoading ? 'Getting Quote...' : 'Get Quote'}
                        </button>
                        <button
                            className="px-6 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 disabled:opacity-50"
                            onClick={handleSuiSwap}
                            disabled={suiSwapLoading || !suiQuote}
                        >
                            {suiSwapLoading ? 'Swapping...' : 'Swap'}
                        </button>
                    </div>
                    {suiSwapError && <div className="text-red-400 mb-2">{suiSwapError}</div>}
                    {suiSwapStatus && <div className="text-green-400 mb-2">{suiSwapStatus}</div>}
                    {suiQuote && (
                        <div className="bg-gray-800/70 rounded-lg p-4 mt-2">
                            <div className="text-gray-300 text-sm mb-2">Quote:</div>
                            <div className="text-white text-lg font-mono">
                                {Number(suiQuote.quoteAmount) / 10 ** (suiToToken === 'SUI' ? 9 : 6)} {suiToToken}
                            </div>
                        </div>
                    )}
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
                                <span className="text-green-400 text-xl">💸</span>
                            </div>
                            <h4 className="text-white font-medium mb-2">Send Transactions</h4>
                            <p className="text-gray-400 text-sm">Transfer tokens on both EVM and Solana networks</p>
                        </div>
                        <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <span className="text-purple-400 text-xl">⚡</span>
                            </div>
                            <h4 className="text-white font-medium mb-2">Real-time</h4>
                            <p className="text-gray-400 text-sm">Live network status and transaction monitoring</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
