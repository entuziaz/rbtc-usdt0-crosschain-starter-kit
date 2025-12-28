// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../interfaces/ILZReceiver.sol";
import "../interfaces/ILZEndpoint.sol";
import "../core/LendingPool.sol";

contract LZReceiver is ILZReceiver {
    ILZEndpoint public immutable endpoint;
    LendingPool public immutable lendingPool;

    // source chainId => trusted sender
    mapping(uint16 => bytes) public trustedRemote;
    mapping(bytes32 => bool) public processedMessages;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    event RBTCReceived(
        address indexed recipient,
        uint256 amount,
        uint16 srcChainId
    );
    event TrustedRemoteSet(
        uint16 indexed chainId,
        bytes remote
    );


    constructor(
        address _endpoint,
        address _lendingPool
    ) {
        require(_endpoint != address(0), "ENDPOINT_0");
        require(_lendingPool != address(0), "POOL_0");

        endpoint = ILZEndpoint(_endpoint);
        lendingPool = LendingPool(payable(_lendingPool));
        owner = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                              GOVERNANCE
    //////////////////////////////////////////////////////////////*/

    function setTrustedRemote(
        uint16 _chainId,
        bytes calldata _remote
    ) external onlyOwner {
        require(_remote.length != 0, "REMOTE_EMPTY");

        trustedRemote[_chainId] = _remote;

        emit TrustedRemoteSet(_chainId, _remote);
    }

    /*//////////////////////////////////////////////////////////////
                         LAYERZERO ENTRYPOINT
    //////////////////////////////////////////////////////////////*/

    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        require(msg.sender == address(endpoint), "NOT_ENDPOINT");

        require(
            keccak256(_srcAddress) ==
                keccak256(trustedRemote[_srcChainId]),
            "UNTRUSTED_SRC"
        );

         (address recipient, uint256 amount) =
            abi.decode(_payload, (address, uint256));

        require(amount > 0, "ZERO_AMOUNT");
        require(recipient != address(0), "RECIPIENT_0");

        bytes32 key = keccak256(
            abi.encodePacked(_srcChainId, _srcAddress, _nonce)
        );
        require(!processedMessages[key], "REPLAY");
        processedMessages[key] = true;

        lendingPool.depositRBTC{ value: amount }(recipient);

        emit RBTCReceived(recipient, amount, _srcChainId);
    }


    receive() external payable {}
}
