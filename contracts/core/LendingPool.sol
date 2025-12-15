// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;
// import {IERC20, IERC20Metadata} from @openzeppelin/contracts;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IPriceOracle } from "../interfaces/IPriceOracle";

contract LendingPool {

    IERC20 public usdt0;
    IPriceOracle public oracle;
    uint256 public ltvBps;

    mapping(address => uint256) public collateralRBTC;
    mapping(address => uint256) public debtUSDT0;

    event Deposited(address indexed user, uint256 amount);

    constructor(address _usdt0, IPriceOracle _oracle, uint256 _ltvBps) {
        // Constructor takes: address of USDT0 token, address of Oracle, LTV like 7000=70%
        // Constructor:
        // Sets those variables
        // Computes USDT0_SCALE 10 ** decimals
        // Adds require checks
        usdt0 = IERC20(_usdt0);
        oracle = _oracle;
        ltvBps = _ltvBps;
    }

    function deposit() external payable {
        // require > 0
        // add to collateralRBTC[msg.sender]
        // emit event
        require(msg.value > 0, "ZERO_DEPOSIT");
        collateralRBTC[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        // require amount > 0
        // require user has enough collateral
        // simulate new collateral = old − amount
        // check solvency: call internal function _isSolvent
        // update mapping
        // send RBTC back with low-level call
        // emit event
        require(amount> 0, "ZERO_WITHDRAWAL");
        require(collateralRBTC[msg.sender] >= amount, "INSUFFICIENt COLLATERAL");
        uint256 newCollateral = collateralRBTC[msg.sender] - amount;
        collateralRBTC[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "RBTC_TRANSFER_FAILED");
        emit Withdrawn(msg.sender, amount)
    }

}