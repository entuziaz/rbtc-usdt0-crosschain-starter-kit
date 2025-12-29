// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// This contract is the only token custodian
// Models Stargate/OFT behavior
contract MockUSDTBridge {
    IERC20 public immutable usdt;

    constructor(address _usdt) {
        usdt = IERC20(_usdt);
    }

    /// @notice simulate bridge delivery
    function deliver(address to, uint256 amount) external {
        require(usdt.balanceOf(address(this)) >= amount, "NO_LIQUIDITY");
        usdt.transfer(to, amount);
    }
}
