const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FixedPriceOracle", function () {
  let oracle;
  const ASSET = "0x0000000000000000000000000000000000000001";
  const PRICE = ethers.utils.parseEther("1");

  beforeEach(async function () {
    const FixedPriceOracle = await ethers.getContractFactory("FixedPriceOracle");
    oracle = await FixedPriceOracle.deploy(ASSET, PRICE);
  });

  it("returns fixed price for supported asset", async function () {
    const price = await oracle.getPrice(ASSET);
    expect(price.toString()).to.equal(PRICE.toString());
  });

  it("reverts for unsupported asset", async function () {
    try {
      await oracle.getPrice(ethers.constants.AddressZero);
      expect.fail("Expected revert");
    } catch (err) {
      expect(err.message).to.include("UNSUPPORTED_ASSET");
    }
  });
});
