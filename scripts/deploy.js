const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const RBTC = ethers.constants.AddressZero;

  // ------------------------------------------------------------
  // 1. Deploy OracleRouter
  // ------------------------------------------------------------
  const OracleRouter = await ethers.getContractFactory("OracleRouter");
  const oracleRouter = await OracleRouter.deploy();
  await oracleRouter.deployed();

  console.log("OracleRouter:", oracleRouter.address);

  // ------------------------------------------------------------
  // 2. Deploy Umbrella Oracle Adapter for RBTC
  // ------------------------------------------------------------
  const umbrellaReader = ethers.utils.getAddress(process.env.UMBRELLA_RBTC_READER);
  if (!umbrellaReader) {
    throw new Error("Missing UMBRELLA_RBTC_READER");
  }

  const UmbrellaOracleAdapter = await ethers.getContractFactory(
    "UmbrellaOracleAdapter"
  );

  const rbtcAdapter = await UmbrellaOracleAdapter.deploy(
    RBTC,
    umbrellaReader
  );
  await rbtcAdapter.deployed();

  console.log("RBTC Oracle Adapter:", rbtcAdapter.address);

  await (await oracleRouter.setOracle(RBTC, rbtcAdapter.address)).wait();
  console.log("RBTC oracle registered");

  // ------------------------------------------------------------
  // 3. Deploy LZReceiver (NO pool yet)
  // ------------------------------------------------------------
  const lzEndpoint = ethers.utils.getAddress(process.env.LZ_ENDPOINT);

  if (!lzEndpoint) {
    throw new Error("Missing LZ_ENDPOINT");
  }

  const LZReceiver = await ethers.getContractFactory("LZReceiver");
  const receiver = await LZReceiver.deploy(lzEndpoint);
  await receiver.deployed();

  console.log("LZReceiver:", receiver.address);

  // ------------------------------------------------------------
  // 4. Deploy LendingPool with receiver as depositor
  // ------------------------------------------------------------
  const usdt0 = ethers.utils.getAddress(process.env.USDT0_ADDRESS);

  if (!usdt0) {
    throw new Error("Missing USDT0_ADDRESS");
  }

  const LTV = process.env.LTV_BPS || 7000;

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    usdt0,
    oracleRouter.address,
    LTV,
    receiver.address
  );
  await lendingPool.deployed();

  console.log("LendingPool:", lendingPool.address);

  // ------------------------------------------------------------
  // 5. One-time wiring: Receiver → Pool
  // ------------------------------------------------------------
  await (await receiver.setLendingPool(lendingPool.address)).wait();
  console.log("Receiver linked to LendingPool");

  // ------------------------------------------------------------
  // 6. (Optional) Set trusted remotes
  // ------------------------------------------------------------
  // Example:
  // await receiver.setTrustedRemote(101, abi.encodePacked(srcSender));

  console.log("Deployment complete ✅");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
