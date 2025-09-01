import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs.js';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;
const { toBigInt } = ethers;

const ONE = toBigInt(1);
const tokensDistributed = 100;
const feePercentage = 10;

describe('Exchange', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployExchangeFixture() {
    let initialSupply = 1_000;
    let faucetDailyLimit = 1;

    // Contracts are deployed using the first signer/account by default
    const [deployer, feeAcount, otherAccount] = await ethers.getSigners();
    const owner = deployer;
    const recipient = owner;

    const baseToken = await ethers.deployContract('Token', [
      'DEX',
      'dEx',
      recipient,
      owner,
      initialSupply,
      faucetDailyLimit,
    ]);

    const quoteToken = await ethers.deployContract('Token', [
      'Mock ETH',
      'mEth',
      recipient,
      owner,
      initialSupply,
      faucetDailyLimit * 20,
    ]);

    const exchange = await ethers.deployContract('Exchange', [owner, feeAcount, feePercentage]);

    return {
      exchange,
      baseToken,
      quoteToken,
      owner,
      otherAccount,
      feeAcount,
    };
  }

  async function approveTokensFixture() {
    const { exchange, owner, otherAccount, baseToken, quoteToken } = await loadFixture(deployExchangeFixture);

    // Approve the exchange to spend owner's baseTokens
    await baseToken.connect(owner).approve(exchange.target, tokensDistributed);

    // Distribute baseTokens to otherAccount
    await baseToken.connect(owner).transfer(otherAccount.address, tokensDistributed);
    // Approve `exchange` to spend otherAccount's baseTokens
    await baseToken.connect(otherAccount).approve(exchange.target, tokensDistributed);

    // Distribute quoteTokens to otherAccount
    await quoteToken.connect(owner).transfer(otherAccount.address, tokensDistributed);
    // Approve `exchange` to spend otherAccount's quoteTokens
    await quoteToken.connect(otherAccount).approve(exchange.target, tokensDistributed);

    return { exchange, owner, otherAccount, baseToken, quoteToken };
  }

  async function depositTokensFixture() {
    const { exchange, owner, otherAccount, baseToken, quoteToken } = await loadFixture(approveTokensFixture);

    // Deposit owner's baseTokens to the exchange
    await exchange.connect(owner).deposit(baseToken.target, tokensDistributed);

    // Deposit otherAccount's baseTokens to the exchange
    await exchange.connect(otherAccount).deposit(baseToken.target, tokensDistributed);

    // Deposit otherAccount's quoteTokens to the exchange
    await exchange.connect(otherAccount).deposit(quoteToken.target, tokensDistributed);

    return { exchange, owner, otherAccount, baseToken, quoteToken };
  }

  async function makeOrderFixture() {
    const { exchange, owner, otherAccount, baseToken, quoteToken } = await loadFixture(depositTokensFixture);

    // otherAccount gives all of its quoteTokens in exchange for 1 baseToken
    const makeOrderTx = await exchange
      .connect(otherAccount)
      .makeOrder(baseToken.target, 1, quoteToken.target, tokensDistributed);

    const makeOrderId = await exchange.getOrderCount();

    return { exchange, owner, otherAccount, baseToken, quoteToken, makeOrderTx, makeOrderId };
  }

  async function cancelOrderFixture() {
    const { exchange, owner, otherAccount, baseToken, quoteToken, makeOrderTx, makeOrderId } =
      await loadFixture(makeOrderFixture);

    const cancelOrderTx = await exchange.connect(otherAccount).cancelOrder(makeOrderId);

    return { exchange, owner, otherAccount, baseToken, quoteToken, makeOrderTx, makeOrderId, cancelOrderTx };
  }

  async function fillOrderFixture() {
    const { exchange, owner, otherAccount, baseToken, quoteToken, makeOrderTx, makeOrderId } =
      await loadFixture(makeOrderFixture);

    // owner gives 1 baseToken, for which it has to pay a fee
    const fillOrderTx = await exchange.connect(owner).fillOrder(makeOrderId);

    return { exchange, owner, otherAccount, baseToken, quoteToken, makeOrderId, fillOrderTx };
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { exchange, owner } = await loadFixture(deployExchangeFixture);
      expect(await exchange.owner()).to.equal(owner.address);
    });

    it('Should set the right fee account', async function () {
      const { exchange, feeAcount } = await loadFixture(deployExchangeFixture);
      expect(await exchange.getFeeAccount()).to.equal(feeAcount.address);
    });

    it('Should set the right fee percentage', async function () {
      const { exchange } = await loadFixture(deployExchangeFixture);
      expect(await exchange.getFeePercentage()).to.equal(feePercentage);
    });
  });

  describe('Deposit', function () {
    it('Should fail if not enough allowance', async function () {
      const { exchange, otherAccount, baseToken } = await loadFixture(approveTokensFixture);

      // Attempting to deposit more tokens than allowance should fail with custom error:
      // 'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)'
      await expect(exchange.connect(otherAccount).deposit(baseToken.target, tokensDistributed + 1))
        .to.be.revertedWithCustomError(baseToken, 'ERC20InsufficientAllowance')
        .withArgs(exchange.target, tokensDistributed, tokensDistributed + 1);
    });

    it('Should allow depositing tokens', async function () {
      const { exchange, otherAccount, baseToken } = await loadFixture(approveTokensFixture);

      // Deposit `otherAccount`'s tokens to the exchange
      const tx = await exchange.connect(otherAccount).deposit(baseToken.target, tokensDistributed);

      // The exchange should emit a 'Deposit' event with the following parameters:
      // 'event Deposit(address indexed token, address indexed user, uint256 amount, uint256 balance)'
      await expect(tx)
        .to.emit(exchange, 'Deposit')
        .withArgs(baseToken.target, otherAccount.address, tokensDistributed, tokensDistributed);

      await expect(tx).to.changeTokenBalances(
        baseToken,
        [otherAccount, exchange],
        [-tokensDistributed, tokensDistributed]
      );
    });
  });

  describe('Withdraw', function () {
    it('Should fail when attempting to withdraw more tokens than the exchange has', async function () {
      const { exchange, otherAccount, baseToken } = await loadFixture(depositTokensFixture);

      // Attempting to withdraw more tokens than the exchange has should fail with custom error:
      // 'error Exchange__InsufficientBalanceToWithdraw(uint256 balance, uint256 amount)'
      await expect(exchange.connect(otherAccount).withdraw(baseToken.target, tokensDistributed + 1))
        .to.be.revertedWithCustomError(exchange, 'Exchange__InsufficientBalanceToWithdraw')
        .withArgs(tokensDistributed, tokensDistributed + 1);
    });

    it('Should allow withdrawing tokens', async function () {
      const { exchange, otherAccount, baseToken } = await loadFixture(depositTokensFixture);

      // Withdraw `otherAccount`'s tokens from the exchange
      const tx = await exchange.connect(otherAccount).withdraw(baseToken.target, tokensDistributed);

      // The exchange should emit a 'Withdraw' event with the following parameters:
      // 'event Withdraw(address indexed token, address indexed user, uint256 amount, uint256 balance)'
      await expect(tx)
        .to.emit(exchange, 'Withdraw')
        .withArgs(baseToken.target, otherAccount.address, tokensDistributed, 0);

      await expect(tx).to.changeTokenBalances(
        baseToken,
        [otherAccount, exchange],
        [tokensDistributed, -tokensDistributed]
      );
    });
  });

  describe('Make Order', function () {
    it('Should fail if not enough balance to make order', async function () {
      const { exchange, otherAccount, baseToken, quoteToken } = await loadFixture(depositTokensFixture);

      // Attempting to make an order with more tokens than the user has on the exchange should fail with custom error:
      // 'error Exchange__InsufficientBalanceToMakeOrder(uint256 balance, uint256 amount)'
      await expect(
        exchange
          .connect(otherAccount)
          .makeOrder(baseToken.target, 1, quoteToken.target, tokensDistributed + 1)
      )
        .to.be.revertedWithCustomError(exchange, 'Exchange__InsufficientBalanceToMakeOrder')
        .withArgs(tokensDistributed, tokensDistributed + 1);
    });

    it('Should allow making an order', async function () {
      const { exchange, otherAccount, baseToken, quoteToken, makeOrderTx, makeOrderId } = await loadFixture(
        makeOrderFixture
      );

      // The exchange should emit a 'MakeOrder' event with the following parameters:
      // 'event MakeOrder(uint256 id, address indexed maker, address indexed tokenGet, uint256 amountGet, address indexed tokenGive, uint256 amountGive, uint256 createdAt)'
      await expect(makeOrderTx)
        .to.emit(exchange, 'MakeOrder')
        .withArgs(
          makeOrderId,
          otherAccount.address,
          baseToken.target,
          1,
          quoteToken.target,
          tokensDistributed,
          anyValue
        );
    });
  });

  describe('Cancel Order', function () {
    it('Should fail if not called by the maker', async function () {
      const { exchange, owner, makeOrderId } = await loadFixture(makeOrderFixture);

      // Attempting to cancel an order with a different maker ('owner' instead of 'otherAccount') should fail with custom error:
      // 'error Exchange__UnauthorizedClient()'
      await expect(exchange.connect(owner).cancelOrder(makeOrderId)).to.be.revertedWithCustomError(
        exchange,
        'Exchange__UnauthorizedClient'
      );
    });

    it('Should fail if the order is already cancelled', async function () {
      const { exchange, otherAccount, makeOrderId } = await loadFixture(cancelOrderFixture);

      // Attempting to cancel an order that is already cancelled should fail with custom error:
      // 'error Exchange__OrderAlreadyCancelled(uint256 id)'
      await expect(exchange.connect(otherAccount).cancelOrder(makeOrderId))
        .to.be.revertedWithCustomError(exchange, 'Exchange__OrderAlreadyCancelled')
        .withArgs(makeOrderId);
    });

    it('Should fail if the order is already filled', async function () {
      const { exchange, otherAccount, makeOrderId } = await loadFixture(fillOrderFixture);

      // Attempting to cancel an order that is already filled should fail with custom error:
      // 'error Exchange__OrderAlreadyFilled(uint256 id)'
      await expect(exchange.connect(otherAccount).cancelOrder(makeOrderId))
        .to.be.revertedWithCustomError(exchange, 'Exchange__OrderAlreadyFilled')
        .withArgs(makeOrderId);
    });

    it('Should allow cancelling an order', async function () {
      const { exchange, otherAccount, baseToken, quoteToken, makeOrderId, cancelOrderTx } = await loadFixture(
        cancelOrderFixture
      );

      // The exchange should emit a 'CancelOrder' event with the following parameters:
      // 'event CancelOrder(uint256 id, address indexed maker, address indexed tokenGet, uint256 amountGet, address indexed tokenGive, uint256 amountGive, uint256 createdAt)'
      await expect(cancelOrderTx)
        .to.emit(exchange, 'CancelOrder')
        .withArgs(
          makeOrderId,
          otherAccount.address,
          baseToken.target,
          1,
          quoteToken.target,
          tokensDistributed,
          anyValue
        );
    });
  });

  describe('Fill Order', function () {
    it('Should fail if the order id is invalid', async function () {
      const { exchange, owner, makeOrderId } = await loadFixture(makeOrderFixture);

      // Attempting to fill an order with an invalid order id should fail with custom error:
      // 'error Exchange__InvalidOrder(uint256 id)'
      await expect(exchange.connect(owner).fillOrder(makeOrderId + ONE))
        .to.be.revertedWithCustomError(exchange, 'Exchange__InvalidOrder')
        .withArgs(makeOrderId + ONE);
    });

    it('Should fail if the order is already filled', async function () {
      const { exchange, owner, makeOrderId } = await loadFixture(fillOrderFixture);

      // Attempting to fill an order that is already filled should fail with custom error:
      // 'error Exchange__OrderAlreadyFilled(uint256 id)'
      await expect(exchange.connect(owner).fillOrder(makeOrderId))
        .to.be.revertedWithCustomError(exchange, 'Exchange__OrderAlreadyFilled')
        .withArgs(makeOrderId);
    });

    it('Should fail if the order is already cancelled', async function () {
      const { exchange, owner, makeOrderId } = await loadFixture(cancelOrderFixture);

      // Attempting to fill an order that is already cancelled should fail with custom error:
      // 'error Exchange__OrderAlreadyCancelled(uint256 id)'
      await expect(exchange.connect(owner).fillOrder(makeOrderId))
        .to.be.revertedWithCustomError(exchange, 'Exchange__OrderAlreadyCancelled')
        .withArgs(makeOrderId);
    });

    it('Should fail if the taker is the same as the maker', async function () {
      const { exchange, otherAccount, makeOrderId } = await loadFixture(makeOrderFixture);

      // Attempting to fill an order with the same maker and taker should fail with custom error:
      // 'error Exchange__InvalidTaker(address taker)'
      await expect(exchange.connect(otherAccount).fillOrder(makeOrderId))
        .to.be.revertedWithCustomError(exchange, 'Exchange__InvalidTaker')
        .withArgs(otherAccount.address);
    });

    it(`Should fail if the taker's balance can't accomodate the fees`, async function () {
      const { exchange, owner, otherAccount, baseToken, quoteToken } = await loadFixture(
        depositTokensFixture
      );

      // otherAccount gives 1 of its quoteToken in exchange for 100 baseTokens
      const makeOrderTx = await exchange
        .connect(otherAccount)
        .makeOrder(baseToken.target, tokensDistributed, quoteToken.target, 1);

      const makeOrderId = await exchange.getOrderCount();

      // Owner attempt to fill the order wihtout being able to accomodate the fees should fail with custom error:
      // 'error Exchange__InsufficientBalanceToFillOrder(uint256 balance, uint256 amount)'
      await expect(exchange.connect(owner).fillOrder(makeOrderId))
        .to.be.revertedWithCustomError(exchange, 'Exchange__InsufficientBalanceToFillOrder')
        .withArgs(
          tokensDistributed,
          (totalAmount) =>
            totalAmount === toBigInt(tokensDistributed + (feePercentage * tokensDistributed) / 100)
        );
    });

    it('Should allow filling an order', async function () {
      const { exchange, owner, otherAccount, baseToken, quoteToken, makeOrderId, fillOrderTx } =
        await loadFixture(fillOrderFixture);

      // The exchange should emit a 'FillOrder' event with the following parameters:
      // 'event FillOrder(uint256 id, address indexed maker, address indexed taker, address indexed tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 createdAt)'
      await expect(fillOrderTx)
        .to.emit(exchange, 'FillOrder')
        .withArgs(
          makeOrderId,
          otherAccount.address,
          owner.address,
          baseToken.target,
          1,
          quoteToken.target,
          tokensDistributed,
          anyValue
        );

      expect(await exchange.balanceOf(baseToken.target, otherAccount.address)).to.be.equal(
        tokensDistributed + 1
      );
      expect(await exchange.balanceOf(quoteToken.target, otherAccount.address)).to.be.equal(0);
      expect(await exchange.balanceOf(baseToken.target, owner.address)).to.be.equal(tokensDistributed - 1);
      expect(await exchange.balanceOf(quoteToken.target, owner.address)).to.be.equal(tokensDistributed);
    });
  });

  describe('Fail transfers on mocked contracts', function () {
    async function deployMockExchangeFixture() {
      let initialSupply = 1_000;
      let faucetDailyLimit = 1;

      // Contracts are deployed using the first signer/account by default
      const [deployer, feeAcount, otherAccount] = await ethers.getSigners();
      const owner = deployer;

      const mockToken = await ethers.deployContract('MockToken', [
        'mDEX',
        'mdEx',
        owner,
        initialSupply,
        faucetDailyLimit,
      ]);

      const exchange = await ethers.deployContract('Exchange', [owner, feeAcount, feePercentage]);

      return {
        exchange,
        mockToken,
        owner,
        otherAccount,
      };
    }

    it('Should revert `deposit` if `token.transferFrom` fails', async function () {
      const { exchange, mockToken, owner, otherAccount } = await loadFixture(deployMockExchangeFixture);

      // Distribute mockTokens to otherAccount
      await mockToken.connect(owner).transfer(otherAccount.address, tokensDistributed);
      // Approve `exchange` to spend otherAccount's mockTokens
      await mockToken.connect(otherAccount).approve(exchange.target, tokensDistributed);

      // Set mockToken to fail transfers
      await mockToken.setShouldFailTransfer(true);

      // Attempting to deposit mockTokens to the exchange should fail with custom error:
      // 'error SafeERC20FailedOperation(address token)'
      await expect(exchange.connect(otherAccount).deposit(mockToken.target, tokensDistributed))
        .to.be.revertedWithCustomError(exchange, 'SafeERC20FailedOperation')
        .withArgs(mockToken.target);
    });

    it('Should revert `withdrawal` if `token.transfer` fails', async function () {
      const { exchange, mockToken, owner, otherAccount } = await loadFixture(deployMockExchangeFixture);

      // Distribute mockTokens to otherAccount
      await mockToken.connect(owner).transfer(otherAccount.address, tokensDistributed);
      // Approve `exchange` to spend otherAccount's mockTokens
      await mockToken.connect(otherAccount).approve(exchange.target, tokensDistributed);
      // Deposit otherAccount's mockTokens to the exchange
      await exchange.connect(otherAccount).deposit(mockToken.target, tokensDistributed);

      // Set mockToken to fail transfers
      await mockToken.setShouldFailTransfer(true);

      // Attempting to withdraw mockTokens from the exchange should fail with custom error:
      // 'error SafeERC20FailedOperation(address token)'
      await expect(exchange.connect(otherAccount).withdraw(mockToken.target, tokensDistributed))
        .to.be.revertedWithCustomError(exchange, 'SafeERC20FailedOperation')
        .withArgs(mockToken.target);
    });
  });
});
