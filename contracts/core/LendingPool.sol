// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IPriceOracle } from "../interfaces/IPriceOracle.sol";


contract LendingPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public usdt0;
    IPriceOracle public oracle;
    uint256 public ltvBps;
    uint256 public immutable USDT0_SCALE;
    address public immutable crossChainDepositor;

    modifier onlyDepositor() {
        require(msg.sender == crossChainDepositor, "NOT_DEPOSITOR");
        _;
    }

    mapping(address => uint256) public collateralRBTC;
    mapping(address => uint256) public debtUSDT0;

    event Deposited(address indexed payer, address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);

    constructor(address _usdt0, IPriceOracle _oracle, uint256 _ltvBps, address _crossChainDepositor) {
        // Constructor takes: address of USDT0 token, address of Oracle, LTV like 7000=70%
        // Constructor:
        // Sets those variables
        // Computes USDT0_SCALE 10 ** decimals
        // Adds require checks
        require(_usdt0 != address(0), "USDT0_0");
        require(address(_oracle) != address(0), "ORACLE_0");
        require(_ltvBps > 0 && _ltvBps <= 9500, "LTV_RANGE");
        require(_crossChainDepositor != address(0), "DEPOSITOR_0");

        usdt0 = IERC20(_usdt0);
        
        oracle = _oracle;
        ltvBps = _ltvBps;
        crossChainDepositor = _crossChainDepositor;

        // convert USDT0 amounts to 18-decimals USD math
        uint8 decimals = IERC20Metadata(_usdt0).decimals();
        USDT0_SCALE = 10 ** uint256(decimals);
    }

    function _isSolvent(uint256 collateralWei, uint256 debtAmount) internal view returns (bool) {
        // debtUSD ≤ collateralUSD × (ltvBps / 10,000)

        uint256 rbtcPrice = oracle.getPrice(address(0)); // adress(0) is the native coin of the chain
        require(rbtcPrice > 0, "INVALID_PRICE");
        uint256 usdtPrice = 1e18;

        uint256 collateralUsd = (collateralWei * rbtcPrice) / 1e18;
        uint256 debtUsd = (debtAmount * usdtPrice) / USDT0_SCALE;
        uint256 maxDebtUsd = (collateralUsd * ltvBps) / 10_000;

        return debtUsd <= maxDebtUsd;


    }

    function depositRBTC(address onBehalfOf) external payable nonReentrant onlyDepositor {
        // require > 0
        // add to collateralRBTC[msg.sender]
        // emit event
        require(msg.value > 0, "ZERO_DEPOSIT");
        require(onBehalfOf != address(0), "USER_0");

        collateralRBTC[onBehalfOf] += msg.value;
        emit Deposited(msg.sender, onBehalfOf, msg.value);
    }

    function withdrawRBTC(uint256 amount) external nonReentrant {
        // require amount > 0
        // require user has enough collateral
        // simulate new collateral = old − amount
        // check solvency: call internal function _isSolvent
        // update mapping
        // send RBTC back with low-level call
        // emit event
        require(amount> 0, "ZERO_WITHDRAWAL");
        require(collateralRBTC[msg.sender] >= amount, "INSUFFICIENT COLLATERAL");
        uint256 newCollateral = collateralRBTC[msg.sender] - amount;
        require(_isSolvent(newCollateral, debtUSDT0[msg.sender]), "HF_LT_1"); // Block withdrawal if health factor < 1
        collateralRBTC[msg.sender] -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "RBTC_TRANSFER_FAILED");
        emit Withdrawn(msg.sender, amount);
    }

    function borrowUSDT0(uint256 amount) external nonReentrant {
        // require > 0
        // newDebt = existing + amount
        // check _isSolvent with current collateral
        // transfer USDT0 to user
        // update debt mapping
        // emit event
        require(amount > 0, "ZERO_BORROW");
        uint256 newDebt = debtUSDT0[msg.sender] + amount;
        require(_isSolvent(collateralRBTC[msg.sender], newDebt), "INSUFFICIENT_COLLATERAL");
        
        require(usdt0.balanceOf(address(this)) >= amount, "INSUFFICIENT_POOL_LIQUIDITY");
        debtUSDT0[msg.sender] = newDebt;
        usdt0.safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
        
    }

    function repayUSDT0(uint256 amount) external nonReentrant {
        // require user has debt
        // calculate actual pay amount
        // safeTransferFrom
        // subtract from debt
        // emit event
        uint256 debt = debtUSDT0[msg.sender];
        require(debt > 0, "NO_DEBT");

        uint256 payAmount = amount > debt ? debt : amount;
        require(payAmount > 0, "ZERO_REPAY");

        usdt0.safeTransferFrom(msg.sender, address(this), payAmount);
        debtUSDT0[msg.sender] = debt - payAmount;
        emit Repaid(msg.sender, payAmount);
    }

    receive() external payable {
        revert("DIRECT_PAY_NOT_ALLOWED");
    }
}