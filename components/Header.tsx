"use client";

import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { YEARN_VAULT_URL } from "@/lib/contracts";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <div className="flex items-center gap-3">
        <Image src="/yearn-symbol.svg" alt="Yearn" width={32} height={32} />
        <div className="flex items-center gap-2">
          <Image src="/ybold.png" alt="yBOLD" width={22} height={22} className="rounded-full" />
          <span className="text-lg font-bold tracking-tight">yBOLD</span>
          <span className="rounded-full bg-field px-2.5 py-0.5 text-xs font-medium text-muted">
            by Yearn
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <a
          href={YEARN_VAULT_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden text-sm font-medium text-muted transition hover:text-ink sm:block"
        >
          Open in Yearn ↗
        </a>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  );
}
