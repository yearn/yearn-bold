"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { erc20Abi, formatUnits, parseUnits, type Hash } from "viem";
import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { ST_YBOLD, YBOLD_ZAPPER, zapperAbi } from "@/lib/contracts";
import {
  DEPOSIT_TOKENS,
  ENSO_MAINNET_ROUTER,
  ENSO_PRICE_IMPACT_HARD_CAP_PERCENT,
  ENSO_PRICE_IMPACT_TOLERANCE_PERCENT,
  ensoPriceImpactPercent,
  type EnsoRoute,
  getDepositToken,
  isTrustedEnsoRoute,
  remainingEnsoSlippageBps,
  type DepositToken,
} from "@/lib/enso";
import {
  TransactionOverlay,
  type TransactionOverlayView,
} from "./TransactionOverlay";

const WAD = 10n ** 18n;
const MAX_LOSS_BPS = 50n;
const approveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

function fmt(value: bigint, decimals = 18, dp = 2): string {
  const amount = Number(formatUnits(value, decimals));
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

function TokenIcon({
  token,
  size = 24,
}: {
  token: DepositToken;
  size?: number;
}) {
  return (
    <Image
      src={token.icon}
      alt=""
      width={size}
      height={size}
      className="rounded-full"
    />
  );
}

function TokenSelector({
  token,
  menuRef,
  onSelect,
}: {
  token: DepositToken;
  menuRef: RefObject<HTMLDetailsElement | null>;
  onSelect: (token: DepositToken) => void;
}) {
  return (
    <details ref={menuRef} className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 font-medium [&::-webkit-details-marker]:hidden">
        <TokenIcon token={token} />
        {token.symbol}
        <span aria-hidden className="text-xs text-muted">
          ▾
        </span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-40 rounded-lg border border-line bg-surface p-1.5 shadow-[0_12px_30px_rgba(17,27,77,0.12)]">
        {DEPOSIT_TOKENS.map((option) => (
          <button
            key={option.symbol}
            type="button"
            onClick={() => onSelect(option)}
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition ${
              option.symbol === token.symbol
                ? "bg-background font-medium text-navy"
                : "text-navy/75 hover:bg-background hover:text-navy"
            }`}
          >
            <TokenIcon token={option} size={22} />
            {option.symbol}
          </button>
        ))}
      </div>
    </details>
  );
}

function routeErrorMessage(value: unknown): string {
  if (!value || typeof value !== "object") return "Unable to find an Enso route.";

  const payload = value as {
    error?: string | string[];
    message?: string | string[];
    description?: string | string[];
  };
  const message = payload.description ?? payload.message ?? payload.error;
  return Array.isArray(message)
    ? message.join(", ")
    : message ?? "Unable to find an Enso route.";
}

type Tab = "deposit" | "withdraw";
type EnsoQuoteState = {
  key: string;
  loading: boolean;
  route?: EnsoRoute;
  error?: string;
};

export function DepositCard({ apy7d }: { apy7d?: number }) {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [tab, setTab] = useState<Tab>("deposit");
  const [selectedSymbol, setSelectedSymbol] =
    useState<DepositToken["symbol"]>("BOLD");
  const [input, setInput] = useState("");
  const [maxed, setMaxed] = useState(false);
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [ensoQuote, setEnsoQuote] = useState<EnsoQuoteState | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [transactionOverlay, setTransactionOverlay] =
    useState<TransactionOverlayView | null>(null);

  const tokenMenuRef = useRef<HTMLDetailsElement>(null);
  const quoteRequestRef = useRef(0);
  const selectedToken = getDepositToken(selectedSymbol);
  const isEnsoDeposit = tab === "deposit" && selectedToken.symbol !== "BOLD";
  const isEnsoWithdraw = tab === "withdraw" && selectedToken.symbol !== "BOLD";
  const isEnsoRoute = isEnsoDeposit || isEnsoWithdraw;
  const depositSpender =
    selectedToken.symbol === "BOLD" ? YBOLD_ZAPPER : ENSO_MAINNET_ROUTER;

  const selectedBalanceQuery = useBalance({
    address,
    chainId: mainnet.id,
    token: selectedToken.isNative ? undefined : selectedToken.address,
    query: {
      enabled: !!address,
      refetchInterval: 15_000,
    },
  });
  const selectedBalance = selectedBalanceQuery.data?.value ?? 0n;

  const depositAllowanceQuery = useReadContract({
    chainId: mainnet.id,
    address: selectedToken.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, depositSpender] : undefined,
    query: {
      enabled: !!address && tab === "deposit" && !selectedToken.isNative,
      refetchInterval: 15_000,
    },
  });
  const depositAllowance = depositAllowanceQuery.data ?? 0n;

  const reads = useReadContracts({
    contracts: [
      {
        chainId: mainnet.id,
        address: ST_YBOLD,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address ?? "0x0000000000000000000000000000000000000000"],
      },
      {
        chainId: mainnet.id,
        address: ST_YBOLD,
        abi: erc20Abi,
        functionName: "allowance",
        args: [
          address ?? "0x0000000000000000000000000000000000000000",
          YBOLD_ZAPPER,
        ],
      },
      {
        chainId: mainnet.id,
        address: YBOLD_ZAPPER,
        abi: zapperAbi,
        functionName: "previewRedeem",
        args: [WAD],
      },
      {
        chainId: mainnet.id,
        address: ST_YBOLD,
        abi: erc20Abi,
        functionName: "allowance",
        args: [
          address ?? "0x0000000000000000000000000000000000000000",
          ENSO_MAINNET_ROUTER,
        ],
      },
    ],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const [
    stBal = 0n,
    stAllowance = 0n,
    sharePriceBold = WAD,
    stEnsoAllowance = 0n,
  ] = (
    reads.data ?? []
  ).map((result) =>
    result.status === "success" ? (result.result as bigint) : 0n,
  );
  const ysyBoldBalanceResult = reads.data?.[0];
  const positionQuoteResult = reads.data?.[2];
  const positionLoading = !!address && reads.isPending;
  const positionUnavailable =
    !!address &&
    !positionLoading &&
    (!ysyBoldBalanceResult || ysyBoldBalanceResult.status === "failure");

  const positionBold = (stBal * (sharePriceBold || WAD)) / WAD;
  const inputDecimals = tab === "deposit" ? selectedToken.decimals : 18;
  const amount = (() => {
    try {
      return input ? parseUnits(input, inputDecimals) : 0n;
    } catch {
      return 0n;
    }
  })();
  const balance = tab === "deposit" ? selectedBalance : positionBold;
  const overBalance = amount > balance && !maxed;
  const withdrawalShares = maxed
    ? stBal
    : (amount * WAD) / (sharePriceBold || WAD);
  const routeAmount = isEnsoWithdraw ? withdrawalShares : amount;
  const ensoQuoteKey =
    isEnsoRoute &&
    address &&
    routeAmount > 0n &&
    !overBalance
      ? `${tab}:${address}:${selectedToken.address}:${routeAmount}`
      : null;
  const currentEnsoQuote =
    ensoQuote?.key === ensoQuoteKey ? ensoQuote : null;
  const ensoRoute = currentEnsoQuote?.route ?? null;
  const quoteLoading = Boolean(
    ensoQuoteKey && (!currentEnsoQuote || currentEnsoQuote.loading),
  );
  const quoteError = currentEnsoQuote?.error ?? null;

  useEffect(() => {
    if (!ensoQuoteKey || !address) return;
    const quoteAddress = address;

    const requestId = quoteRequestRef.current + 1;
    quoteRequestRef.current = requestId;

    const abortController = new AbortController();
    const timer = window.setTimeout(async () => {
      setEnsoQuote({ key: ensoQuoteKey, loading: true });
      try {
        async function fetchRoute(slippageBps: number) {
          const params = new URLSearchParams({
            fromAddress: quoteAddress,
            tokenIn: isEnsoWithdraw ? ST_YBOLD : selectedToken.address,
            tokenOut: isEnsoWithdraw
              ? selectedToken.address
              : ST_YBOLD,
            amountIn: routeAmount.toString(),
            slippage: slippageBps.toString(),
          });
          const response = await fetch(`/api/enso/route?${params}`, {
            signal: abortController.signal,
          });
          const data: unknown = await response.json();

          if (!response.ok) throw new Error(routeErrorMessage(data));
          if (!isTrustedEnsoRoute(data, quoteAddress)) {
            throw new Error("Enso returned an unrecognized router.");
          }
          return data;
        }

        const probeRoute = await fetchRoute(0);
        const priceImpact = ensoPriceImpactPercent(probeRoute);
        if (priceImpact === null) {
          throw new Error("Enso did not return a verifiable price impact.");
        }
        if (priceImpact >= ENSO_PRICE_IMPACT_HARD_CAP_PERCENT) {
          throw new Error(
            `Route impact is ${priceImpact.toFixed(2)}%. Transactions at or above ${ENSO_PRICE_IMPACT_HARD_CAP_PERCENT}% are not supported.`,
          );
        }
        if (priceImpact > ENSO_PRICE_IMPACT_TOLERANCE_PERCENT) {
          throw new Error(
            `Route impact is ${priceImpact.toFixed(2)}%, above the ${ENSO_PRICE_IMPACT_TOLERANCE_PERCENT}% tolerance. Try a smaller amount.`,
          );
        }

        const remainingSlippage = remainingEnsoSlippageBps(priceImpact);
        const data =
          remainingSlippage > 0
            ? await fetchRoute(remainingSlippage)
            : probeRoute;

        if (quoteRequestRef.current === requestId) {
          setEnsoQuote({ key: ensoQuoteKey, loading: false, route: data });
        }
      } catch (quoteFailure) {
        if (
          !abortController.signal.aborted &&
          quoteRequestRef.current === requestId
        ) {
          setEnsoQuote({
            key: ensoQuoteKey,
            loading: false,
            error:
              quoteFailure instanceof Error
                ? quoteFailure.message
                : "Unable to find an Enso route.",
          });
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [
    address,
    ensoQuoteKey,
    isEnsoWithdraw,
    routeAmount,
    selectedToken.address,
  ]);

  const ensoAmountOut = ensoRoute ? BigInt(ensoRoute.amountOut) : 0n;
  const expectedShares = isEnsoDeposit ? ensoAmountOut : 0n;
  const expectedBold =
    tab === "withdraw" || selectedToken.symbol === "BOLD"
      ? amount
      : (expectedShares * (sharePriceBold || WAD)) / WAD;
  const depositShares =
    selectedToken.symbol === "BOLD"
      ? (amount * WAD) / (sharePriceBold || WAD)
      : expectedShares;
  const hasExpectedPosition =
    amount > 0n && !overBalance && (!isEnsoRoute || !!ensoRoute);
  const displayedPositionShares = hasExpectedPosition
    ? tab === "deposit"
      ? stBal + depositShares
      : stBal > withdrawalShares
        ? stBal - withdrawalShares
        : 0n
    : stBal;
  const displayedPositionBold = hasExpectedPosition
    ? tab === "deposit"
      ? positionBold + expectedBold
      : positionBold > amount
        ? positionBold - amount
        : 0n
    : positionBold;
  const estimatedUsd =
    tab === "withdraw"
      ? Number(formatUnits(amount, 18))
      : selectedToken.symbol === "BOLD" || ensoRoute
        ? Number(formatUnits(expectedBold, 18))
        : null;
  const estYearly = apy7d
    ? Number(formatUnits(expectedBold, 18)) * apy7d
    : 0;

  const busy = stage !== null;
  const needsRoute = isEnsoRoute && amount > 0n;
  const disabled =
    busy ||
    (!!address &&
      (amount === 0n ||
        overBalance ||
        quoteLoading ||
        (needsRoute && !ensoRoute)));

  function resetMessages() {
    setTransactionOverlay(null);
  }

  function resetAmount() {
    setInput("");
    setMaxed(false);
    setSelectedPercent(null);
    setEnsoQuote(null);
  }

  function selectToken(token: DepositToken) {
    setSelectedSymbol(token.symbol);
    resetAmount();
    resetMessages();
    tokenMenuRef.current?.removeAttribute("open");
  }

  function setPercentage(percent: number) {
    resetMessages();
    setMaxed(percent === 100);
    setSelectedPercent(percent);
    setInput(formatUnits((balance * BigInt(percent)) / 100n, inputDecimals));
  }

  async function approve(
    tokenAddress: DepositToken["address"],
    spender: `0x${string}`,
    approvalAmount: bigint,
  ) {
    return writeContractAsync({
      chainId: mainnet.id,
      address: tokenAddress,
      abi: approveAbi,
      functionName: "approve",
      args: [spender, approvalAmount],
    });
  }

  async function executeTransactionStep({
    stageLabel,
    confirmMessage,
    pendingTitle,
    send,
  }: {
    stageLabel: string;
    confirmMessage: string;
    pendingTitle: string;
    send: () => Promise<Hash>;
  }) {
    if (!publicClient) throw new Error("Mainnet RPC is unavailable.");

    setStage(stageLabel);
    setTransactionOverlay({
      state: "confirming",
      message: confirmMessage,
    });
    const hash = await send();
    setTransactionOverlay({
      state: "pending",
      title: pendingTitle,
      hash,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted.");
    }
    return hash;
  }

  async function run() {
    if (!address || !publicClient || amount === 0n) return;
    resetMessages();
    let lastHash: Hash | undefined;
    let successTitle = "Transaction complete";
    let successMessage = "Your balances have been updated.";

    try {
      if (tab === "deposit" && selectedToken.symbol === "BOLD") {
        const needsApproval = depositAllowance < amount;
        if (needsApproval) {
          lastHash = await executeTransactionStep({
            stageLabel: "Approving BOLD… (1/2)",
            confirmMessage: "Approve BOLD to continue with your deposit.",
            pendingTitle: "Approve() transaction pending",
            send: () => approve(selectedToken.address, YBOLD_ZAPPER, amount),
          });
        }
        lastHash = await executeTransactionStep({
          stageLabel: needsApproval ? "Depositing… (2/2)" : "Depositing…",
          confirmMessage: "Confirm your BOLD deposit.",
          pendingTitle: "Deposit() transaction pending",
          send: () =>
            writeContractAsync({
              chainId: mainnet.id,
              address: YBOLD_ZAPPER,
              abi: zapperAbi,
              functionName: "zapIn",
              args: [amount, address],
            }),
        });
        successTitle = "Deposit complete";
        successMessage = "Your ysyBOLD is now in your wallet.";
      } else if (tab === "deposit") {
        if (!ensoRoute || !isTrustedEnsoRoute(ensoRoute, address)) {
          throw new Error("Refresh the Enso quote before depositing.");
        }

        const needsApproval =
          !selectedToken.isNative && depositAllowance < amount;
        const needsUsdtReset =
          selectedToken.symbol === "USDT" &&
          depositAllowance > 0n &&
          depositAllowance < amount;

        if (needsUsdtReset) {
          lastHash = await executeTransactionStep({
            stageLabel: "Resetting USDT approval… (1/3)",
            confirmMessage:
              "Reset your existing USDT approval before setting a new one.",
            pendingTitle: "Approve() transaction pending",
            send: () =>
              approve(selectedToken.address, ENSO_MAINNET_ROUTER, 0n),
          });
        }
        if (needsApproval) {
          const approvalStage = needsUsdtReset
              ? `Approving ${selectedToken.symbol}… (2/3)`
              : `Approving ${selectedToken.symbol}… (1/2)`;
          lastHash = await executeTransactionStep({
            stageLabel: approvalStage,
            confirmMessage: `Approve ${selectedToken.symbol} to continue with your zap.`,
            pendingTitle: "Approve() transaction pending",
            send: () =>
              approve(selectedToken.address, ENSO_MAINNET_ROUTER, amount),
          });
        }

        const zapStage = needsUsdtReset
            ? "Zapping into ysyBOLD… (3/3)"
            : needsApproval
              ? "Zapping into ysyBOLD… (2/2)"
              : "Zapping into ysyBOLD…";
        lastHash = await executeTransactionStep({
          stageLabel: zapStage,
          confirmMessage: `Confirm your ${selectedToken.symbol} zap into ysyBOLD.`,
          pendingTitle: "Zap transaction pending",
          send: () =>
            sendTransactionAsync({
              chainId: mainnet.id,
              to: ensoRoute.tx.to,
              data: ensoRoute.tx.data,
              value: BigInt(ensoRoute.tx.value),
            }),
        });
        successTitle = "Zap complete";
        successMessage = "Your ysyBOLD is now in your wallet.";
      } else {
        const clamped =
          withdrawalShares > stBal ? stBal : withdrawalShares;
        const isDirectBoldWithdrawal = selectedToken.symbol === "BOLD";
        if (
          !isDirectBoldWithdrawal &&
          (!ensoRoute || !isTrustedEnsoRoute(ensoRoute, address))
        ) {
          throw new Error("Refresh the Enso quote before withdrawing.");
        }

        const withdrawalSpender = isDirectBoldWithdrawal
          ? YBOLD_ZAPPER
          : ENSO_MAINNET_ROUTER;
        const withdrawalAllowance = isDirectBoldWithdrawal
          ? stAllowance
          : stEnsoAllowance;
        const needsApproval = withdrawalAllowance < clamped;
        if (needsApproval) {
          lastHash = await executeTransactionStep({
            stageLabel: "Approving withdrawal… (1/2)",
            confirmMessage: "Approve ysyBOLD to continue with your withdrawal.",
            pendingTitle: "Approve() transaction pending",
            send: () => approve(ST_YBOLD, withdrawalSpender, clamped),
          });
        }
        lastHash = await executeTransactionStep({
          stageLabel: needsApproval
            ? "Withdrawing… (2/2)"
            : "Withdrawing…",
          confirmMessage: isDirectBoldWithdrawal
            ? "Confirm your withdrawal back to BOLD."
            : `Confirm your zap out to ${selectedToken.symbol}.`,
          pendingTitle: isDirectBoldWithdrawal
            ? "Withdraw() transaction pending"
            : "Zap out transaction pending",
          send: () =>
            isDirectBoldWithdrawal
              ? writeContractAsync({
                  chainId: mainnet.id,
                  address: YBOLD_ZAPPER,
                  abi: zapperAbi,
                  functionName: "zapOut",
                  args: [clamped, address, MAX_LOSS_BPS],
                })
              : sendTransactionAsync({
                  chainId: mainnet.id,
                  to: ensoRoute!.tx.to,
                  data: ensoRoute!.tx.data,
                  value: BigInt(ensoRoute!.tx.value),
                }),
        });
        successTitle = isDirectBoldWithdrawal
          ? "Withdrawal complete"
          : "Zap out complete";
        successMessage = isDirectBoldWithdrawal
          ? "BOLD is back in your wallet."
          : `${selectedToken.symbol} is now in your wallet.`;
      }

      setTransactionOverlay({
        state: "refreshing",
        hash: lastHash,
      });
      resetAmount();
      await Promise.allSettled([
        reads.refetch(),
        selectedBalanceQuery.refetch(),
        depositAllowanceQuery.refetch(),
      ]);
      setTransactionOverlay({
        state: "success",
        title: successTitle,
        message: successMessage,
        hash: lastHash,
      });
    } catch (transactionError) {
      const message =
        transactionError instanceof Error
          ? transactionError.message
          : String(transactionError);
      const wasRejected =
        message.includes("User rejected") ||
        message.toLowerCase().includes("user denied");
      setTransactionOverlay({
        state: "error",
        title: wasRejected ? "Transaction rejected" : "Transaction failed",
        message: wasRejected
          ? "The request was rejected in your wallet."
          : message.split("\n")[0],
        hash: lastHash,
      });
    } finally {
      setStage(null);
    }
  }

  const buttonLabel = quoteLoading
    ? "Finding best route…"
    : tab === "withdraw"
      ? selectedToken.symbol === "BOLD"
        ? "Withdraw BOLD"
        : `Zap out to ${selectedToken.symbol}`
      : selectedToken.symbol === "BOLD"
        ? "Deposit BOLD"
        : `Zap ${selectedToken.symbol} to ysyBOLD`;

  return (
    <div className="relative mx-auto w-full max-w-md rounded-lg border border-line bg-surface p-6 min-[900px]:mx-0">
      <div
        className="mb-5 flex rounded-full border border-line bg-background p-1"
        role="tablist"
      >
        {(["deposit", "withdraw"] as const).map((nextTab) => (
          <button
            key={nextTab}
            role="tab"
            aria-selected={tab === nextTab}
            onClick={() => {
              setTab(nextTab);
              if (nextTab === "withdraw") setSelectedSymbol("BOLD");
              resetAmount();
              resetMessages();
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              tab === nextTab
                ? "border border-line bg-surface text-navy"
                : "text-muted hover:text-navy"
            }`}
          >
            {nextTab}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-line bg-background p-4">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <span>Amount</span>
          <div
            className="flex gap-1"
            aria-label="Choose percentage of available balance"
          >
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                type="button"
                aria-pressed={selectedPercent === percent}
                onClick={() => setPercentage(percent)}
                disabled={!address || balance === 0n}
                className={`rounded border px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  selectedPercent === percent
                    ? "border-yearn bg-surface text-yearn"
                    : "border-line bg-surface text-muted hover:text-navy"
                }`}
              >
                {percent === 100 ? "Max" : `${percent}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <input
              inputMode="decimal"
              aria-label={`Amount of ${tab === "deposit" ? selectedToken.symbol : "BOLD"} to ${tab}`}
              placeholder="0.00"
              value={input}
              onChange={(event) => {
                setMaxed(false);
                setSelectedPercent(null);
                resetMessages();
                if (/^\d*\.?\d*$/.test(event.target.value)) {
                  setInput(event.target.value);
                }
              }}
              className="w-full bg-transparent text-3xl font-medium text-navy outline-none placeholder:text-muted/60"
            />
            <p className="mt-2 text-sm text-muted">
              {quoteLoading
                ? "Finding route…"
                : estimatedUsd === null
                  ? "≈ $—"
                  : `≈ $${estimatedUsd.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
            </p>
          </div>

          <div className="text-right">
            {tab === "deposit" ? (
              <TokenSelector
                token={selectedToken}
                menuRef={tokenMenuRef}
                onSelect={selectToken}
              />
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 font-medium">
                <TokenIcon token={getDepositToken("BOLD")} />
                BOLD
              </span>
            )}
            <button
              type="button"
              onClick={() => setPercentage(100)}
              disabled={!address || balance === 0n}
              title="Use maximum balance"
              className="ml-auto mt-2 block whitespace-nowrap text-xs text-muted underline-offset-2 transition hover:text-navy hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yearn disabled:cursor-default disabled:no-underline"
            >
              Balance: {address ? fmt(balance, inputDecimals) : "—"}{" "}
              {tab === "deposit" ? selectedToken.symbol : "BOLD"}
            </button>
          </div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line text-sm">
        {tab === "withdraw" && (
          <div className="flex items-center justify-between gap-6 py-2.5">
            <dt className="text-muted">Receive as</dt>
            <dd>
              <TokenSelector
                token={selectedToken}
                menuRef={tokenMenuRef}
                onSelect={selectToken}
              />
            </dd>
          </div>
        )}
        {address && (
          <div className="flex items-start justify-between gap-6 py-2.5">
            <dt className="text-muted">
              {amount > 0n ? "Your Expected Position" : "Your current position"}
            </dt>
            <dd className="text-right">
              {positionLoading ? (
                <span className="text-muted">Loading...</span>
              ) : positionUnavailable ? (
                <span className="text-bad">Unavailable</span>
              ) : amount > 0n && !hasExpectedPosition ? (
                <span className="text-muted">
                  {quoteLoading ? "Finding route…" : "Unavailable"}
                </span>
              ) : (
                <>
                  <span className="block font-medium">
                    {fmt(displayedPositionShares, 18, 4)} ysyBOLD
                  </span>
                  {positionQuoteResult?.status === "success" && (
                    <span className="block text-xs text-muted">
                      ≈ {fmt(displayedPositionBold)} BOLD
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
        )}
        {tab === "deposit" && estYearly > 0 && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">Est. yearly earnings</dt>
            <dd className="font-medium">
              {estYearly.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}{" "}
              BOLD
            </dd>
          </div>
        )}
        {isEnsoRoute && amount > 0n && (
          <div className="flex items-center justify-between gap-6 py-2.5">
            <dt className="text-muted">You receive</dt>
            <dd className="text-right font-medium">
              {quoteLoading
                ? "Finding route…"
                : ensoRoute
                  ? tab === "deposit"
                    ? `≈ ${fmt(expectedShares, 18, 4)} ysyBOLD`
                    : `≈ ${fmt(ensoAmountOut, selectedToken.decimals, 4)} ${selectedToken.symbol}`
                  : "—"}
            </dd>
          </div>
        )}
        {ensoRoute && (
          <div className="flex items-center justify-between gap-6 py-2.5">
            <dt className="text-muted">Route impact</dt>
            <dd className="font-medium">
              {ensoPriceImpactPercent(ensoRoute)?.toFixed(2)}%
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Lockup</dt>
          <dd className="font-medium">None</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">
            {tab === "deposit" ? "Deposit Fees" : "Withdrawal Fees"}
          </dt>
          <dd className="text-right font-medium">
            {isEnsoRoute
              ? `No Yearn ${tab === "deposit" ? "deposit" : "withdrawal"} fee`
              : "None"}
          </dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Performance Fee</dt>
          <dd className="font-medium">10%</dd>
        </div>
      </dl>

      {overBalance && (
        <p className="mt-2 text-sm text-bad">Amount exceeds your balance.</p>
      )}
      {quoteError && <p className="mt-2 text-sm text-bad">{quoteError}</p>}

      {address ? (
        <button
          onClick={run}
          disabled={disabled}
          className="mt-4 w-full rounded-full bg-yearn py-3.5 font-medium text-white transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stage ?? buttonLabel}
        </button>
      ) : (
        <button
          onClick={openConnectModal}
          className="mt-4 w-full rounded-full bg-yearn py-3.5 font-medium text-white transition hover:bg-electric"
        >
          Connect wallet
        </button>
      )}

      {transactionOverlay && (
        <TransactionOverlay
          view={transactionOverlay}
          onClose={() => setTransactionOverlay(null)}
          onRetry={() => void run()}
        />
      )}
    </div>
  );
}
