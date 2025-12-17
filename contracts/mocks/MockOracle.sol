// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IPriceOracle.sol";

contract MockOracle is IPriceOracle {
    mapping(address => uint256) public prices;

    function setPrice(address asset, uint256 priceE18) external {
        prices[asset] = priceE18;
    }

    function getPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
}
