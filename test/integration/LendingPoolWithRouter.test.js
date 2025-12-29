const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool + OracleRouter (integration)", function () {
  let owner, alice;
  let usdt0, pool, router, reader, adapter;

  const ONE_USDT = 1_000_000;
  const RBTC = ethers.constants.AddressZero;
  const LTV = 7000;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();

    // Deploy USDT0
    const MockUSDT0 = await ethers.getContractFactory("MockUSDT0");
    usdt0 = await MockUSDT0.deploy();

    // Deploy Umbrella reader mock
    const Reader = await ethers.getContractFactory("MockUmbrellaFeedsReader");
    reader = await Reader.deploy();

    // Set RBTC price: $65,000 with 8 decimals
    await reader.set(
      8,
      3600,
      Math.floor(Date.now() / 1000),
      65_000_00000000 // 65000 * 1e8
    );

    // Deploy adapter
    const Adapter = await ethers.getContractFactory("UmbrellaOracleAdapter");
    adapter = await Adapter.deploy(RBTC, reader.address);

    // Deploy router
    const OracleRouter = await ethers.getContractFactory("OracleRouter");
    router = await OracleRouter.deploy();
    await router.setOracle(RBTC, adapter.address);

    // Deploy pool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(
      usdt0.address,
      router.address,
      LTV,
      owner.address
    );

    // Fund pool
    await usdt0.mint(pool.address, 100_000 * ONE_USDT);
  });

  it("allows borrowing with real oracle routing", async function () {
    await pool.connect(owner).depositRBTC(
      alice.address,
      { value: ethers.utils.parseEther("0.01") }
    );


    await pool.connect(alice).borrowUSDT0(400 * ONE_USDT);

    expect((await pool.debtUSDT0(alice.address)).toString())
        .to.equal((400 * ONE_USDT).toString());

  });
});
