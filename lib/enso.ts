import { isAddress, isHex, type Address, type Hex } from "viem";
import { BOLD, ST_YBOLD } from "./contracts";

export const ENSO_NATIVE_TOKEN =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;
export const ENSO_MAINNET_ROUTER =
  "0xF75584eF6673aD213a685a1B58Cc0330B8eA22Cf" as const;
export const ENSO_PRICE_IMPACT_TOLERANCE_PERCENT = 1;
export const ENSO_PRICE_IMPACT_HARD_CAP_PERCENT = 5;

export type DepositToken = {
  symbol: "BOLD" | "USDC" | "USDT" | "USDS" | "DAI" | "ETH" | "WETH";
  address: Address;
  decimals: number;
  icon: string;
  isNative?: boolean;
};

const tokenIcon = (address: Address) =>
  `https://cdn.jsdelivr.net/gh/SmolDapp/tokenAssets@main/tokens/1/${address.toLowerCase()}/logo-128.png`;

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as const;

export const DEPOSIT_TOKENS: readonly DepositToken[] = [
  {
    symbol: "BOLD",
    address: BOLD,
    decimals: 18,
    icon: "/bold.png",
  },
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    icon: tokenIcon("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
  },
  {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    icon: tokenIcon("0xdAC17F958D2ee523a2206206994597C13D831ec7"),
  },
  {
    symbol: "USDS",
    address: "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
    decimals: 18,
    icon: tokenIcon("0xdC035D45d973E3EC169d2276DDab16f1e407384F"),
  },
  {
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    icon: tokenIcon("0x6B175474E89094C44Da98b954EedeAC495271d0F"),
  },
  {
    symbol: "ETH",
    address: ENSO_NATIVE_TOKEN,
    decimals: 18,
    icon: tokenIcon(WETH),
    isNative: true,
  },
  {
    symbol: "WETH",
    address: WETH,
    decimals: 18,
    icon: tokenIcon(WETH),
  },
] as const;

export const ENSO_DEPOSIT_TOKENS = DEPOSIT_TOKENS.filter(
  (token) => token.symbol !== "BOLD",
);

export type EnsoRoute = {
  tx: {
    to: Address;
    data: Hex;
    value: string;
    from: Address;
  };
  amountOut: string;
  minAmountOut: string;
  priceImpact?: number | null;
  gas: string;
};

export function getDepositToken(symbol: DepositToken["symbol"]): DepositToken {
  return DEPOSIT_TOKENS.find((token) => token.symbol === symbol) ?? DEPOSIT_TOKENS[0];
}

export function isEnsoDepositToken(address: string): boolean {
  return ENSO_DEPOSIT_TOKENS.some(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
}

export function isEnsoWithdrawToken(address: string): boolean {
  return ENSO_DEPOSIT_TOKENS.some(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
}

export function isTrustedEnsoRoute(
  value: unknown,
  account: Address,
): value is EnsoRoute {
  if (!value || typeof value !== "object") return false;

  const route = value as Partial<EnsoRoute>;
  const tx = route.tx;
  if (!tx || typeof tx !== "object") return false;

  return (
    typeof tx.to === "string" &&
    isAddress(tx.to) &&
    tx.to.toLowerCase() === ENSO_MAINNET_ROUTER.toLowerCase() &&
    typeof tx.from === "string" &&
    isAddress(tx.from) &&
    tx.from.toLowerCase() === account.toLowerCase() &&
    typeof tx.data === "string" &&
    isHex(tx.data) &&
    typeof tx.value === "string" &&
    /^\d+$/.test(tx.value) &&
    typeof route.amountOut === "string" &&
    /^\d+$/.test(route.amountOut) &&
    typeof route.minAmountOut === "string" &&
    /^\d+$/.test(route.minAmountOut) &&
    typeof route.gas === "string" &&
    /^\d+$/.test(route.gas) &&
    (route.priceImpact === undefined ||
      route.priceImpact === null ||
      (typeof route.priceImpact === "number" &&
        Number.isFinite(route.priceImpact)))
  );
}

export function ensoPriceImpactPercent(route: EnsoRoute): number | null {
  return typeof route.priceImpact === "number"
    ? Math.max(0, route.priceImpact / 100)
    : null;
}

export function remainingEnsoSlippageBps(priceImpactPercent: number): number {
  if (
    priceImpactPercent < 0 ||
    priceImpactPercent >= ENSO_PRICE_IMPACT_TOLERANCE_PERCENT ||
    priceImpactPercent >= 100
  ) {
    return 0;
  }

  const remainingPercent =
    ((ENSO_PRICE_IMPACT_TOLERANCE_PERCENT - priceImpactPercent) /
      (100 - priceImpactPercent)) *
    100;

  return Math.max(0, Math.floor(remainingPercent * 100));
}

export const ENSO_DESTINATION_TOKEN = ST_YBOLD;
