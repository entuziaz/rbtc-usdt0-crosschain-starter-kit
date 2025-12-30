require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
  },
  networks: {
    rootstock_testnet: {
      url: process.env.ROOTSTOCK_RPC_URL,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 31, // Rootstock testnet
    },
  },
};
