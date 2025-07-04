import { getQuote } from "./quote";
import { buildTx } from "./swap";
import { wallet } from "./utils";
import { connection } from "./utils";
import { VersionedTransaction } from "@solana/web3.js"; 
import TOKENLIST from "../tokenList.json";

(async () => {
  try {
    const quote = await getQuote({
      inputMint: TOKENLIST.WSOL,
      outputMint: TOKENLIST.USDT,
      amount: 1000000, // 0.001 SOL (WSOL has 9 decimals)
      // amount: 150000, // 0.15 USDT (USDT has 6 decimals)
      slippageBps: 50,
      restrictIntermediateTokens: true,
    });

    console.log("ConnectedWallet:", wallet.publicKey.toString());

    const swapTxBase64 = await buildTx(quote, wallet);

    // ✅ Deserialize versioned transaction
    const swapTxBuffer = Buffer.from(swapTxBase64, "base64");
    const transaction = VersionedTransaction.deserialize(swapTxBuffer);

    // ✅ Sign the transaction
    transaction.sign([wallet]);

    // ✅ Serialize and send
    const rawTx = transaction.serialize();
    const txid = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
    });

    console.log("Swap transaction sent. Signature:", txid);

    // ✅ Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature: txid,
      ...latestBlockhash,
    });

    if (confirmation.value.err) {
      console.error("Transaction failed:", confirmation.value.err);
    } else {
      console.log("Transaction confirmed!");
    }

  } catch (err) {
    console.error("Swap failed:", err);
  }
})();
