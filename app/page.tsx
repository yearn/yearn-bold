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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        {/* Hero */}
        <section className="grid items-start gap-12 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Earn BOLD yield automatically across Liquity Stability Pools
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Deposit BOLD once. Yearn allocates it across the WETH, wstETH, and
              rETH Stability Pools, harvests liquidation gains, and compounds
              everything back into BOLD.
            </p>

            {/* Stats */}
            <div className="mt-8 rounded-3xl border border-line bg-surface p-6">
              {stats ? (
                <>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-bold text-lblue">{pct(stats.apy7d, 1)}</span>
                    <span className="pb-1.5 text-sm font-semibold text-ink">7-day realized APY</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Annualized from the last 7 days of performance — recent
                    results from borrower interest, Trove fees, and liquidation
                    gains. Not a forecast.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
                    <div>
                      <div className="text-lg font-semibold">{pct(stats.apy30d, 1)}</div>
                      <div className="text-xs text-muted">30-day realized</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{pct(stats.ret7d)}</div>
                      <div className="text-xs text-muted">actual 7-day return</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{pct(stats.apyInception, 1)}</div>
                      <div className="text-xs text-muted">since inception</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{usd(stats.tvlUsd)}</div>
                      <div className="text-xs text-muted">TVL</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Live APY temporarily unavailable —{" "}
                  <a className="text-lblue underline" href={YEARN_VAULT_URL}>
                    view on yearn.fi
                  </a>
                  .
                </p>
              )}
            </div>

            <p className="mt-4 text-sm text-muted">
              {stats ? `${pct(stats.performanceFee, 0)} performance fee` : "10% performance fee"} ·
              no management fee · no lockup — withdraw anytime
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <DepositCard />
          </div>
        </section>

        {/* Where the yield comes from */}
        <section className="py-10">
          <h2 className="text-2xl font-bold tracking-tight">Where the yield comes from</h2>
          <p className="mt-2 max-w-2xl text-muted">
            Stability Pool returns move more than ordinary lending rates. yBOLD
            earns from three sources, which is why recent APY can differ from
            long-run averages.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Borrower interest",
                body: "Liquity V2 borrowers pay user-set interest rates on their BOLD debt. A share flows continuously to Stability Pool depositors.",
              },
              {
                title: "Trove fees",
                body: "Upfront fees from new and adjusted Troves are distributed to the Stability Pools. These arrive in variable, sometimes lumpy amounts.",
              },
              {
                title: "Liquidation gains",
                body: "When Troves are liquidated, pools buy their collateral at a discount. Yearn auctions the WETH, wstETH, and rETH back into BOLD.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-3xl border border-line bg-surface p-6">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it compares */}
        <section className="py-10">
          <h2 className="text-2xl font-bold tracking-tight">How yBOLD compares</h2>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-surface">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="px-6 py-4 font-medium"></th>
                  <th className="px-6 py-4 font-medium">
                    <span className="flex items-center gap-2">
                      <Image src="/ybold.png" alt="" width={18} height={18} className="rounded-full" />
                      yBOLD
                    </span>
                  </th>
                  <th className="px-6 py-4 font-medium">Native Stability Pool</th>
                </tr>
              </thead>
              <tbody className="[&_td]:px-6 [&_td]:py-3.5">
                <tr className="border-b border-line">
                  <td className="text-muted">Pool allocation</td>
                  <td className="font-medium">Automatic, across all three pools</td>
                  <td>Manual, one pool at a time</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="text-muted">Liquidation collateral</td>
                  <td className="font-medium">Auctioned back to BOLD for you</td>
                  <td>You claim and sell it yourself</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="text-muted">Compounding</td>
                  <td className="font-medium">Automatic</td>
                  <td>Manual</td>
                </tr>
                <tr>
                  <td className="text-muted">Fees</td>
                  <td className="font-medium">10% on earnings only</td>
                  <td>None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How it works */}
        <section className="py-10">
          <div className="rounded-3xl bg-ink p-8 text-white sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight">
              Deposit BOLD. Earn. Withdraw BOLD.
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {[
                ["1", "Deposit", "Your BOLD goes into the yBOLD vault and starts earning immediately — staking is handled for you."],
                ["2", "Earn", "Yield and liquidation gains are harvested and compounded. Your position value in BOLD grows over time."],
                ["3", "Withdraw", "Redeem back to BOLD in your wallet anytime, subject to available Stability Pool liquidity."],
              ].map(([n, t, b]) => (
                <div key={n}>
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                    {n}
                  </div>
                  <h3 className="mt-3 font-semibold">{t}</h3>
                  <p className="mt-1 text-sm text-white/70">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Image src="/yearn-logo.svg" alt="Yearn" width={110} height={30} />
            <p className="mt-3 max-w-sm text-xs text-muted">
              APY figures are realized annualized returns over the stated
              window, not forecasts. Past performance does not predict future
              results. Smart contract and depeg risks apply.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <a className="text-muted transition hover:text-ink" href={YEARN_VAULT_URL} target="_blank" rel="noreferrer">
              yBOLD on yearn.fi ↗
            </a>
            <a className="text-muted transition hover:text-ink" href="https://www.liquity.org/earn" target="_blank" rel="noreferrer">
              Liquity Earn ↗
            </a>
            <a className="text-muted transition hover:text-ink" href={`https://etherscan.io/address/${YBOLD}`} target="_blank" rel="noreferrer">
              yBOLD contract ↗
            </a>
            <a className="text-muted transition hover:text-ink" href={`https://etherscan.io/address/${ST_YBOLD}`} target="_blank" rel="noreferrer">
              Staked yBOLD contract ↗
            </a>
            <a className="text-muted transition hover:text-ink" href={`https://etherscan.io/address/${BOLD}`} target="_blank" rel="noreferrer">
              BOLD contract ↗
            </a>
            <a className="text-muted transition hover:text-ink" href="https://docs.yearn.fi" target="_blank" rel="noreferrer">
              Yearn docs ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
