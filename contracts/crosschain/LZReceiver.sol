// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../interfaces/ILZReceiver.sol";
import "../interfaces/ILZEndpoint.sol";
import "../core/LendingPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LZReceiver is ILZReceiver {
    ILZEndpoint public immutable endpoint;
    LendingPool public lendingPool;

    // source chainId => trusted sender
    mapping(uint16 => bytes) public trustedRemote;
    mapping(bytes32 => bool) public processedMessages;
    address public owner;

    uint8 internal constant MSG_DEPOSIT = 1;
    uint8 internal constant MSG_BORROW = 2;
    uint8 internal constant MSG_REPAY = 3;

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    event RBTCReceived(
        address indexed recipient,
        uint256 amount,
        uint16 srcChainId
    );
    event BorrowExecuted(
        address indexed user,
        uint256 amount, 
        uint16 srcChainId
    );


    constructor(
        address _endpoint
        // address _lendingPool
    ) {
        require(_endpoint != address(0), "ENDPOINT_0");
        // require(_lendingPool != address(0), "POOL_0");

        endpoint = ILZEndpoint(_endpoint);
        // lendingPool = LendingPool(payable(_lendingPool));
        owner = msg.sender;
    }

    function setLendingPool(address _pool) external onlyOwner {
        require(address(lendingPool) == address(0), "POOL_ALREADY_SET");
        lendingPool = LendingPool(payable(_pool));
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

        // emit TrustedRemoteSet(_chainId, _remote);
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

        bytes32 key = keccak256(
            abi.encodePacked(_srcChainId, _srcAddress, _nonce)
        );
        require(!processedMessages[key], "REPLAY");
        processedMessages[key] = true;

        (uint8 msgType, address user, uint256 amount) =
            abi.decode(_payload, (uint8, address, uint256));

        require(user != address(0), "USER_0");
        require(amount > 0, "ZERO_AMOUNT");

        if (msgType == MSG_DEPOSIT) {
            lendingPool.depositRBTC{value: amount}(user);
            emit RBTCReceived(user, amount, _srcChainId);

       } else if (msgType == MSG_BORROW) {
            lendingPool.borrowUSDT0For(user, amount);

            emit BorrowExecuted(user, amount, _srcChainId);

        } else if (msgType == MSG_REPAY) {
            lendingPool.repayUSDT0For(user, amount);

            // NOTE: Pure state transitions without bridge assumptions thereby treating REPAY as accounting instruction
            // Receiver already holds bridged USDT
            // IERC20 usdt = lendingPool.usdt0();

            // approve pool
            // usdt.approve(address(lendingPool), 0);
            // usdt.approve(address(lendingPool), amount);
            // lendingPool.repayUSDT0For(user, amount);

        } else {
            revert("INVALID_MSG");
        }
    }

    receive() external payable {}
}
