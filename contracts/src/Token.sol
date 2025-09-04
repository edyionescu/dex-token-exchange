// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Token used on the dEx Token Exchange
/// @author Edy Ionescu
/// @notice ERC20 token contract with a faucet feature.
/// @dev The contract is initially owned by the deployer and has the ability to mint and distribute tokens.
/// @custom:security-contact errorsmith@gmail.com
contract Token is ERC20, Ownable {
    // Errors
    error Token__AmountNotGreaterThanZero(uint256 amount);
    error Token__DailyLimitExceeded(uint256 amount, uint256 dailyLimit);

    // Constants
    uint256 private constant ONE_DAY = 1 days;
    uint256 private immutable UNITS = 10 ** decimals();
    uint256 private immutable i_faucetDailyLimit;

    // State variables
    mapping(address => uint256) private s_lastDistributionTime;
    mapping(address => uint256) private s_tokensDistributedToday;

    // Events
    event TokensDistributed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        string memory name,
        string memory symbol,
        address recipient,
        address initialOwner,
        uint256 initialSupply,
        uint256 faucetDailyLimit
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(recipient, initialSupply * UNITS);
        i_faucetDailyLimit = faucetDailyLimit * UNITS;
    }

    receive() external payable {}

    fallback() external {}

    /// @notice Mint tokens to a user
    /// @param to The address to mint tokens to
    /// @param amount The amount of tokens to mint
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount * UNITS);
    }

    /// @notice Distribute tokens to a user
    /// @dev emits a TokensDistributed event
    /// @dev reverts if amount is not greater than zero
    /// @dev reverts if amount is greater than the daily limit
    /// @param amount The amount of tokens to distribute
    function getTokens(uint256 amount) external {
        if (amount <= 0) {
            revert Token__AmountNotGreaterThanZero(amount);
        }
        if (amount > i_faucetDailyLimit) {
            revert Token__DailyLimitExceeded(amount, i_faucetDailyLimit);
        }

        _checkAndUpdateDailyLimit(msg.sender, amount);
        _transfer(owner(), msg.sender, amount);

        emit TokensDistributed(msg.sender, amount, block.timestamp);
    }

    /// @notice Check and update the daily limit for a user
    /// @dev reverts if the amount is greater than the daily limit
    /// @param user The address to check
    /// @param amount The amount of tokens to check
    function _checkAndUpdateDailyLimit(address user, uint256 amount) internal {
        uint256 currentTime = block.timestamp;

        // Check if it's more than 1 day since last distribution
        if (currentTime >= s_lastDistributionTime[user] + ONE_DAY) {
            // Reset daily counter for new day
            s_lastDistributionTime[user] = currentTime;
            s_tokensDistributedToday[user] = amount;
        } else {
            // Same day - check if adding this amount exceeds daily limit
            uint256 newTotal = s_tokensDistributedToday[user] + amount;
            if (newTotal > i_faucetDailyLimit) {
                revert Token__DailyLimitExceeded(newTotal, i_faucetDailyLimit);
            }
            s_tokensDistributedToday[user] = newTotal;
        }

        // Ensure we don't exceed the daily limit
        if (s_tokensDistributedToday[user] > i_faucetDailyLimit) {
            revert Token__DailyLimitExceeded(
                s_tokensDistributedToday[user],
                i_faucetDailyLimit
            );
        }
    }

    /// @notice Check available tokens for an address today
    /// @param user The address to check
    /// @return The amount of tokens available for the user today
    function getAvailableTokensToday(
        address user
    ) external view returns (uint256) {
        uint256 currentTime = block.timestamp;

        // If it's been more than 1 day since last distribution
        if (currentTime >= s_lastDistributionTime[user] + ONE_DAY) {
            return i_faucetDailyLimit;
        } else {
            uint256 used = s_tokensDistributedToday[user];
            return i_faucetDailyLimit > used ? i_faucetDailyLimit - used : 0;
        }
    }

    /// @notice Check when the next token request can happen
    /// @param user The address to check
    /// @return The timestamp of the next token request
    function getNextDistributionTime(
        address user
    ) external view returns (uint256) {
        uint256 lastTime = s_lastDistributionTime[user];
        if (lastTime == 0) {
            return 0; // Never distributed before, can distribute now
        }
        return lastTime + ONE_DAY;
    }

    /**
     * Getter functions
     */

    /// @notice Get the faucet daily limit
    function getFaucetDailyLimit() external view returns (uint256) {
        return i_faucetDailyLimit;
    }
}
