// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockUmbrellaFeedsReader {
    uint8 public decimals_;
    uint24 public heartbeat_;
    uint32 public timestamp_;
    uint128 public price_;

    function set(
        uint8 _decimals,
        uint24 _heartbeat,
        uint32 _timestamp,
        uint128 _price
    ) external {
        decimals_ = _decimals;
        heartbeat_ = _heartbeat;
        timestamp_ = _timestamp;
        price_ = _price;
    }

    function decimals() external view returns (uint8) {
        return decimals_;
    }

    function getPriceData()
        external
        view
        returns (
            uint8,
            uint24,
            uint32,
            uint128
        )
    {
        return (0, heartbeat_, timestamp_, price_);
    }
}
