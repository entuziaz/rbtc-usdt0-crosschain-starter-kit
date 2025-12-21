const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UmbrellaOracleAdapter", function () {
  let owner;
  let reader;
  let adapter;

  const ASSET = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";// RBTC
  const NOW = () => Math.floor(Date.now() / 1000);

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy mock reader
    const Reader = await ethers.getContractFactory("MockUmbrellaFeedsReader");
    reader = await Reader.deploy();

    // Deploy adapter
    const Adapter = await ethers.getContractFactory("UmbrellaOracleAdapter");
    adapter = await Adapter.deploy(ASSET, reader.address);
  });

  it("returns price normalized to 18 decimals", async function () {
    // price = 123.45 with 8 decimals
    await reader.set(
      8,                  // decimals
      3600,               // heartbeat
      NOW(),              // timestamp
      12_345_000_000      // 123.45 * 1e8
    );

    const price = await adapter.getPrice(ASSET);

    // Expected: 123.45 * 1e18
    expect(price.toString()).to.equal(
      ethers.utils.parseEther("123.45").toString()
    );
  });

    it("reverts for unsupported asset", async function () {
    await reader.set(8, 3600, NOW(), 1e8);

    await adapter
        .getPrice("0x000000000000000000000000000000000000dead")
        .catch(err => {
        expect(err.message).to.include("UNSUPPORTED_ASSET");
        });
    });

    it("reverts if oracle heartbeat is exceeded", async function () {
    await reader.set(
        8,
        60,            // heartbeat = 60s
        NOW() - 120,   // too old
        1e8
    );

    await adapter.getPrice(ASSET).catch(err => {
        expect(err.message).to.include("STALE_ORACLE_PRICE");
    });
    });

    it("reverts if protocol MAX_DELAY is exceeded", async function () {
    await reader.set(
        8,
        7 * 24 * 60 * 60,      // heartbeat = 7 days (fits uint24)
        NOW() - (2 * 24 * 60 * 60), // 2 days old
        1e8
    );

    await adapter.getPrice(ASSET).catch(err => {
        expect(err.message).to.include("STALE_PROTOCOL_PRICE");
    });
    });

    it("reverts if decimals > 18", async function () {
    await reader.set(
        19,      // invalid decimals
        3600,
        NOW(),
        1
    );

    await adapter.getPrice(ASSET).catch(err => {
        expect(err.message).to.include("DECIMALS_GT_18");
    });
    });
})