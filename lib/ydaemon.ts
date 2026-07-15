import { YBOLD, ST_YBOLD } from "./contracts";

const YDAEMON = "https://ydaemon.yearn.fi/1/vaults/";

export type VaultStats = {
  /** 7-day realized APY, annualized from st-yBOLD price-per-share. */
  apy7d: number;
  /** 30-day realized APY. */
  apy30d: number;
  /** Since-inception APY. */
  apyInception: number;
  /** Actual (non-annualized) return over the last 7 days. */
  ret7d: number;
  /** Vault TVL in USD. */
  tvlUsd: number;
  /** Performance fee, e.g. 0.1 = 10%. */
  performanceFee: number;
};

type YDaemonVault = {
  apr: {
    fees: { performance: number };
    points: { weekAgo: number; monthAgo: number; inception: number };
    pricePerShare: { today: number; weekAgo: number };
  };
  tvl: { tvl: number };
};

// APY lives on st-yBOLD (yield accrues to stakers); TVL is measured on the
// yBOLD vault where all deposited BOLD sits.
export async function getVaultStats(): Promise<VaultStats | null> {
  try {
    const [st, y] = (await Promise.all(
      [ST_YBOLD, YBOLD].map((addr) =>
        fetch(`${YDAEMON}${addr}`, { next: { revalidate: 300 } }).then((r) => {
          if (!r.ok) throw new Error(`ydaemon ${r.status}`);
          return r.json();
        }),
      ),
    )) as [YDaemonVault, YDaemonVault];

    const pps = st.apr.pricePerShare;
    return {
      apy7d: st.apr.points.weekAgo,
      apy30d: st.apr.points.monthAgo,
      apyInception: st.apr.points.inception,
      ret7d: pps.weekAgo > 0 ? pps.today / pps.weekAgo - 1 : 0,
      tvlUsd: y.tvl.tvl,
      performanceFee: st.apr.fees.performance,
    };
  } catch {
    return null;
  }
}
