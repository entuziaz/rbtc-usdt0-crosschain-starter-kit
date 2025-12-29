// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/ILZEndpoint.sol";

contract LZBorrowSender {
    ILZEndpoint public immutable endpoint;

    uint16 public immutable dstChainId;
    bytes public immutable dstReceiver; // encoded receiver address
    address public immutable usdt0;

    uint8 internal constant MSG_BORROW = 2;

    constructor(
        address _endpoint,
        uint16 _dstChainId,
        address _receiver,
        address _usdt0
    ) {
        require(_endpoint != address(0), "ENDPOINT_0");
        require(_receiver != address(0), "RECEIVER_0");
        require(_usdt0 != address(0), "USDT0_0");

        endpoint = ILZEndpoint(_endpoint);
        dstChainId = _dstChainId;
        dstReceiver = abi.encodePacked(_receiver);
        usdt0 = _usdt0;
    }

    /// @notice User stays on SOURCE chain
    function borrowUSDT(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");

        bytes memory payload = abi.encode(
            MSG_BORROW,
            msg.sender,
            amount
        );

        endpoint.send(
            dstChainId,
            dstReceiver,
            payload,
            payable(msg.sender), // refund
            address(0),
            bytes("")
        );
    }
}
