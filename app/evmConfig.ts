import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, arbitrum, optimism, base, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'ALXICORN',
  projectId: '561d75f865ae7f9ecbb602a64c7d7c84',
  chains: [mainnet, polygon, arbitrum, optimism, base, sepolia],
  ssr: true,
});