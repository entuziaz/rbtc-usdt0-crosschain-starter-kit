// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/ILZEndpoint.sol";


contract LZRepaySender {
    using SafeERC20 for IERC20;

    ILZEndpoint public immutable endpoint;

    uint16 public immutable dstChainId;
    bytes public dstReceiver;
    IERC20 public immutable usdt0;

    uint8 internal constant MSG_REPAY = 3;

    address public immutable bridge;

    constructor(
        address _endpoint,
        uint16 _dstChainId,
        address _receiver,
        address _usdt0,
        address _bridge
    ) {
        endpoint = ILZEndpoint(_endpoint);
        dstChainId = _dstChainId;
        dstReceiver = abi.encodePacked(_receiver);
        usdt0 = IERC20(_usdt0);
        bridge = _bridge;
    }

    function repayUSDT(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");

        // NOTE: Token delivery to be handled by application layer
        // pull funds from user
        // usdt0.safeTransferFrom(msg.sender, bridge, amount);


        bytes memory payload = abi.encode(
            MSG_REPAY,
            msg.sender,
            amount
        );

        endpoint.send(
            dstChainId,
            dstReceiver,
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
    }
}
