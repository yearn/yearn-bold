"use client";

import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { YEARN_VAULT_URL } from "@/lib/contracts";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-6">
      <Image src="/yearn-logo.svg" alt="Yearn" width={110} height={30} />
      <nav className="flex items-center gap-3">
        <a
          href={YEARN_VAULT_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full border border-navy px-4 py-1.5 text-sm font-medium text-navy transition hover:bg-navy hover:text-white sm:block"
        >
          Open on Yearn.Fi
        </a>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </nav>
    </header>
  );
}
