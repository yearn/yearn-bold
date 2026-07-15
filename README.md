# bold.yearn.fi — yBOLD lander

A single-page acquisition and position-management experience for
[yBOLD](https://yearn.fi/v3/1/0x9F4330700a36B29952869fac9b33f45EEdd8A3d8),
aimed at Liquity referral traffic. Deposit BOLD, earn across Liquity V2
Stability Pools, withdraw BOLD — without leaving the page.

## Stack

- Next.js (App Router) + Tailwind CSS v4
- wagmi v2 + viem + RainbowKit for wallet connection
- Live APY/TVL from Yearn's [ydaemon](https://ydaemon.yearn.fi) (revalidated every 5 minutes)

## Contracts (Ethereum mainnet)

| | Address |
|---|---|
| BOLD | `0x6440f144b7e50D6a8439336510312d2F54beB01D` |
| yBOLD vault | `0x9F4330700a36B29952869fac9b33f45EEdd8A3d8` |
| Staked yBOLD (st-yBOLD) | `0x23346B04a7f55b8760E5860AA5A77383D63491cD` |

Deposit flow: approve BOLD → deposit into yBOLD → approve → stake into
st-yBOLD (yield accrues to stakers, so the lander auto-stakes). Withdraw
reverses it. Internal tokens are hidden from the UI; users see BOLD in,
BOLD out.

## Develop

```bash
cp .env.example .env.local   # add a free WalletConnect project ID
npm install
npm run dev
```
