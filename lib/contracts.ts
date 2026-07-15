export const BOLD = "0x6440f144b7e50D6a8439336510312d2F54beB01D" as const;
export const YBOLD = "0x9F4330700a36B29952869fac9b33f45EEdd8A3d8" as const;
export const ST_YBOLD = "0x23346B04a7f55b8760E5860AA5A77383D63491cD" as const;

export const YBOLD_ZAPPER = "0xe7099092533A3fb693BB123Cd96b8E53B4D83c58" as const;

export const YEARN_VAULT_URL = `https://yearn.fi/v3/1/${YBOLD}`;

// Yearn's yBOLD zapper (same contract yearn.fi routes through): zapIn takes
// BOLD and returns st-yBOLD in one transaction, zapOut reverses it with
// slippage protection. maxLoss is in basis points.
export const zapperAbi = [
  {
    type: "function",
    name: "zapIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_assets", type: "uint256" },
      { name: "_receiver", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "zapOut",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_shares", type: "uint256" },
      { name: "_receiver", type: "address" },
      { name: "_maxLoss", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewDeposit",
    stateMutability: "view",
    inputs: [{ name: "_assets", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewRedeem",
    stateMutability: "view",
    inputs: [{ name: "_shares", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

