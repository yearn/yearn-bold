"use client";

import { useEffect, useState } from "react";
import type { Hash } from "viem";

export type TransactionOverlayView = {
  state: "confirming" | "pending" | "refreshing" | "success" | "error";
  title?: string;
  message?: string;
  hash?: Hash;
};

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-12 animate-spin rounded-full border-[3px] border-line border-t-yearn"
    />
  );
}

function SuccessIcon() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <span
      aria-hidden
      className={`flex size-14 items-center justify-center rounded-full border-2 border-green transition duration-300 ${
        visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
      }`}
    >
      <svg
        className="size-7 text-good"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5 13 4 4L19 7"
        />
      </svg>
    </span>
  );
}

function ErrorIcon() {
  return (
    <span
      aria-hidden
      className="flex size-14 items-center justify-center rounded-full border-2 border-bad"
    >
      <svg
        className="size-7 text-bad"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path strokeLinecap="round" d="M7 7l10 10M17 7 7 17" />
      </svg>
    </span>
  );
}

export function TransactionOverlay({
  view,
  onClose,
  onRetry,
}: {
  view: TransactionOverlayView;
  onClose: () => void;
  onRetry: () => void;
}) {
  const canClose = view.state === "success" || view.state === "error";
  const isError = view.state === "error";
  const explorerUrl = view.hash
    ? `https://etherscan.io/tx/${view.hash}`
    : undefined;

  const content = {
    confirming: {
      title: "Confirm in your wallet",
      message: view.message ?? "Confirm the transaction to continue.",
    },
    pending: {
      title: view.title ?? "Transaction pending",
      message: "Waiting for confirmation…",
    },
    refreshing: {
      title: "Transaction confirmed",
      message: "Updating balances…",
    },
    success: {
      title: view.title ?? "Transaction complete",
      message: view.message ?? "Your balances have been updated.",
    },
    error: {
      title: view.title ?? "Transaction failed",
      message: view.message ?? "Transaction failed. Please try again.",
    },
  }[view.state];

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col overflow-hidden rounded-lg bg-surface"
      role="dialog"
      aria-modal="true"
      aria-label="Transaction status"
    >
      {canClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close transaction status"
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yearn"
        >
          <svg
            aria-hidden
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}

      <div
        className="flex flex-1 flex-col items-center justify-center p-6 text-center"
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
      >
        {view.state === "success" ? (
          <SuccessIcon />
        ) : view.state === "error" ? (
          <ErrorIcon />
        ) : (
          <Spinner />
        )}

        <h3 className="mb-2 mt-6 text-lg font-semibold text-navy">
          {content.title}
        </h3>
        <p className="max-w-xs text-sm text-muted">{content.message}</p>

        {(view.state === "pending" || view.state === "refreshing") &&
          explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 text-sm font-semibold text-navy underline underline-offset-2"
            >
              View on block explorer
            </a>
          )}

        {canClose && (
          <button
            type="button"
            onClick={isError ? onRetry : onClose}
            className="mt-6 w-full max-w-xs rounded-full bg-yearn py-3 font-medium text-white transition hover:bg-electric focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yearn"
          >
            {isError ? "Try Again" : "Nice"}
          </button>
        )}
      </div>
    </div>
  );
}
