import { Aftermath } from 'aftermath-ts-sdk';
import { SuiClient } from '@mysten/sui/client';
import { getAftermathQuote } from './quote';

export async function doAftermathTrade(
    inputToken: string,
    outPutToken: string,
    inputtokenDecimal: number,
    outputTokenDecimal: number,
    amountIng: string,
    walletAddress: string,
    signAndExecuteTransaction: (params: { transaction: unknown }) => Promise<{ digest: string }>): Promise<string> {
    
    const client = new SuiClient({
        url: 'https://sui-rpc.publicnode.com',
    });
    const afterMath = new Aftermath("MAINNET");
    const router = afterMath.Router();
    const amountIn = BigInt(Math.round(parseFloat(amountIng) * 10 ** inputtokenDecimal));
    
    try {
        const { quoteAmount, route } = await getAftermathQuote(inputToken, outPutToken, amountIn.toString());

        const amountOut = Number(quoteAmount) / 10 ** outputTokenDecimal;

        console.log(`Building And Sending Transaction for ${amountOut} SCA`);
        const trx = await router.getTransactionForCompleteTradeRoute({
            walletAddress: walletAddress, // Trader's address
            completeRoute: route, // Route from getCompleteTradeRoute
            slippage: 0.01, // 1% max slippage
            isSponsoredTx: false, // O
        })
        console.log("Sending Transaction...");
        console.log("Transaction type:", typeof trx);
        console.log("Transaction:", trx);
        
        // Ensure transaction is properly formatted
        if (!trx) {
            throw new Error("Transaction is null or undefined");
        }
        
        console.log("Transaction to send:", trx);
        
        const response = await signAndExecuteTransaction({
            transaction: trx,
        });
        console.log("Transaction sent successfully:", response.digest);
        console.log("Waiting for transaction to be confirmed...");
        await client.waitForTransaction({
            digest: response.digest,
            options: {
                showEffects: true,
            },
        });
        console.log("Transaction In The Explorer:", `https://suiscan.xyz/mainnet/tx/${response.digest}`);
        return response.digest;
    } catch (error) {
        console.log("Error fetching quote:", error);
        throw error;
    }
}