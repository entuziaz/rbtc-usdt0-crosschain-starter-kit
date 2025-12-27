// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../interfaces/IPriceOracle.sol";

contract FixedPriceOracle is IPriceOracle {
    uint256 public immutable priceE18;
    address public immutable asset;

    constructor(address _asset, uint256 _priceE18) {
        require(_asset != address(0), "ASSET_0");
        priceE18 = _priceE18;
        asset = _asset;
    }

    function getPrice(address _asset)
        external
        view
        override
        returns (uint256)
    {
        require(_asset == asset, "UNSUPPORTED_ASSET");
        return priceE18;
    }
}
