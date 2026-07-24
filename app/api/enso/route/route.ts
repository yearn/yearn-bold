import { isAddress } from "viem";
import {
  ENSO_DESTINATION_TOKEN,
  isEnsoDepositToken,
  isEnsoWithdrawToken,
} from "@/lib/enso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENSO_API_BASE = "https://api.enso.build/api/v1/shortcuts/route";
const YEARN_ENSO_PROXY = "https://yearn.fi/api/enso/route";

function error(message: string, status = 400) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const fromAddress = requestUrl.searchParams.get("fromAddress");
  const tokenIn = requestUrl.searchParams.get("tokenIn");
  const requestedTokenOut = requestUrl.searchParams.get("tokenOut");
  const amountIn = requestUrl.searchParams.get("amountIn");
  const slippage = requestUrl.searchParams.get("slippage") ?? "0";

  if (!fromAddress || !isAddress(fromAddress)) {
    return error("Missing or invalid fromAddress");
  }
  const tokenOut = requestedTokenOut ?? ENSO_DESTINATION_TOKEN;
  const isDepositRoute =
    !!tokenIn &&
    isEnsoDepositToken(tokenIn) &&
    tokenOut.toLowerCase() === ENSO_DESTINATION_TOKEN.toLowerCase();
  const isWithdrawRoute =
    !!tokenIn &&
    tokenIn.toLowerCase() === ENSO_DESTINATION_TOKEN.toLowerCase() &&
    isEnsoWithdrawToken(tokenOut);
  if (!isDepositRoute && !isWithdrawRoute) {
    return error("Unsupported token pair");
  }
  if (!amountIn || !/^\d+$/.test(amountIn) || BigInt(amountIn) <= 0n) {
    return error("Missing or invalid amountIn");
  }
  if (!/^\d+$/.test(slippage) || Number(slippage) > 500) {
    return error("Slippage must be between 0 and 500 basis points");
  }

  const params = new URLSearchParams({
    fromAddress,
    receiver: fromAddress,
    chainId: "1",
    tokenIn,
    tokenOut,
    amountIn,
    slippage,
  });

  const apiKey = process.env.ENSO_API_KEY;
  const endpoint = apiKey ? ENSO_API_BASE : YEARN_ENSO_PROXY;

  try {
    const response = await fetch(`${endpoint}?${params}`, {
      cache: "no-store",
      headers: apiKey
        ? {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          }
        : undefined,
    });
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return error("Unable to reach Enso", 502);
  }
}
