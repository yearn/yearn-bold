"use client";

import { useState } from "react";
import Image from "next/image";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { BOLD, ST_YBOLD, YBOLD_ZAPPER, zapperAbi } from "@/lib/contracts";

const WAD = 10n ** 18n;
// zapOut slippage guard, in basis points (matches yearn.fi's default tolerance).
const MAX_LOSS_BPS = 50n;

function fmt(value: bigint, dp = 2): string {
  const n = Number(formatUnits(value, 18));
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

type Tab = "deposit" | "withdraw";

export function DepositCard({ apy7d }: { apy7d?: number }) {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const { writeContractAsync } = useWriteContract();

  const [tab, setTab] = useState<Tab>("deposit");
  const [input, setInput] = useState("");
  const [maxed, setMaxed] = useState(false);
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reads = useReadContracts({
    contracts: [
      { chainId: mainnet.id, address: BOLD, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { chainId: mainnet.id, address: ST_YBOLD, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { chainId: mainnet.id, address: BOLD, abi: erc20Abi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", YBOLD_ZAPPER] },
      { chainId: mainnet.id, address: ST_YBOLD, abi: erc20Abi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", YBOLD_ZAPPER] },
      { chainId: mainnet.id, address: YBOLD_ZAPPER, abi: zapperAbi, functionName: "previewRedeem", args: [WAD] },
    ],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const [
    boldBal = 0n,
    stBal = 0n,
    boldAllowance = 0n,
    stAllowance = 0n,
    sharePriceBold = WAD,
  ] = (reads.data ?? []).map((r) =>
    r.status === "success" ? (r.result as bigint) : 0n,
  );
  const ysyBoldBalanceResult = reads.data?.[1];
  const positionQuoteResult = reads.data?.[4];
  const positionLoading = !!address && reads.isPending;
  const positionUnavailable =
    !!address &&
    !positionLoading &&
    (!ysyBoldBalanceResult || ysyBoldBalanceResult.status === "failure");

  // BOLD value of the staked position, quoted by the zapper itself.
  const positionBold = (stBal * (sharePriceBold || WAD)) / WAD;

  const amount = (() => {
    try {
      return input ? parseUnits(input, 18) : 0n;
    } catch {
      return 0n;
    }
  })();

  const busy = stage !== null;
  const balance = tab === "deposit" ? boldBal : positionBold;
  const overBalance = amount > balance && !maxed;

  const inputNum = Number(input) || 0;
  const estYearly = apy7d ? inputNum * apy7d : 0;

  function reset() {
    setError(null);
    setSuccess(null);
  }

  function setPercentage(percent: number) {
    reset();
    setMaxed(percent === 100);
    setSelectedPercent(percent);
    setInput(formatUnits((balance * BigInt(percent)) / 100n, 18));
  }

  async function run() {
    if (!address || !publicClient || amount === 0n) return;
    reset();
    try {
      if (tab === "deposit") {
        const needsApproval = boldAllowance < amount;
        if (needsApproval) {
          setStage("Approving BOLD… (1/2)");
          const h = await writeContractAsync({
            chainId: mainnet.id, address: BOLD, abi: erc20Abi, functionName: "approve", args: [YBOLD_ZAPPER, amount],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        setStage(needsApproval ? "Depositing… (2/2)" : "Depositing…");
        const h = await writeContractAsync({
          chainId: mainnet.id, address: YBOLD_ZAPPER, abi: zapperAbi, functionName: "zapIn", args: [amount, address],
        });
        await publicClient.waitForTransactionReceipt({ hash: h });
        setSuccess("Deposit complete. Your ysyBOLD is in your wallet.");
      } else {
        const shares = maxed
          ? stBal
          : (amount * WAD) / (sharePriceBold || WAD);
        const clamped = shares > stBal ? stBal : shares;
        const needsApproval = stAllowance < clamped;
        if (needsApproval) {
          setStage("Approving withdrawal… (1/2)");
          const h = await writeContractAsync({
            chainId: mainnet.id, address: ST_YBOLD, abi: erc20Abi, functionName: "approve", args: [YBOLD_ZAPPER, clamped],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        setStage(needsApproval ? "Withdrawing… (2/2)" : "Withdrawing…");
        const h = await writeContractAsync({
          chainId: mainnet.id, address: YBOLD_ZAPPER, abi: zapperAbi, functionName: "zapOut", args: [clamped, address, MAX_LOSS_BPS],
        });
        await publicClient.waitForTransactionReceipt({ hash: h });
        setSuccess("Withdrawal complete. BOLD is back in your wallet.");
      }
      setInput("");
      setMaxed(false);
      setSelectedPercent(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("User rejected") ? "Transaction rejected." : msg.split("\n")[0]);
    } finally {
      setStage(null);
      reads.refetch();
    }
  }

  const disabled = busy || (!!address && (amount === 0n || overBalance));

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-line bg-surface p-6 min-[900px]:mx-0">
      <div className="mb-5 flex rounded-full border border-line bg-background p-1" role="tablist">
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setInput("");
              setMaxed(false);
              setSelectedPercent(null);
              reset();
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "border border-line bg-surface text-navy" : "text-muted hover:text-navy"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-line bg-background p-4">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <span>Amount</span>
          <div className="flex gap-1" aria-label="Choose percentage of available balance">
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
              aria-label={`Amount of BOLD to ${tab}`}
              placeholder="0.00"
              value={input}
              onChange={(e) => {
                setMaxed(false);
                setSelectedPercent(null);
                reset();
                if (/^\d*\.?\d*$/.test(e.target.value)) setInput(e.target.value);
              }}
              className="w-full bg-transparent text-3xl font-medium text-navy outline-none placeholder:text-muted/60"
            />
            <p className="mt-2 text-sm text-muted">
              ≈ ${inputNum.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 font-medium">
              <Image src="/bold.png" alt="BOLD" width={24} height={24} className="rounded-full" />
              BOLD
            </span>
            <p className="mt-2 whitespace-nowrap text-xs text-muted">
              Balance: {address ? fmt(balance) : "—"} BOLD
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line text-sm">
        {address && (
          <div className="flex items-start justify-between gap-6 py-2.5">
            <dt className="text-muted">Your position</dt>
            <dd className="text-right">
              {positionLoading ? (
                <span className="text-muted">Loading...</span>
              ) : positionUnavailable ? (
                <span className="text-bad">Unavailable</span>
              ) : (
                <>
                  <span className="block font-medium">{fmt(stBal, 4)} ysyBOLD</span>
                  {positionQuoteResult?.status === "success" && (
                    <span className="block text-xs text-muted">
                      ≈ {fmt(positionBold)} BOLD
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
        )}
        {apy7d !== undefined && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">7-day realized APY</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span aria-hidden className="size-2 rounded-full bg-green" />
              {(apy7d * 100).toFixed(1)}%
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Lockup</dt>
          <dd className="font-medium">None</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Deposit Fees</dt>
          <dd className="font-medium">None</dd>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">Performance Fee</dt>
          <dd className="font-medium">10%</dd>
        </div>
        {tab === "deposit" && estYearly > 0 && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">Est. yearly earnings</dt>
            <dd className="font-medium">
              {estYearly.toLocaleString("en-US", { maximumFractionDigits: 2 })} BOLD
            </dd>
          </div>
        )}
      </dl>

      {overBalance && <p className="mt-2 text-sm text-bad">Amount exceeds your balance.</p>}
      {error && <p className="mt-2 break-words text-sm text-bad">{error}</p>}
      {success && <p className="mt-2 text-sm font-medium text-good">{success}</p>}

      {address ? (
        <button
          onClick={run}
          disabled={disabled}
          className="mt-4 w-full rounded-full bg-yearn py-3.5 font-medium text-white transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stage ?? (tab === "deposit" ? "Deposit BOLD" : "Withdraw BOLD")}
        </button>
      ) : (
        <button
          onClick={openConnectModal}
          className="mt-4 w-full rounded-full bg-yearn py-3.5 font-medium text-white transition hover:bg-electric"
        >
          Connect wallet
        </button>
      )}

    </div>
  );
}
