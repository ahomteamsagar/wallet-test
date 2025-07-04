import axios from "axios";

const QUOTE_URL = "https://lite-api.jup.ag/quote";

interface GetQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  restrictIntermediateTokens?: boolean;
}

export async function getQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = 50,
  restrictIntermediateTokens = true,
}: GetQuoteParams) {
  const params = {
    inputMint,
    outputMint,
    amount,
    slippageBps,
    restrictIntermediateTokens,
  };
  const url = "https://lite-api.jup.ag/swap/v1/quote";
  const response = await axios.get(url, { params });

  console.log("Quote response:", JSON.stringify(response.data, null, 2));
  return response.data;
}

// Example usage:
// getQuote({
//   inputMint: 'So11111111111111111111111111111111111111112',
//   outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
//   amount: 100000000,
//   slippageBps: 50,
//   restrictIntermediateTokens: true
// });
