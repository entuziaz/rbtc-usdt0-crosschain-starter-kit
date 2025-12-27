const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OracleRouter", function () {
  let owner;
  let router;
  let oracle;

  const ASSET = "0x0000000000000000000000000000000000000001";
  const PRICE = ethers.utils.parseEther("65000");

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy router
    const OracleRouter = await ethers.getContractFactory("OracleRouter");
    router = await OracleRouter.deploy();

    // Deploy fixed price oracle
    const FixedPriceOracle = await ethers.getContractFactory("FixedPriceOracle");
    oracle = await FixedPriceOracle.deploy(ASSET, PRICE);

    // Register oracle
    await router.setOracle(ASSET, oracle.address);
  });

  it("returns price from registered oracle", async function () {
    const price = await router.getPrice(ASSET);
    expect(price.toString()).to.equal(PRICE.toString());
  });

  it("reverts when oracle is not set", async function () {
    const OracleRouter = await ethers.getContractFactory("OracleRouter");
    const freshRouter = await OracleRouter.deploy();

    try {
        await freshRouter.getPrice(ASSET);
        expect.fail("Expected revert but call succeeded");
    } catch (err) {
        expect(err.message).to.include("NO_ORACLE");
    }
    });

});
