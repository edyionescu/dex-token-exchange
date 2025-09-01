// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockToken is ERC20, Ownable {
    bool public shouldFailTransfer;

    uint256 private immutable i_faucetDailyLimit;

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
        shouldFailTransfer = _shouldFail;
    }

    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (shouldFailTransfer) {
            return false;
        }
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (shouldFailTransfer) {
            return false;
        }
        return super.transferFrom(from, to, amount);
    }
}
