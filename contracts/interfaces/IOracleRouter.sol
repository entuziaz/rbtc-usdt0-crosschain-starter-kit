// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "./IPriceOracle.sol";

interface IOracleRouter is IPriceOracle {
    function setOracle(address asset, IPriceOracle oracle) external;
}
