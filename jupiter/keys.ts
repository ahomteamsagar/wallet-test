import { Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import dotenv from 'dotenv';
dotenv.config();

const seed = bip39.mnemonicToSeedSync(process.env.SEED!, "");
const keypair = Keypair.fromSeed(seed.subarray(0, 32));

console.log(`${keypair.publicKey.toBase58()}`);