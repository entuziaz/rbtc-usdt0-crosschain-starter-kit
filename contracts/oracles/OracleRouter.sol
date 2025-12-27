// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../interfaces/IPriceOracle.sol";

contract OracleRouter is IPriceOracle {
    mapping(address => IPriceOracle) public oracles;
    address public owner;

    event OracleSet(address indexed asset, address indexed oracle);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    // Governance Risk: implement a timelock ownership or require a two-step (multisig) ownership 
    // to avoid allowing instant oracle replacement
    function setOracle(address asset, IPriceOracle oracle)
        external
        onlyOwner
    {
        // address(0) is allowed to represent the native asset (RBTC)
        require(address(oracle) != address(0), "ORACLE_0");

        oracles[asset] = oracle;
        emit OracleSet(asset, address(oracle));
    }

    function getPrice(address asset)
        external
        view
        override
        returns (uint256)
    {
        IPriceOracle oracle = oracles[asset];
        require(address(oracle) != address(0), "NO_ORACLE");

        return oracle.getPrice(asset);
    }
}
