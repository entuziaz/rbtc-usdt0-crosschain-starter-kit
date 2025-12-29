const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Cross-chain borrow — collateral enables lending", function () {
  let owner, alice;
  let usdt0, oracle, pool, endpoint, receiver;

  const RBTC_PRICE = ethers.utils.parseEther("65000");
  const LTV = 7000;
  const ONE_USDT = 1_000_000;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();

    // ---- Deploy mocks ----
    const MockUSDT0 = await ethers.getContractFactory("MockUSDT0");
    usdt0 = await MockUSDT0.deploy();

    const MockOracle = await ethers.getContractFactory("MockOracle");
    oracle = await MockOracle.deploy();
    await oracle.setPrice(ethers.constants.AddressZero, RBTC_PRICE);

    const MockEndpoint = await ethers.getContractFactory("MockLZEndpoint");
    endpoint = await MockEndpoint.deploy();

    const LendingPool = await ethers.getContractFactory("LendingPool");
    const LZReceiver = await ethers.getContractFactory("LZReceiver");

    // ---- Predict receiver address ----
    const nonce = await owner.getTransactionCount();
    const predictedReceiver = ethers.utils.getContractAddress({
      from: owner.address,
      nonce: nonce + 1,
    });

    // ---- Deploy pool with correct depositor ----
    pool = await LendingPool.deploy(
      usdt0.address,
      oracle.address,
      LTV,
      predictedReceiver
    );

    // ---- Deploy receiver ----
    receiver = await LZReceiver.deploy(
      endpoint.address,
      pool.address
    );

    // sanity check
    expect(receiver.address).to.equal(predictedReceiver);

    // ---- Fund pool with USDT liquidity ----
    await usdt0.mint(pool.address, 100_000 * ONE_USDT);
  });

  it("allows borrowing after cross-chain collateral deposit", async function () {
    const srcChainId = 101;
    const nonce = 1;

    const trustedSender = ethers.utils.solidityPack(
      ["address"],
      [owner.address]
    );

    await receiver.setTrustedRemote(srcChainId, trustedSender);

    const collateralAmount = ethers.utils.parseEther("0.01"); // ~$650
    const borrowAmount = 400 * ONE_USDT; // under 70% LTV

    const MSG_DEPOSIT = 1;

    const payload = ethers.utils.defaultAbiCoder.encode(
      ["uint8", "address", "uint256"],
      [MSG_DEPOSIT, alice.address, collateralAmount]
    );


    // ---- Simulate LayerZero ETH delivery ----
    await owner.sendTransaction({
      to: receiver.address,
      value: collateralAmount,
    });

    // ---- Deliver cross-chain message ----
    await (await endpoint.deliver(
      receiver.address,
      srcChainId,
      trustedSender,
      nonce,
      payload
    )).wait();

    // ---- Assert collateral credited ----
    const collateral = await pool.collateralRBTC(alice.address);
    expect(collateral.toString()).to.equal(collateralAmount.toString());

    // ---- Borrow ----
    await pool.connect(alice).borrowUSDT0(borrowAmount);

    // ---- Assert debt ----
    const debt = await pool.debtUSDT0(alice.address);
    expect(debt.toString()).to.equal(borrowAmount.toString());
  });
});
