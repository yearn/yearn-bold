import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet } from "wagmi/chains";

// WalletConnect project IDs are free: https://dashboard.reown.com
// Injected wallets (Rabby, MetaMask, etc.) work without one.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "ybold-lander-dev";

export const wagmiConfig = getDefaultConfig({
  appName: "yBOLD by Yearn",
  projectId,
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
  ssr: true,
});
