"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { YEARN_VAULT_URL } from "@/lib/contracts";

function WalletIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="size-4">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.583 11.09c-1.518 0-2.75 1.223-2.75 2.728 0 1.506 1.232 2.728 2.75 2.728 1.519 0 2.75-1.222 2.75-2.728 0-1.505-1.231-2.727-2.75-2.727Zm-.916 2.728c0-.501.41-.909.916-.909s.917.408.917.91c0 .5-.41.908-.917.908a.914.914 0 0 1-.916-.909Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.833 4.727c0-.501.411-.909.917-.909h16.5a.913.913 0 0 0 .917-.909c0-.502-.41-.909-.917-.909H3.75C2.232 2 1 3.222 1 4.727v12.727C1 19.965 3.052 22 5.583 22H20.25c1.518 0 2.75-1.222 2.75-2.727V8.363c0-1.505-1.232-2.727-2.75-2.727H3.75a.914.914 0 0 1-.917-.909Zm0 12.727V7.3c.287.1.596.156.917.156h16.5c.506 0 .917.407.917.909v10.909c0 .501-.411.909-.917.909H5.583c-1.518 0-2.75-1.221-2.75-2.727Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-3.5">
      <path
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 16H8V7h11v14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <path d="M12 2v10" />
    </svg>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-6">
      <Image src="/yearn-logo.svg" alt="Yearn" width={110} height={30} />
      <nav className="flex items-center gap-6">
        <a
          href={YEARN_VAULT_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 text-sm font-medium text-navy underline-offset-4 transition hover:underline sm:flex"
        >
          Open on Yearn.Fi
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-3"
            aria-hidden="true"
          >
            <path d="M7 4C5.34328 4 4 5.34328 4 7V17C4 18.6567 5.34328 20 7 20H17C18.6567 20 20 18.6567 20 17V16C20 15.4477 20.4477 15 21 15C21.5523 15 22 15.4477 22 16V17C22 19.7613 19.7613 22 17 22H7C4.23872 22 2 19.7613 2 17V7C2 4.23872 4.23872 2 7 2H8C8.55228 2 9 2.44772 9 3C9 3.55228 8.55228 4 8 4H7Z" fill="currentColor" />
            <path d="M14.3 2C13.6925 2 13.2 2.49249 13.2 3.1C13.2 3.70751 13.6925 4.2 14.3 4.2H18.2444L9.12223 13.3222C8.69265 13.7518 8.69265 14.4482 9.12223 14.8778C9.55181 15.3074 10.2483 15.3074 10.6779 14.8778L19.8 5.75565V9.7C19.8 10.3075 20.2925 10.8 20.9 10.8C21.5075 10.8 22 10.3075 22 9.7V3.1C22 2.92275 21.9581 2.75529 21.8836 2.607C21.8954 2.63051 21.9064 2.6545 21.9166 2.67894C21.8633 2.55017 21.7845 2.42947 21.6802 2.32456L21.6791 2.32343L21.6778 2.32213L21.6765 2.32083C21.4775 2.12256 21.2031 2 20.9 2H14.3Z" fill="currentColor" />
            <path d="M21.3211 2.08347C21.4545 2.13878 21.5747 2.21959 21.6755 2.31981C21.5706 2.21552 21.4499 2.13674 21.3211 2.08347Z" fill="currentColor" />
          </svg>
        </a>
        <div ref={menuRef} className="relative">
          <ConnectButton.Custom>
            {({
              account,
              authenticationStatus,
              chain,
              mounted,
              openChainModal,
              openConnectModal,
            }) => {
              const ready = mounted && authenticationStatus !== "loading";
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === "authenticated");

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {!connected ? (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="flex h-10 items-center gap-2 rounded-lg bg-yearn px-3 text-sm font-medium text-white transition hover:bg-electric"
                    >
                      <WalletIcon />
                      Connect wallet
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      type="button"
                      onClick={openChainModal}
                      className="flex h-10 items-center gap-2 rounded-lg bg-yearn px-3 text-sm font-medium text-white transition hover:bg-electric"
                    >
                      <WalletIcon />
                      Switch network
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-haspopup="dialog"
                        className="flex h-10 items-center gap-2 rounded-lg bg-yearn px-3 text-sm font-medium text-white transition hover:bg-electric"
                      >
                        <WalletIcon />
                        {account.displayName}
                      </button>

                      {menuOpen && (
                        <div
                          role="dialog"
                          aria-label="Connected wallet"
                          className="absolute right-0 z-50 mt-3 w-[min(20rem,calc(100vw-2.5rem))] rounded-lg border border-line bg-surface p-4 shadow-[0_16px_40px_rgba(17,27,77,0.12)]"
                        >
                          <div className="rounded-lg bg-surface p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => copyAddress(account.address)}
                                  className="group flex items-center gap-1.5 text-sm font-medium text-navy transition hover:text-yearn"
                                >
                                  {copied ? "Address copied" : account.displayName}
                                  <CopyIcon />
                                </button>
                                {account.displayBalance && (
                                  <p className="mt-1 text-2xl font-medium text-navy">
                                    {account.displayBalance}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  disconnect();
                                  setMenuOpen(false);
                                }}
                                aria-label="Disconnect wallet"
                                title="Disconnect wallet"
                                className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-navy"
                              >
                                <PowerIcon />
                              </button>
                            </div>

                            <a
                              href="https://yearn.fi/portfolio"
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setMenuOpen(false)}
                              className="mt-5 flex w-full items-center justify-center rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium text-navy transition hover:border-navy/25"
                            >
                              View your Yearn portfolio →
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>
    </header>
  );
}
