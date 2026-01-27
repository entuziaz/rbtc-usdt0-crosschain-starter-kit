const { ethers } = require("hardhat");

async function main() {
  const poolAddress = process.env.LENDING_POOL_ADDRESS;
  const usdt0Address = process.env.USDT0_ADDRESS;

  if (!poolAddress || !usdt0Address) {
    throw new Error("Missing LENDING_POOL_ADDRESS or USDT0_ADDRESS");
  }

  const [deployer] = await ethers.getSigners();

  const usdt = await ethers.getContractAt("IERC20", usdt0Address);

  const amount = ethers.utils.parseUnits("100000", 6);

  const tx = await usdt.transfer(poolAddress, amount);
  await tx.wait();

  console.log("✅ Seeded pool with 100,000 USDT0");
  console.log("Pool:", poolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
