// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Mock Token
/// @author Edy Ionescu
/// @notice Mock of 'Token' contract for testing purposes.
contract MockToken is ERC20, Ownable {
    // --- Constants ---
    uint256 private immutable i_faucetDailyLimit;

    // --- State variables ---
    bool public s_shouldFailTransfer;

    constructor(
        string memory name,
        string memory symbol,
        address recipient,
        uint256 totalSupply,
        uint256 faucetDailyLimit
    ) ERC20(name, symbol) Ownable(recipient) {
        uint256 units = 10 ** decimals();
        _mint(recipient, totalSupply * units);
        i_faucetDailyLimit = faucetDailyLimit * units;
    }

    function setShouldFailTransfer(bool _shouldFail) external {
        s_shouldFailTransfer = _shouldFail;
    }

    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (s_shouldFailTransfer) {
            return false;
        }
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (s_shouldFailTransfer) {
            return false;
        }
        return super.transferFrom(from, to, amount);
    }
}
