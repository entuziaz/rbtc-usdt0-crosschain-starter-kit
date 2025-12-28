const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LZReceiver — cross-chain deposit", function () {
  let owner, alice;
  let usdt0, oracle, pool, endpoint, receiver;

  const RBTC_PRICE = ethers.utils.parseEther("65000");
  const LTV = 7000;

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

    const predictedReceiverAddress = ethers.utils.getContractAddress({
      from: owner.address,
      nonce: nonce + 1,
    });

    // ---- Deploy pool with correct depositor ----
    pool = await LendingPool.deploy(
      usdt0.address,
      oracle.address,
      LTV,
      predictedReceiverAddress
    );

    // ---- Deploy receiver ----
    receiver = await LZReceiver.deploy(
      endpoint.address,
      pool.address
    );

    // sanity check
    expect(receiver.address).to.equal(predictedReceiverAddress);
  });

  it("credits collateral when a valid LZ message is received", async function () {
  const srcChainId = 101;
  const nonce = 1;

  const trustedSender = ethers.utils.solidityPack(
    ["address"],
    [owner.address]
  );

  await receiver.setTrustedRemote(srcChainId, trustedSender);

  const amount = ethers.utils.parseEther("0.01");

  const payload = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256"],
    [alice.address, amount]
  );

  // 🔑 simulate LayerZero delivering ETH
    // fund receiver
  await owner.sendTransaction({
    to: receiver.address,
    value: amount,
  });

  // deliver message
  const tx = await endpoint.deliver(
    receiver.address,
    srcChainId,
    trustedSender,
    nonce,
    payload
  );

  const collateral = await pool.collateralRBTC(alice.address);

  expect(collateral.toString())
    .to.equal(amount.toString());

  });

  it("prevents replayed LZ messages", async function () {
  const srcChainId = 101;
  const nonce = 1;

  const trustedSender = ethers.utils.solidityPack(
    ["address"],
    [owner.address]
  );

  await receiver.setTrustedRemote(srcChainId, trustedSender);

  const amount = ethers.utils.parseEther("0.01");
  const payload = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256"],
    [alice.address, amount]
  );

  // fund receiver
  await owner.sendTransaction({
    to: receiver.address,
    value: amount,
  });

  // first delivery succeeds
  await (await endpoint.deliver(
    receiver.address,
    srcChainId,
    trustedSender,
    nonce,
    payload
  )).wait();

  // fund again to isolate replay logic
  await owner.sendTransaction({
    to: receiver.address,
    value: amount,
  });

  // second delivery must fail
  let failed = false;
  try {
    const tx = await endpoint.deliver(
      receiver.address,
      srcChainId,
      trustedSender,
      nonce,
      payload
    );
    await tx.wait();
  } catch (err) {
    failed = true;
    expect(err.message).to.include("REPLAY");
  }

  expect(failed).to.equal(true);
  });

  it("rejects messages from untrusted remotes", async function () {
    const srcChainId = 101;
    const nonce = 1;

    const fakeSender = ethers.utils.solidityPack(
      ["address"],
      [alice.address]
    );

    const amount = ethers.utils.parseEther("0.01");
    const payload = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [alice.address, amount]
    );

    await owner.sendTransaction({
      to: receiver.address,
      value: amount,
    });

    let failed = false;
    try {
      const tx = await endpoint.deliver(
        receiver.address,
        srcChainId,
        fakeSender,
        nonce,
        payload
      );
      await tx.wait();
    } catch (err) {
      failed = true;
      expect(err.message).to.include("UNTRUSTED_SRC");
    }

    expect(failed).to.equal(true);
  });

  it("rejects direct calls to lzReceive", async function () {
  let failed = false;

  try {
    const tx = await receiver.lzReceive(
      101,
      "0x",
      1,
      "0x"
    );
    await tx.wait();
  } catch (err) {
    failed = true;
    expect(err.message).to.include("NOT_ENDPOINT");
  }

  expect(failed).to.equal(true);
  });

  


});
