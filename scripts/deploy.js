const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const RBTC = ethers.constants.AddressZero;
  const USE_FIXED_ORACLE = process.env.USE_FIXED_ORACLE === "true";
  const USE_MOCK_USDT0 = process.env.USE_MOCK_USDT0 === "true";

  // ------------------------------------------------------------
  // 1. Deploy OracleRouter
  // ------------------------------------------------------------
  const OracleRouter = await ethers.getContractFactory("OracleRouter");
  const oracleRouter = await OracleRouter.deploy();
  await oracleRouter.deployed();
  console.log("OracleRouter:", oracleRouter.address);

  // ------------------------------------------------------------
  // 2. Deploy Oracle Adapter
  // ------------------------------------------------------------
  let adapter;

  if (USE_FIXED_ORACLE) {
    const FixedPriceOracle = await ethers.getContractFactory("FixedPriceOracle");

    adapter = await FixedPriceOracle.deploy(
      RBTC, // asset = native RBTC (address(0))
      ethers.utils.parseEther("65000") // $65,000
    );

    await adapter.deployed();
    console.log("Fixed Oracle:", adapter.address);
  } else {
      const umbrellaReader = process.env.UMBRELLA_RBTC_READER;
      if (!umbrellaReader) {
        throw new Error("Missing UMBRELLA_RBTC_READER");
      }

      const UmbrellaOracleAdapter = await ethers.getContractFactory(
        "UmbrellaOracleAdapter"
      );

      adapter = await UmbrellaOracleAdapter.deploy(
        RBTC,
        ethers.utils.getAddress(umbrellaReader)
      );
      await adapter.deployed();
      console.log("Umbrella Adapter:", adapter.address);
  }

  await (await oracleRouter.setOracle(RBTC, adapter.address)).wait();
  console.log("RBTC oracle registered");

  // ------------------------------------------------------------
  // 3. Deploy USDT0 (mock or real)
  // ------------------------------------------------------------
  let usdt0;

  if (USE_MOCK_USDT0) {
    const MockUSDT0 = await ethers.getContractFactory("MockUSDT0");
    usdt0 = await MockUSDT0.deploy();
    await usdt0.deployed();
    console.log("Mock USDT0:", usdt0.address);

    // Mint 1,000,000 USDT0 to deployer
    await (await usdt0.mint(
      deployer.address,
      ethers.utils.parseUnits("1000000", 6)
    )).wait();

    console.log("Minted 1,000,000 USDT0 to deployer");
  } else {
    const addr = process.env.USDT0_ADDRESS;
    if (!addr) {
      throw new Error("Missing USDT0_ADDRESS");
    }
    usdt0 = await ethers.getContractAt("IERC20", ethers.utils.getAddress(addr));
    console.log("Using external USDT0:", usdt0.address);
  }

  // ------------------------------------------------------------
  // 4. Deploy LZReceiver
  // ------------------------------------------------------------
  const lzEndpoint = process.env.LZ_ENDPOINT;
  if (!lzEndpoint) {
    throw new Error("Missing LZ_ENDPOINT");
  }

  const LZReceiver = await ethers.getContractFactory("LZReceiver");
  const receiver = await LZReceiver.deploy(
    ethers.utils.getAddress(lzEndpoint)
  );
  await receiver.deployed();
  console.log("LZReceiver:", receiver.address);

  // ------------------------------------------------------------
  // 5. Deploy LendingPool
  // ------------------------------------------------------------
  const LTV = process.env.LTV_BPS || 7000;

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    usdt0.address,
    oracleRouter.address,
    LTV,
    receiver.address
  );
  await lendingPool.deployed();
  console.log("LendingPool:", lendingPool.address);

  // ------------------------------------------------------------
  // 6. Wire receiver → pool
  // ------------------------------------------------------------
  await (await receiver.setLendingPool(lendingPool.address)).wait();
  console.log("Receiver linked to LendingPool");

  // ------------------------------------------------------------
  // 7. Seed pool with liquidity (mock only)
  // ------------------------------------------------------------
  if (USE_MOCK_USDT0) {
    await (await usdt0.transfer(
      lendingPool.address,
      ethers.utils.parseUnits("500000", 6)
    )).wait();

    console.log("Seeded pool with 500,000 USDT0");
  }

  console.log("Deployment complete ✅");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
