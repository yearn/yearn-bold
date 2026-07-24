import Image from "next/image";
import { DepositCard } from "@/components/DepositCard";
import { Header } from "@/components/Header";
import { BOLD, YBOLD, ST_YBOLD, YEARN_VAULT_URL } from "@/lib/contracts";
import { getVaultStats } from "@/lib/ydaemon";

const pct = (v: number, dp = 2) => `${(v * 100).toFixed(dp)}%`;
const usd = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${Math.round(v).toLocaleString("en-US")}`;

export default async function Home() {
  const stats = await getVaultStats();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 sm:px-6">
        {/* Hero — asymmetric: product story left, deposit box right */}
        <section className="grid items-center gap-12 pb-12 pt-6 min-[900px]:grid-cols-[1.15fr_minmax(0,26rem)] min-[900px]:pb-16 min-[900px]:pt-10">
          <div className="text-center min-[900px]:text-left">
            <div className="flex items-center justify-center gap-4 min-[900px]:justify-start">
              <Image src="/ybold.png" alt="" width={88} height={88} className="rounded-full" />
              <span className="text-5xl font-bold tracking-tight min-[900px]:text-6xl">yBOLD</span>
            </div>
            <h1 className="mx-auto mt-5 max-w-xl text-[40px] font-medium leading-[1.08] tracking-tight min-[900px]:mx-0 min-[900px]:text-[56px]">
              Earn BOLD yield automatically across Liquity Stability Pools
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-navy/75 min-[900px]:mx-0">
              Yearn allocated your BOLD across WETH, wstETH, and rETH Stability
              Pools, harvests liquidation gains, and compounds everything back
              into BOLD.
            </p>

            {/* Metrics — focused snapshot of current yield and vault size */}
            <div className="mx-auto mt-8 max-w-lg min-[900px]:mx-0">
              {stats ? (
                <dl className="grid grid-cols-2 gap-6">
                  <div>
                    <dt className="flex items-center justify-center gap-2 text-sm text-muted min-[900px]:justify-start">
                      <span aria-hidden className="size-2 rounded-full bg-green" />
                      7-day realized APY
                    </dt>
                    <dd className="mt-1 text-4xl font-medium text-yearn sm:text-5xl">
                      {pct(stats.apy7d, 1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted">Total deposits</dt>
                    <dd className="mt-1 text-4xl font-medium text-yearn sm:text-5xl">
                      {usd(stats.tvlUsd)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-navy/75">
                  Live APY temporarily unavailable —{" "}
                  <a className="text-yearn underline" href={YEARN_VAULT_URL}>
                    view on yearn.fi
                  </a>
                  .
                </p>
              )}
            </div>
          </div>

          <DepositCard apy7d={stats?.apy7d} />
        </section>

        {/* Geometric divider */}
        <div aria-hidden className="flex items-end justify-center gap-2 py-2">
          <div className="size-14 rounded-full bg-yearn" />
          <div className="h-7 w-14 self-end rounded-t-full bg-yellow" />
          <div className="size-14 rounded-md bg-green" />
          <div className="h-3.5 w-36 self-center rounded-full bg-navy" />
        </div>

        {/* Yield sources — modular colored panels */}
        <section className="py-14">
          <h2 className="text-3xl font-medium tracking-tight">Where the yield comes from</h2>
          <p className="mt-3 max-w-2xl text-lg text-navy/75">
            Stability Pool returns move more than ordinary lending rates. yBOLD
            earns from three sources, which is why recent APY can differ from
            long-run averages.
          </p>
          <div className="mt-8 grid gap-4 min-[900px]:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface p-7">
              <h3 className="text-xl font-medium">Borrower interest</h3>
              <p className="mt-2 text-navy/75">
                Liquity V2 borrowers pay user-set interest rates on their BOLD
                debt. A share flows continuously to Stability Pool depositors.
              </p>
            </div>
            <div className="rounded-lg bg-yellow p-7">
              <h3 className="text-xl font-medium">Trove fees</h3>
              <p className="mt-2 text-navy/75">
                Upfront fees from new and adjusted Troves are distributed to the
                Stability Pools. These arrive in variable, sometimes lumpy
                amounts.
              </p>
            </div>
            <div className="rounded-lg bg-green p-7">
              <h3 className="text-xl font-medium">Liquidation gains</h3>
              <p className="mt-2 text-navy/75">
                When Troves are liquidated, pools buy their collateral at a
                discount. Yearn auctions the WETH, wstETH, and rETH back into
                BOLD.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-14">
          <h2 className="text-3xl font-medium tracking-tight">How yBOLD compares</h2>
          <p className="mt-3 max-w-2xl text-lg text-navy/75">
            yBOLD can flex allocation across the three Stability Pools as
            opportunities change. sBOLD uses set weights, while native
            depositors choose one pool.
          </p>
          <div className="mt-8 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="px-6 py-4 font-normal"></th>
                  <th className="px-6 py-4 font-medium text-navy">
                    <span className="flex items-center gap-2">
                      <Image src="/ybold.png" alt="" width={18} height={18} className="rounded-full" />
                      yBOLD
                    </span>
                  </th>
                  <th className="px-6 py-4 font-medium text-navy">sBOLD</th>
                  <th className="px-6 py-4 font-medium text-navy">
                    Native Stability Pool
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:px-6 [&_td]:py-3.5">
                <tr className="border-b border-line">
                  <td className="text-muted">Allocation model</td>
                  <td className="font-medium">Flexible across all three pools</td>
                  <td className="text-navy/75">Set weights across all three pools</td>
                  <td className="text-navy/75">Manual, one pool at a time</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="text-muted">Liquidation gains</td>
                  <td className="font-medium">Auctioned back to BOLD for you</td>
                  <td className="text-navy/75">Solver-swapped back to BOLD</td>
                  <td className="text-navy/75">
                    You claim and sell the collateral yourself
                  </td>
                </tr>
                <tr className="border-b border-line">
                  <td className="text-muted">Compounding</td>
                  <td className="font-medium">Automatic</td>
                  <td className="text-navy/75">Automatic</td>
                  <td className="text-navy/75">Manual</td>
                </tr>
                <tr>
                  <td className="text-muted">Fees</td>
                  <td className="font-medium">
                    10% on earnings; no deposit or withdrawal fees
                  </td>
                  <td className="text-navy/75">
                    Configurable entry fee, initially set to 0
                  </td>
                  <td className="text-navy/75">None</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            Product details:{" "}
            <a
              className="underline decoration-line underline-offset-4 transition hover:text-navy"
              href={YEARN_VAULT_URL}
              target="_blank"
              rel="noreferrer"
            >
              Yearn vault
            </a>
            ,{" "}
            <a
              className="underline decoration-line underline-offset-4 transition hover:text-navy"
              href="https://k3-capital.gitbook.io/sbold/introducing-sbold"
              target="_blank"
              rel="noreferrer"
            >
              K3 Capital documentation
            </a>{" "}
            and{" "}
            <a
              className="underline decoration-line underline-offset-4 transition hover:text-navy"
              href="https://www.liquity.org/blog/sbold---the-on-chain-defi-savings-account"
              target="_blank"
              rel="noreferrer"
            >
              Liquity&apos;s overview
            </a>
            .
          </p>
        </section>

        {/* How it works — navy anchor panel with geometric accent */}
        <section className="py-14">
          <div className="relative overflow-hidden rounded-lg bg-navy p-8 text-white sm:p-12">
            <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-yellow" />
            <div aria-hidden className="absolute -bottom-10 right-24 hidden h-20 w-40 rounded-t-full bg-electric sm:block" />
            <h2 className="relative text-3xl font-medium tracking-tight">
              Deposit BOLD. Earn. Withdraw BOLD.
            </h2>
            <div className="relative mt-8 grid max-w-4xl gap-8 min-[900px]:grid-cols-3">
              {[
                ["1", "Deposit", "One transaction puts your BOLD to work — staking is handled for you."],
                ["2", "Earn", "Yield and liquidation gains are harvested and compounded. Your position value in BOLD grows over time."],
                ["3", "Withdraw", "Redeem back to BOLD in your wallet anytime, subject to available Stability Pool liquidity."],
              ].map(([n, t, b]) => (
                <div key={n}>
                  <div aria-hidden className="flex size-9 items-center justify-center rounded-full bg-green text-sm font-medium text-navy">
                    {n}
                  </div>
                  <h3 className="mt-4 text-lg font-medium">{t}</h3>
                  <p className="mt-1.5 text-white/70">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div>
            <Image src="/yearn-logo.svg" alt="Yearn" width={110} height={30} />
            <p className="mt-4 max-w-sm text-sm text-muted">
              APY figures are realized annualized returns over the stated
              window, not forecasts. Past performance does not predict future
              results. Smart contract and depeg risks apply.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm">
            <a className="text-navy/75 transition hover:text-navy" href={YEARN_VAULT_URL} target="_blank" rel="noreferrer">
              yBOLD on yearn.fi ↗
            </a>
            <a className="text-navy/75 transition hover:text-navy" href="https://www.liquity.org/earn" target="_blank" rel="noreferrer">
              Liquity Earn ↗
            </a>
            <a className="text-navy/75 transition hover:text-navy" href={`https://etherscan.io/address/${YBOLD}`} target="_blank" rel="noreferrer">
              yBOLD contract ↗
            </a>
            <a className="text-navy/75 transition hover:text-navy" href={`https://etherscan.io/address/${ST_YBOLD}`} target="_blank" rel="noreferrer">
              Staked yBOLD contract ↗
            </a>
            <a className="text-navy/75 transition hover:text-navy" href={`https://etherscan.io/address/${BOLD}`} target="_blank" rel="noreferrer">
              BOLD contract ↗
            </a>
            <a className="text-navy/75 transition hover:text-navy" href="https://docs.yearn.fi" target="_blank" rel="noreferrer">
              Yearn docs ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
