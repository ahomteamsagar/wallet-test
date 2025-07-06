import { Aftermath, RouterCompleteTradeRoute } from "aftermath-ts-sdk";

export async function getAftermathQuote(inputToken: string, outputToken: string, amount: string):
    Promise<{ quoteAmount: bigint, route: RouterCompleteTradeRoute }> {
    const afterMath = new Aftermath("MAINNET");
    const router = afterMath.Router();

    try {
        const route: RouterCompleteTradeRoute = await router.getCompleteTradeRouteGivenAmountIn({
            coinInType: inputToken,
            coinOutType: outputToken,
            coinInAmount: BigInt(amount),
        })
        return { quoteAmount: route.coinOut.amount, route: route };
    } catch (error) {
        console.error("Error fetching quote:", error);
        throw error;
    }
}

