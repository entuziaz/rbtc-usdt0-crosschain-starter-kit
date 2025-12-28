// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../interfaces/ILZEndpoint.sol";

contract LZSender {
    ILZEndpoint public immutable endpoint;

    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    // destination chainId => trusted receiver
    mapping(uint16 => bytes) public trustedRemote;

    event RBTCBridged(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint16 dstChainId
    );

    constructor(address _endpoint) {
        require(_endpoint != address(0), "ENDPOINT_0");
        endpoint = ILZEndpoint(_endpoint);
        owner = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                              GOVERNANCE
    //////////////////////////////////////////////////////////////*/

    function setTrustedRemote(uint16 _chainId, bytes calldata _remote)
        external onlyOwner
    {
        // prod: restrict with multisig
        trustedRemote[_chainId] = _remote;
    }

    /*//////////////////////////////////////////////////////////////
                          USER ENTRYPOINT
    //////////////////////////////////////////////////////////////*/

    function sendRBTC(
        uint16 _dstChainId,
        address _recipient
    ) external payable {
        require(msg.value > 0, "ZERO_AMOUNT");
        require(_recipient != address(0), "RECIPIENT_0");
        require(trustedRemote[_dstChainId].length != 0, "UNTRUSTED_DST");

        bytes memory payload = abi.encode(
            _recipient,
            msg.value
        );

        endpoint.send{ value: msg.value }(
            _dstChainId,
            trustedRemote[_dstChainId],
            payload,
            payable(msg.sender), // refund extra gas
            address(0),           // no ZRO token
            bytes("")             // default adapter params
        );

        emit RBTCBridged(
            msg.sender,
            _recipient,
            msg.value,
            _dstChainId
        );
    }

    receive() external payable {}
}
