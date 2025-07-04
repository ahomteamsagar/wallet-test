import { Keypair, Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// Load the base64-encoded secret key from environment variable
const secretKeyBase64 = process.env.PRIVATE_KEY || '';
if (!secretKeyBase64) {
    throw new Error('PRIVATE_KEY environment variable is not set');
}
const wallet = Keypair.fromSecretKey(Buffer.from(secretKeyBase64, 'base64'));
const connection = new Connection('https://api.mainnet-beta.solana.com');

export {
    wallet, connection
}