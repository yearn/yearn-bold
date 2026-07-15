export const BOLD = "0x6440f144b7e50D6a8439336510312d2F54beB01D" as const;
export const YBOLD = "0x9F4330700a36B29952869fac9b33f45EEdd8A3d8" as const;
export const ST_YBOLD = "0x23346B04a7f55b8760E5860AA5A77383D63491cD" as const;

export const YEARN_VAULT_URL = `https://yearn.fi/v3/1/${YBOLD}`;

// Minimal ERC-4626 surface used by the lander. Both yBOLD and st-yBOLD
// are standard v3 vaults, so one ABI covers deposit, redeem, and reads.
export const vaultAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "assets", type: "uint256" }],
  },
] as const;
