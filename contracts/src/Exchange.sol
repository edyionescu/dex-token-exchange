// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title dEx Token Exchange
/// @author Edy Ionescu
/// @notice Decentralized exchange for ERC20 tokens
/// @dev The contract is initially owned by the deployer and manages balances, orders, and fees.
/// @custom:security-contact errorsmith@gmail.com
contract Exchange is Ownable {
    using SafeERC20 for IERC20;

    // Errors
    error Exchange__InsufficientBalanceToWithdraw(
        uint256 balance,
        uint256 amount
    );
    error Exchange__InsufficientBalanceToMakeOrder(
        uint256 balance,
        uint256 amount
    );
    error Exchange__UnauthorizedClient();
    error Exchange__InvalidOrder(uint256 id);
    error Exchange__OrderAlreadyCancelled(uint256 id);
    error Exchange__OrderAlreadyFilled(uint256 id);
    error Exchange__InvalidTaker(address taker);
    error Exchange__InsufficientBalanceToFillOrder(
        uint256 balance,
        uint256 amount
    );

    // Type declarations
    enum TransferType {
        DEPOSIT,
        WITHDRAW
    }

    struct Order {
        uint256 id;
        address maker;
        uint256 amountGet;
        address tokenGet;
        uint256 amountGive;
        address tokenGive; // slot 5
        uint64 createdAt; // packed together with 'tokenGive' in slot 5
    }

    // State variables
    address private s_feeAccount;
    uint256 private s_feePercentage;
    uint256 private s_orderCount;

    mapping(uint256 orderId => Order order) private s_orders;
    mapping(uint256 orderId => bool cancelled) private s_ordersCancelled;
    mapping(uint256 orderId => bool filled) private s_ordersFilled;
    mapping(address token => mapping(address user => uint256 amount))
        private s_balanceOf;

    // Events
    event Deposit(
        address indexed token,
        address indexed user,
        uint256 amount,
        uint256 balance
    );
    event Withdraw(
        address indexed token,
        address indexed user,
        uint256 amount,
        uint256 balance
    );
    event MakeOrder(
        uint256 id,
        address indexed maker,
        address indexed tokenGet,
        uint256 amountGet,
        address indexed tokenGive,
        uint256 amountGive,
        uint256 createdAt
    );
    event CancelOrder(
        uint256 id,
        address indexed maker,
        address indexed tokenGet,
        uint256 amountGet,
        address indexed tokenGive,
        uint256 amountGive,
        uint256 createdAt
    );
    event FillOrder(
        uint256 id,
        address indexed maker,
        address indexed taker,
        address indexed tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 createdAt
    );

    constructor(
        address initialOwner,
        address feeAccount,
        uint256 feePercentage
    ) Ownable(initialOwner) {
        s_feeAccount = feeAccount;
        s_feePercentage = feePercentage;
    }

    receive() external payable {}

    fallback() external {}

    /// @notice Deposit tokens into the exchange
    /// @dev emits a Deposit event
    /// @param token The address of the token to deposit
    /// @param amount The amount of tokens to deposit
    function deposit(address payable token, uint256 amount) external {
        address user = msg.sender;
        address exchange = address(this);

        // Transfer tokens from user to exchange
        IERC20(token).safeTransferFrom(user, exchange, amount);

        // Update user's balance on the exchange
        s_balanceOf[token][user] += amount;

        // Emit 'Deposit' event
        emit Deposit(token, user, amount, s_balanceOf[token][user]);
    }

    /// @notice Withdraw tokens from the exchange
    /// @dev emits a Withdraw event
    /// @param token The address of the token to withdraw
    /// @param amount The amount of tokens to withdraw
    function withdraw(address payable token, uint256 amount) external {
        address user = msg.sender;

        if (s_balanceOf[token][user] < amount) {
            revert Exchange__InsufficientBalanceToWithdraw(
                s_balanceOf[token][user],
                amount
            );
        }

        // Transfer tokens from exchange to user
        IERC20(token).safeTransfer(user, amount);

        // Update user's balance on the exchange
        s_balanceOf[token][user] -= amount;

        // Emit 'Withdraw' event
        emit Withdraw(token, user, amount, s_balanceOf[token][user]);
    }

    /// @notice Create a new order
    /// @dev emits a MakeOrder event
    /// @dev reverts if the user does not have enough balance to make the order
    /// @param tokenGet The address of the token to get
    /// @param amountGet The amount of tokens to get
    /// @param tokenGive The address of the token to give
    /// @param amountGive The amount of tokens to give
    function makeOrder(
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive
    ) external {
        address maker = msg.sender;

        if (s_balanceOf[tokenGive][maker] < amountGive) {
            revert Exchange__InsufficientBalanceToMakeOrder(
                s_balanceOf[tokenGive][maker],
                amountGive
            );
        }

        s_orderCount++;

        s_orders[s_orderCount] = Order(
            s_orderCount,
            maker,
            amountGet,
            tokenGet,
            amountGive,
            tokenGive,
            uint64(block.timestamp)
        );

        emit MakeOrder(
            s_orderCount,
            maker,
            tokenGet,
            amountGet,
            tokenGive,
            amountGive,
            block.timestamp
        );
    }

    /// @notice Cancel an order
    /// @dev emits a CancelOrder event
    /// @dev reverts if the order is not owned by the user
    /// @dev reverts if the order has already been cancelled
    /// @dev reverts if the order has already been filled
    /// @param id The ID of the order to cancel
    function cancelOrder(uint256 id) external {
        address maker = msg.sender;
        Order storage order = s_orders[id];

        if (order.maker != maker) {
            revert Exchange__UnauthorizedClient();
        }
        if (s_ordersCancelled[id]) {
            revert Exchange__OrderAlreadyCancelled(id);
        }
        if (s_ordersFilled[id]) {
            revert Exchange__OrderAlreadyFilled(id);
        }

        s_ordersCancelled[id] = true;

        emit CancelOrder(
            order.id,
            maker,
            order.tokenGet,
            order.amountGet,
            order.tokenGive,
            order.amountGive,
            block.timestamp
        );
    }

    /// @notice Fill an order
    /// @dev reverts if the order ID is invalid
    /// @dev reverts if the order has already been filled
    /// @dev reverts if the order has already been cancelled
    /// @param id The ID of the order to fill
    function fillOrder(uint256 id) external {
        Order storage order = s_orders[id];

        if (order.id == 0 || order.id > s_orderCount) {
            revert Exchange__InvalidOrder(id);
        }
        if (s_ordersFilled[id]) {
            revert Exchange__OrderAlreadyFilled(id);
        }
        if (s_ordersCancelled[id]) {
            revert Exchange__OrderAlreadyCancelled(id);
        }

        _executeTrade(
            order.id,
            order.maker,
            order.tokenGet,
            order.amountGet,
            order.tokenGive,
            order.amountGive
        );

        s_ordersFilled[order.id] = true;
    }

    /// @notice Execute a trade
    /// @dev emits a FillOrder event
    /// @dev reverts if the taker is the maker
    /// @dev reverts if there's insufficient balance to pay the fee
    /// @param id The ID of the order to fill
    /// @param maker The address of the maker
    /// @param tokenGet The address of the token to get
    /// @param amountGet The amount of tokens to get
    /// @param tokenGive The address of the token to give
    /// @param amountGive The amount of tokens to give
    function _executeTrade(
        uint256 id,
        address maker,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive
    ) private {
        address taker = msg.sender;

        if (taker == maker) {
            revert Exchange__InvalidTaker(taker);
        }

        // Fee is paid by 'taker', so fee is deducted from taker's 'amountGet'.
        uint256 feeAmount = (s_feePercentage * amountGet) / 100;

        if (s_balanceOf[tokenGet][taker] < amountGet + feeAmount) {
            // Balance can't accomodate fees.
            revert Exchange__InsufficientBalanceToFillOrder(
                s_balanceOf[tokenGet][taker],
                amountGet + feeAmount
            );
        }

        s_balanceOf[tokenGet][taker] -= amountGet + feeAmount;
        s_balanceOf[tokenGet][maker] += amountGet;

        s_balanceOf[tokenGive][maker] -= amountGive;
        s_balanceOf[tokenGive][taker] += amountGive;

        // Charge the fees
        s_balanceOf[tokenGet][s_feeAccount] += feeAmount;

        emit FillOrder(
            id,
            maker,
            taker,
            tokenGet,
            amountGet,
            tokenGive,
            amountGive,
            block.timestamp
        );
    }

    /**
     * Getter functions
     */
    function getOrderCount() external view returns (uint256) {
        return s_orderCount;
    }

    function getOrder(uint256 id) external view returns (Order memory) {
        return s_orders[id];
    }

    function getOrderFilled(uint256 id) external view returns (bool) {
        return s_ordersFilled[id];
    }

    function getOrderCancelled(uint256 id) external view returns (bool) {
        return s_ordersCancelled[id];
    }

    function getOrderOpen(uint256 id) external view returns (bool) {
        return
            s_orders[id].id > 0 &&
            !s_ordersFilled[id] &&
            !s_ordersCancelled[id];
    }

    function getFeeAccount() external view returns (address) {
        return s_feeAccount;
    }

    function getFeePercentage() external view returns (uint256) {
        return s_feePercentage;
    }

    function balanceOf(
        address token,
        address user
    ) external view returns (uint256) {
        return s_balanceOf[token][user];
    }
}
