// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../interfaces/ILZReceiver.sol";

contract MockLZEndpoint {

    function deliver(
        address receiver,
        uint16 srcChainId,
        bytes calldata srcAddress,
        uint64 nonce,
        bytes calldata payload
    ) external {
        ILZReceiver(receiver).lzReceive(
            srcChainId,
            srcAddress,
            nonce,
            payload
        );
}

}
