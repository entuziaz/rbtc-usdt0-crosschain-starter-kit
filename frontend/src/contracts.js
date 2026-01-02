// NOTE: ABIs are imported from Hardhat artifacts.
// Run `npx hardhat compile` before starting the frontend.

import LendingPoolArtifact from "../../artifacts/contracts/core/LendingPool.sol/LendingPool.json";
import OracleRouterArtifact from "../../artifacts/contracts/oracles/OracleRouter.sol/OracleRouter.json";

export const CONTRACTS = {
  lendingPool: "0xDb78D92d465F14533eE9eDBe7460180Fd501dbf4",
  oracleRouter: "0x51a17751e25E557Adfd6909c107ca8BdFF8733a5",
};

export const ABIS = {
  lendingPool: LendingPoolArtifact.abi,
  oracleRouter: OracleRouterArtifact.abi,
};
