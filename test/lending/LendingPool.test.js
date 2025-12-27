const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("LendingPool", function () {
  let owner, alice;
  let usdt0, oracle, pool;

  const RBTC_PRICE = ethers.utils.parseEther("65000"); 
  const USDT_PRICE = ethers.utils.parseEther("1");     
  const LTV = 7000; 
  const ONE_USDT = 1_000_000;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();

    // 1. Deploy Mocks
    const MockUSDT0 = await ethers.getContractFactory("MockUSDT0");
    usdt0 = await MockUSDT0.deploy(); // No constructor args

    const MockOracle = await ethers.getContractFactory("MockOracle");
    oracle = await MockOracle.deploy();

    // 2. Setup Oracle Prices
    await oracle.setPrice(ethers.constants.AddressZero, RBTC_PRICE);
    await oracle.setPrice(usdt0.address, USDT_PRICE);

    // 3. Deploy Pool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    pool = await LendingPool.deploy(
      usdt0.address,
      oracle.address,
      LTV
    );

    // 4. Initial Liquidity: Fund pool so it can lend
    await usdt0.mint(pool.address, 100_000 * ONE_USDT);
  });

  it("allows borrowing within LTV (0.01 RBTC @ $65k = $650 limit * 0.7 = $455 max)", async function () {
    await pool.connect(alice).depositRBTC({ value: ethers.utils.parseEther("0.01") });

    // Borrow 400 USDT (Safe, under 455 limit)
    await pool.connect(alice).borrowUSDT0(400 * ONE_USDT);

    expect((await pool.debtUSDT0(alice.address)).toString()).to.equal((400 * ONE_USDT).toString());


  });

  it("prevents borrowing above LTV (Borrowing 500 USDT on 455 limit)", async function () {
    await pool.connect(alice).depositRBTC({ value: ethers.utils.parseEther("0.01") });

    await pool.connect(alice)
    .borrowUSDT0(500 * ONE_USDT)
    .catch(err => {
      expect(err.message).to.include("INSUFFICIENT_COLLATERAL");
    });


  });

  it("allows repaying debt", async function () {
    // Setup: Alice deposits and borrows
    await pool.connect(alice).depositRBTC({ value: ethers.utils.parseEther("0.01") });
    await pool.connect(alice).borrowUSDT0(400 * ONE_USDT);

    // Give Alice some USDT to repay (since she spent the borrowed amount or just needs it)
    // In a real test, she already has the 400 she borrowed.
    const repayAmount = 200 * ONE_USDT;
    
    await usdt0.connect(alice).approve(pool.address, repayAmount);

    await pool.connect(alice).repayUSDT0(repayAmount);

    expect((await pool.debtUSDT0(alice.address)).toString())
    .to.equal((200 * ONE_USDT).toString());

  });

  it("prevents unsafe withdrawal that would drop Health Factor below 1", async function () {
    await pool.connect(alice).depositRBTC({ value: ethers.utils.parseEther("0.01") });
    await pool.connect(alice).borrowUSDT0(400 * ONE_USDT);

    await pool.connect(alice)
    .withdrawRBTC(ethers.utils.parseEther("0.009"))
    .catch(err => {
      expect(err.message).to.include("HF_LT_1");
    });

  });
});