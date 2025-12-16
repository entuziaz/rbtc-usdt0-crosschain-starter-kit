// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IPriceOracle } from "../interfaces/IPriceOracle.sol";


contract LendingPool is ReentrancyGuard {

    IERC20 public usdt0;
    IPriceOracle public oracle;
    uint256 public ltvBps;
    uint256 public USDT0_SCALE;

    mapping(address => uint256) public collateralRBTC;
    mapping(address => uint256) public debtUSDT0;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _usdt0, IPriceOracle _oracle, uint256 _ltvBps) {
        // Constructor takes: address of USDT0 token, address of Oracle, LTV like 7000=70%
        // Constructor:
        // Sets those variables
        // Computes USDT0_SCALE 10 ** decimals
        // Adds require checks
        usdt0 = IERC20(_usdt0);
        
        oracle = _oracle;
        ltvBps = _ltvBps;

        // convert USDT0 amounts to 18-decimals USD math
        uint8 decimals = IERC20Metadata(_usdt0).decimals();
        USDT0_SCALE = 10 ** uint256(decimals);
    }

    function _isSolvent(uint256 collateralWei, uint256 debtAmount) internal view returns (bool) {
        // debtUSD ≤ collateralUSD × (ltvBps / 10,000)

        uint256 rbtcPrice = oracle.getPrice(address(0)); // adress(0) is the native coin fo rhe chain
        uint256 usdtPrice = oracle.getPrice(address(usdt0));

        uint256 collateralUsd = (collateralWei * rbtcPrice) / 1e18;
        uint256 debtUsd = (debtAmount * usdtPrice) / USDT0_SCALE;
        uint256 maxDebtUsd = (collateralUsd * ltvBps) / 10_000;

        return debtUsd <= maxDebtUsd;


    }

    function deposit() external payable nonReentrant {
        // require > 0
        // add to collateralRBTC[msg.sender]
        // emit event
        require(msg.value > 0, "ZERO_DEPOSIT");
        collateralRBTC[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
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
        require(_isSolvent(newCollateral, debtUSDT0[msg.sender]), "HF_LT_1"); // Block withdrawal if health factor < 1
        collateralRBTC[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "RBTC_TRANSFER_FAILED");
        emit Withdrawn(msg.sender, amount);
    }

    function borrow() public {}

}