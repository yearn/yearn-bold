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
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [tab, setTab] = useState<Tab>("deposit");
  const [input, setInput] = useState("");
  const [maxed, setMaxed] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reads = useReadContracts({
    contracts: [
      { address: BOLD, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { address: ST_YBOLD, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { address: BOLD, abi: erc20Abi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", YBOLD_ZAPPER] },
      { address: ST_YBOLD, abi: erc20Abi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", YBOLD_ZAPPER] },
      { address: YBOLD_ZAPPER, abi: zapperAbi, functionName: "previewRedeem", args: [WAD] },
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

  function setMax() {
    reset();
    setMaxed(true);
    setInput(formatUnits(balance, 18));
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
            address: BOLD, abi: erc20Abi, functionName: "approve", args: [YBOLD_ZAPPER, amount],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        setStage(needsApproval ? "Depositing… (2/2)" : "Depositing…");
        const h = await writeContractAsync({
          address: YBOLD_ZAPPER, abi: zapperAbi, functionName: "zapIn", args: [amount, address],
        });
        await publicClient.waitForTransactionReceipt({ hash: h });
        setSuccess("Deposit complete — your BOLD is earning.");
      } else {
        const shares = maxed
          ? stBal
          : (amount * WAD) / (sharePriceBold || WAD);
        const clamped = shares > stBal ? stBal : shares;
        const needsApproval = stAllowance < clamped;
        if (needsApproval) {
          setStage("Approving withdrawal… (1/2)");
          const h = await writeContractAsync({
            address: ST_YBOLD, abi: erc20Abi, functionName: "approve", args: [YBOLD_ZAPPER, clamped],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        setStage(needsApproval ? "Withdrawing… (2/2)" : "Withdrawing…");
        const h = await writeContractAsync({
          address: YBOLD_ZAPPER, abi: zapperAbi, functionName: "zapOut", args: [clamped, address, MAX_LOSS_BPS],
        });
        await publicClient.waitForTransactionReceipt({ hash: h });
        setSuccess("Withdrawal complete — BOLD is back in your wallet.");
      }
      setInput("");
      setMaxed(false);
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
    <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6">
      <div className="mb-5 flex rounded-full bg-background p-1" role="tablist">
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t);
              setInput("");
              setMaxed(false);
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

      <div className="rounded-md bg-background p-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{tab === "deposit" ? "You deposit" : "You withdraw"}</span>
          <button onClick={setMax} className="font-medium text-yearn hover:text-electric" disabled={!address}>
            {tab === "deposit" ? "Wallet" : "Deposited"}: {address ? fmt(balance) : "—"} BOLD · Max
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            inputMode="decimal"
            aria-label={`Amount of BOLD to ${tab}`}
            placeholder="0.00"
            value={input}
            onChange={(e) => {
              setMaxed(false);
              reset();
              if (/^\d*\.?\d*$/.test(e.target.value)) setInput(e.target.value);
            }}
            className="w-full bg-transparent text-3xl font-medium text-navy outline-none placeholder:text-muted/60"
          />
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 font-medium">
            <Image src="/bold.png" alt="BOLD" width={24} height={24} className="rounded-full" />
            BOLD
          </span>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line text-sm">
        {apy7d !== undefined && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">7-day realized APY</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span aria-hidden className="size-2 rounded-full bg-green" />
              {(apy7d * 100).toFixed(1)}%
            </dd>
          </div>
        )}
        {tab === "deposit" && estYearly > 0 && (
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted">Est. yearly earnings</dt>
            <dd className="font-medium">
              ~{estYearly.toLocaleString("en-US", { maximumFractionDigits: 2 })} BOLD
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between py-2.5">
          <dt className="text-muted">{tab === "deposit" ? "Earning starts" : "Lockup"}</dt>
          <dd className="font-medium">{tab === "deposit" ? "Immediately, one transaction" : "None — withdraw anytime"}</dd>
        </div>
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

      {address && positionBold > 0n && (
        <p className="mt-4 text-center text-sm text-muted">
          Your position: <span className="font-medium text-navy">{fmt(positionBold)} BOLD</span>
        </p>
      )}
    </div>
  );
}
