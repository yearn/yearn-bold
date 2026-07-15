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
import { BOLD, YBOLD, ST_YBOLD, vaultAbi } from "@/lib/contracts";

const WAD = 10n ** 18n;

function fmt(value: bigint, dp = 2): string {
  const n = Number(formatUnits(value, 18));
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

type Tab = "deposit" | "withdraw";

export function DepositCard() {
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
      { address: BOLD, abi: erc20Abi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", YBOLD] },
      { address: YBOLD, abi: erc20Abi, functionName: "allowance", args: [address ?? "0x0000000000000000000000000000000000000000", ST_YBOLD] },
      { address: ST_YBOLD, abi: vaultAbi, functionName: "convertToAssets", args: [WAD] },
      { address: YBOLD, abi: vaultAbi, functionName: "convertToAssets", args: [WAD] },
    ],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const [
    boldBal = 0n,
    stBal = 0n,
    boldAllowance = 0n,
    yAllowance = 0n,
    stPps = 0n,
    yPps = 0n,
  ] = (reads.data ?? []).map((r) =>
    r.status === "success" ? (r.result as bigint) : 0n,
  );

  // BOLD value of one staked share: st-yBOLD -> yBOLD -> BOLD.
  const sharePriceBold = ((stPps || WAD) * (yPps || WAD)) / WAD;
  const positionBold = (stBal * sharePriceBold) / WAD;

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
        let step = 1;
        const total = (boldAllowance < amount ? 1 : 0) + 3;
        if (boldAllowance < amount) {
          setStage(`Approving BOLD… (${step++}/${total})`);
          const h = await writeContractAsync({
            address: BOLD, abi: erc20Abi, functionName: "approve", args: [YBOLD, amount],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        setStage(`Depositing… (${step++}/${total})`);
        const dep = await writeContractAsync({
          address: YBOLD, abi: vaultAbi, functionName: "deposit", args: [amount, address],
        });
        await publicClient.waitForTransactionReceipt({ hash: dep });

        // Stake whatever yBOLD the wallet now holds so it starts earning.
        const yBal = await publicClient.readContract({
          address: YBOLD, abi: erc20Abi, functionName: "balanceOf", args: [address],
        });
        if (yAllowance < yBal) {
          setStage(`Enabling auto-earn… (${step++}/${total})`);
          const h = await writeContractAsync({
            address: YBOLD, abi: erc20Abi, functionName: "approve", args: [ST_YBOLD, yBal],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
        }
        setStage(`Activating… (${step++}/${total})`);
        const stake = await writeContractAsync({
          address: ST_YBOLD, abi: vaultAbi, functionName: "deposit", args: [yBal, address],
        });
        await publicClient.waitForTransactionReceipt({ hash: stake });
        setSuccess(`Deposit complete — your BOLD is earning.`);
      } else {
        // Withdraw: unstake st-yBOLD, then redeem yBOLD back to BOLD.
        const shares = maxed ? stBal : (amount * WAD) / sharePriceBold;
        const clamped = shares > stBal ? stBal : shares;
        setStage("Withdrawing… (1/2)");
        const un = await writeContractAsync({
          address: ST_YBOLD, abi: vaultAbi, functionName: "redeem", args: [clamped, address, address],
        });
        await publicClient.waitForTransactionReceipt({ hash: un });
        const yBal = await publicClient.readContract({
          address: YBOLD, abi: erc20Abi, functionName: "balanceOf", args: [address],
        });
        setStage("Receiving BOLD… (2/2)");
        const red = await writeContractAsync({
          address: YBOLD, abi: vaultAbi, functionName: "redeem", args: [yBal, address, address],
        });
        await publicClient.waitForTransactionReceipt({ hash: red });
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
    <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_48px_-24px_rgba(18,27,68,0.18)]">
      <div className="mb-5 flex rounded-full bg-field p-1">
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setInput("");
              setMaxed(false);
              reset();
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-field p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{tab === "deposit" ? "You deposit" : "You withdraw"}</span>
          <button onClick={setMax} className="font-semibold text-lblue hover:text-lblue-dark" disabled={!address}>
            {tab === "deposit" ? "Wallet" : "Deposited"}: {address ? fmt(balance) : "—"} BOLD · Max
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={input}
            onChange={(e) => {
              setMaxed(false);
              reset();
              if (/^\d*\.?\d*$/.test(e.target.value)) setInput(e.target.value);
            }}
            className="w-full bg-transparent text-3xl font-semibold text-ink outline-none placeholder:text-muted/50"
          />
          <span className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 font-semibold">
            <Image src="/bold.png" alt="BOLD" width={24} height={24} className="rounded-full" />
            BOLD
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-xs text-muted">
        <span>
          {tab === "deposit"
            ? "Starts earning immediately — staking is automatic."
            : "Withdraw anytime. No lockups, no exit fee."}
        </span>
        <Image src="/ybold.png" alt="yBOLD" width={18} height={18} className="rounded-full opacity-80" />
      </div>

      {overBalance && <p className="mt-3 text-sm text-bad">Amount exceeds your balance.</p>}
      {error && <p className="mt-3 break-words text-sm text-bad">{error}</p>}
      {success && <p className="mt-3 text-sm font-medium text-good">{success}</p>}

      {address ? (
        <button
          onClick={run}
          disabled={disabled}
          className="mt-5 w-full rounded-full bg-lblue py-3.5 font-semibold text-white transition hover:bg-lblue-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {stage ?? (tab === "deposit" ? "Deposit BOLD" : "Withdraw BOLD")}
        </button>
      ) : (
        <button
          onClick={openConnectModal}
          className="mt-5 w-full rounded-full bg-lblue py-3.5 font-semibold text-white transition hover:bg-lblue-dark"
        >
          Connect wallet
        </button>
      )}

      {address && positionBold > 0n && (
        <p className="mt-4 text-center text-sm text-muted">
          Your position: <span className="font-semibold text-ink">{fmt(positionBold)} BOLD</span>
        </p>
      )}
    </div>
  );
}
