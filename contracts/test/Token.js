import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs.js';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';
import { toUnits } from '../../lib/helpers.js';

const { ethers } = hre;
const { toBigInt, ZeroAddress } = ethers;

const ONE = toBigInt(1);
const TWO = toBigInt(2);

describe('Token', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTokenFixture() {
    let initialSupply = 1_000;
    let faucetDailyLimit = 1;

    // Contracts are deployed using the first signer/account by default
    const [deployer, otherAccount] = await ethers.getSigners();
    const owner = deployer;
    const recipient = owner;

    const token = await ethers.deployContract('Token', [
      'DEX',
      'dEx',
      recipient,
      owner,
      initialSupply,
      faucetDailyLimit,
    ]);

    const decimals = await token.decimals();
    initialSupply = toUnits(initialSupply, decimals, ethers);
    faucetDailyLimit = toUnits(faucetDailyLimit, decimals, ethers);

    return { owner, otherAccount, token, initialSupply, faucetDailyLimit, decimals };
  }

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { owner, token } = await loadFixture(deployTokenFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it('Should set the right initial supply', async function () {
      const { owner, token, initialSupply } = await loadFixture(deployTokenFixture);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it('Should set the right owner balance', async function () {
      const { owner, token, initialSupply } = await loadFixture(deployTokenFixture);
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it('Should set the right faucet daily limit', async function () {
      const { owner, token, faucetDailyLimit } = await loadFixture(deployTokenFixture);
      expect(await token.getFaucetDailyLimit()).to.equal(faucetDailyLimit);
    });

    it('Should create and assign tokens to an account when minting', async function () {
      const { owner, token, initialSupply, decimals } = await loadFixture(deployTokenFixture);
      const mintAmount = ONE;

      await expect(token.mint(owner.address, mintAmount))
        .to.emit(token, 'Transfer')
        .withArgs(ZeroAddress, owner.address, toUnits(mintAmount, decimals, ethers));

      expect(await token.balanceOf(owner.address)).to.equal(
        initialSupply + toUnits(mintAmount, decimals, ethers)
      );
    });

    it('Should allow a new owner to mint tokens', async function () {
      const { owner, otherAccount, token, initialSupply, decimals } = await loadFixture(deployTokenFixture);
      const mintAmount = ONE;

      await expect(token.transferOwnership(otherAccount.address))
        .to.emit(token, 'OwnershipTransferred')
        .withArgs(owner.address, otherAccount.address);

      await expect(token.connect(otherAccount).mint(owner.address, mintAmount))
        .to.emit(token, 'Transfer')
        .withArgs(ZeroAddress, owner.address, toUnits(mintAmount, decimals, ethers));

      expect(await token.balanceOf(owner.address)).to.equal(
        initialSupply + toUnits(mintAmount, decimals, ethers)
      );
    });

    it('Should disable any functionality that is only available to the owner when renounced', async function () {
      const { owner, token } = await loadFixture(deployTokenFixture);

      await expect(token.renounceOwnership())
        .to.emit(token, 'OwnershipTransferred')
        .withArgs(owner.address, ZeroAddress);
      expect(await token.owner()).to.equal(ZeroAddress);

      await expect(token.connect(owner).mint(owner.address, ONE))
        .to.be.revertedWithCustomError(token, 'OwnableUnauthorizedAccount')
        .withArgs(owner.address);
    });

    it('Should fail minting to an invalid address', async function () {
      const { token } = await loadFixture(deployTokenFixture);
      const mintAmount = ONE;

      await expect(token.mint(ZeroAddress, mintAmount))
        .to.be.revertedWithCustomError(token, 'ERC20InvalidReceiver')
        .withArgs(ZeroAddress);
    });
  });

  describe('Transfer', function () {
    it('Should transfer the tokens to the right account', async function () {
      const { owner, otherAccount, token, initialSupply } = await loadFixture(deployTokenFixture);
      const transferAmount = initialSupply / TWO;

      // Perform the transfer
      await expect(token.transfer(otherAccount.address, transferAmount))
        .to.emit(token, 'Transfer')
        .withArgs(owner.address, otherAccount.address, transferAmount);

      // Check balances after transfer
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - transferAmount);
      expect(await token.balanceOf(otherAccount.address)).to.equal(transferAmount);
    });

    it('Should revert if supply is too low', async function () {
      const { owner, otherAccount, token, initialSupply } = await loadFixture(deployTokenFixture);

      const transferAmount = initialSupply + ONE;
      await expect(token.transfer(otherAccount.address, transferAmount))
        .to.be.revertedWithCustomError(token, 'ERC20InsufficientBalance')
        .withArgs(owner.address, initialSupply, transferAmount);
    });

    it('Should allow transferring zero tokens', async function () {
      const { owner, otherAccount, token } = await loadFixture(deployTokenFixture);
      const transferAmount = 0;

      await expect(token.transfer(otherAccount.address, transferAmount))
        .to.emit(token, 'Transfer')
        .withArgs(owner.address, otherAccount.address, transferAmount);

      expect(await token.balanceOf(otherAccount.address)).to.equal(transferAmount);
    });

    it('Should allow transferring to self', async function () {
      const { owner, token, initialSupply } = await loadFixture(deployTokenFixture);
      const transferAmount = initialSupply / TWO;

      await expect(token.transfer(owner.address, transferAmount))
        .to.emit(token, 'Transfer')
        .withArgs(owner.address, owner.address, transferAmount);

      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });
  });

  describe('Get tokens', function () {
    it('Should revert if amount is not greater than zero', async function () {
      const { owner, token } = await loadFixture(deployTokenFixture);

      const requestedAmount = 0;
      await expect(token.getTokens(requestedAmount))
        .to.be.revertedWithCustomError(token, 'Token__AmountNotGreaterThanZero')
        .withArgs(requestedAmount);
    });

    it('Should revert if amount exceeds daily limit', async function () {
      const { owner, token, faucetDailyLimit } = await loadFixture(deployTokenFixture);

      const requestedAmount = faucetDailyLimit + ONE;
      await expect(token.getTokens(requestedAmount))
        .to.be.revertedWithCustomError(token, 'Token__DailyLimitExceeded')
        .withArgs(requestedAmount, faucetDailyLimit);
    });

    it('Should allow getting a partial number of tokens from the daily limit', async function () {
      const { owner, otherAccount, token, initialSupply, faucetDailyLimit } = await loadFixture(
        deployTokenFixture
      );

      const requestedAmount = faucetDailyLimit / TWO;

      await expect(token.connect(otherAccount).getTokens(requestedAmount))
        .to.emit(token, 'TokensDistributed')
        .withArgs(otherAccount.address, requestedAmount, anyValue);

      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - requestedAmount);
      expect(await token.balanceOf(otherAccount.address)).to.equal(requestedAmount);
      expect(await token.getAvailableTokensToday(otherAccount.address)).to.equal(
        faucetDailyLimit - requestedAmount
      );
    });

    it('Should allow getting the full number of tokens from the daily limit', async function () {
      const { owner, otherAccount, token, initialSupply, faucetDailyLimit } = await loadFixture(
        deployTokenFixture
      );

      const requestedAmount = faucetDailyLimit;

      await expect(token.connect(otherAccount).getTokens(requestedAmount))
        .to.emit(token, 'TokensDistributed')
        .withArgs(otherAccount.address, requestedAmount, anyValue);

      expect(await token.balanceOf(owner.address)).to.equal(initialSupply - requestedAmount);
      expect(await token.balanceOf(otherAccount.address)).to.equal(requestedAmount);
      expect(await token.getAvailableTokensToday(otherAccount.address)).to.equal(0);

      const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
      const now = await time.latest();
      const expectedMinTime = now + ONE_DAY_IN_SECONDS;
      const actualNextDistribution = await token.getNextDistributionTime(otherAccount.address);

      expect(actualNextDistribution).to.be.greaterThanOrEqual(expectedMinTime);
    });
  });
});
