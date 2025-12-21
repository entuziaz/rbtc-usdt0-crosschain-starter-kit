// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IUmbrellaFeedsReader {
    function decimals() external view returns (uint8);

    function getPriceData() external view returns (
        uint8 data,
        uint24 heartbeat,
        uint32 timeStamp,
        uint128 price
    );
}