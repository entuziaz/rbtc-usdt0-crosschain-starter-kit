const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1️⃣ Deploy OracleRouter
  const OracleRouter = await ethers.getContractFactory("OracleRouter");
  const oracleRouter = await OracleRouter.deploy();
  await oracleRouter.deployed();

  console.log("OracleRouter deployed to:", oracleRouter.address);

  // 2️⃣ Deploy Umbrella adapter for RBTC
  const UmbrellaOracleAdapter = await ethers.getContractFactory(
    "UmbrellaOracleAdapter"
  );

  const RBTC = ethers.constants.AddressZero;

  // Rootstock mainnet WRBTC–rUSDT reader
  const UMBRELLA_RBTC_READER =
    "0x7573896094d9855a0771a43C82715C752E0ACE8D";

  const rbtcAdapter = await UmbrellaOracleAdapter.deploy(
    RBTC,
    UMBRELLA_RBTC_READER
  );
  await rbtcAdapter.deployed();

  console.log("RBTC Umbrella adapter:", rbtcAdapter.address);

  // 3️⃣ Register RBTC oracle
  const tx = await oracleRouter.setOracle(RBTC, rbtcAdapter.address);
  await tx.wait();

  console.log("RBTC oracle registered");

  // 4️⃣ Deploy LendingPool
  const USDT0 = "0x..."; // rUSDT / USDT0 address on Rootstock
  const LTV_BPS = 7000; // 70%

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    USDT0,
    oracleRouter.address,
    LTV_BPS
  );
  await lendingPool.deployed();

  console.log("LendingPool deployed to:", lendingPool.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
