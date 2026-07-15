"use client";

import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { YEARN_VAULT_URL } from "@/lib/contracts";

export function Header() {
  return (
    <header className="sticky top-4 z-10 mx-auto mt-4 flex w-[calc(100%-2.5rem)] max-w-6xl items-center justify-between rounded-lg border border-line bg-surface px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Image src="/yearn-symbol.svg" alt="Yearn" width={28} height={28} />
        <span className="text-lg font-medium tracking-tight">yBOLD</span>
        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
          by Yearn
        </span>
      </div>
      <nav className="flex items-center gap-3">
        <a
          href={YEARN_VAULT_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full border border-navy px-4 py-1.5 text-sm font-medium text-navy transition hover:bg-navy hover:text-white sm:block"
        >
          Open in Yearn
        </a>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </nav>
    </header>
  );
}
