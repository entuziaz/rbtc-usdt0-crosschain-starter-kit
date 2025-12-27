// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../interfaces/IPriceOracle.sol";
import { IUmbrellaFeedsReader } from "../interfaces/IUmbrellaFeedsReader.sol";

contract UmbrellaOracleAdapter is IPriceOracle {
    IUmbrellaFeedsReader public immutable reader;
    address public immutable asset;

    /// @notice Hard safety cap enforced by the protocol
    /// @notice Long delay for testnet. Use tighter bounds in prod.
    uint256 public constant MAX_DELAY = 7 days;

    constructor(address _asset, address _reader) {
        // address(0) is valid for native asset (RBTC)
        require(_reader != address(0), "READER_0");

        asset = _asset;
        reader = IUmbrellaFeedsReader(_reader);
    }

    function getPrice(address _asset)
        external
        view
        override
        returns (uint256)
    {
        require(_asset == asset, "UNSUPPORTED_ASSET");

        (
            ,
            uint24 heartbeat,
            uint32 timestamp,
            uint128 price
        ) = reader.getPriceData();

        uint256 age = block.timestamp - timestamp;

        require(age <= MAX_DELAY, "STALE_PRICE");


        uint8 decimals = reader.decimals();
        require(decimals <= 18, "DECIMALS_GT_18");

        // Normalize to 18 decimals
        return uint256(price) * (10 ** (18 - decimals));
    }
}
