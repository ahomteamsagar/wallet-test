export async function buildTx(quoteResponse: any, wallet: any) {
  const swapResponse = await (
    await fetch("https://lite-api.jup.ag/swap/v1/swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: wallet.publicKey.toString(),
        dynamicComputeUnitLimit: true,
        dynamicSlippage: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 1000000,
            priorityLevel: "veryHigh",
          },
        },
      }),
    })
  ).json();

  if (!swapResponse.swapTransaction) {
    console.error("Jupiter swap API response:", swapResponse);
    throw new Error("No swapTransaction returned from Jupiter. Check the quote and API response.");
  }

  return swapResponse.swapTransaction;
}
