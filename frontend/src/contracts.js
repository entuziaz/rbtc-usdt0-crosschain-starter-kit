// NOTE: ABIs are imported from Hardhat artifacts.
// Run `npx hardhat compile` before starting the frontend.

import LendingPoolArtifact from "../../artifacts/contracts/core/LendingPool.sol/LendingPool.json";
import OracleRouterArtifact from "../../artifacts/contracts/oracles/OracleRouter.sol/OracleRouter.json";

export const CONTRACTS = {
  oracleRouter: import.meta.env.VITE_ORACLE_ROUTER,
  lendingPool: import.meta.env.VITE_LENDING_POOL,
  usdt0: import.meta.env.VITE_USDT0,
};


export const ABIS = {
  lendingPool: LendingPoolArtifact.abi,
  oracleRouter: OracleRouterArtifact.abi,
};

export const ROOTSTOCK_TESTNET = {
  chainId: "0x1f", // 31
  chainName: "Rootstock Testnet",
  rpcUrls: ["https://public-node.testnet.rsk.co"],
  nativeCurrency: {
    name: "tRBTC",
    symbol: "tRBTC",
    decimals: 18,
  },
};
