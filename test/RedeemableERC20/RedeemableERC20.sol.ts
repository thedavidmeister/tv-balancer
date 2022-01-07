import * as Util from "../Util";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
import type { ReserveToken } from "../../typechain/ReserveToken";
import type { ReadWriteTier } from "../../typechain/ReadWriteTier";
import type { RedeemableERC20 } from "../../typechain/RedeemableERC20";
import type { Contract } from "ethers";

chai.use(solidity);
const { expect, assert } = chai;

enum Tier {
  NIL,
  COPPER,
  BRONZE,
  SILVER,
  GOLD,
  PLATINUM,
  DIAMOND,
  CHAD,
  JAWAD,
}

enum Phase {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
}

describe("RedeemableERC20", async function () {
  it("should guard against null treasury assets redemptions", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();
    const alice = signers[1];

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    await tier.setTier(alice.address, Tier.GOLD, []);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalSupply,
    });

    // Redemption not allowed yet.
    await Util.assertError(
      async () => await redeemableERC20.redeem([reserve.address], 100),
      "BAD_PHASE",
      "redeem did not error"
    );

    // Send alice some tokens.
    await redeemableERC20.transfer(alice.address, 10);

    // admin can burn all tokens of a single address to end `Phase.ZERO`
    await redeemableERC20.burnDistributors([Util.oneAddress]);

    const aliceRedeemableERC20 = redeemableERC20.connect(alice);
    // owner is on the unfreezable list.
    await aliceRedeemableERC20.transfer(signers[0].address, 1);

    // pool exits and reserve tokens sent to redeemable ERC20 address
    const reserveTotal = ethers.BigNumber.from("1000" + Util.sixZeros);
    await reserve.transfer(redeemableERC20.address, reserveTotal);

    // redeem should work now
    const redeemAmount = ethers.BigNumber.from("50" + Util.eighteenZeros);

    // signer redeems all tokens they have for fraction of each asset
    await Util.assertError(
      async () => await redeemableERC20.redeem([], redeemAmount),
      "EMPTY_ASSETS",
      "wrongly redeemed null treasury assets"
    );
  });

  it("should emit TreasuryAsset event", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const reserve1 = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;
    const reserve2 = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;

    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve1.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalSupply,
    });

    await expect(redeemableERC20.newTreasuryAsset(reserve1.address))
      .to.emit(redeemableERC20, "TreasuryAsset")
      .withArgs(signers[0].address, reserve1.address);
    await expect(redeemableERC20.newTreasuryAsset(reserve2.address))
      .to.emit(redeemableERC20, "TreasuryAsset")
      .withArgs(signers[0].address, reserve2.address);

    // anon can emit treasury events also.
    await expect(
      redeemableERC20.connect(signers[1]).newTreasuryAsset(reserve1.address)
    )
      .to.emit(redeemableERC20, "TreasuryAsset")
      .withArgs(signers[1].address, reserve1.address);
  });

  it("should have 18 decimals", async () => {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const token = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalSupply,
    });

    // token has 18 decimals
    const decimals = await token.decimals();
    assert(decimals === 18, `expected 18 decimals, got ${decimals}`);
  });

  it("should fail to construct redeemable token if too few minted tokens", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = 0;

    const totalTokenSupplyZero = ethers.BigNumber.from(
      "0" + Util.eighteenZeros
    );
    const totalTokenSupplyOneShort = ethers.BigNumber.from(
      "1" + Util.eighteenZeros
    ).sub(1);
    const totalTokenSupplyMinimum = ethers.BigNumber.from(
      "1" + Util.eighteenZeros
    );

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    await Util.assertError(
      async () =>
        await Util.redeemableERC20Deploy(signers[0], {
          admin: signers[0].address,
          reserve: reserve.address,
          erc20Config,
          tier: tier.address,
          minimumTier,
          totalSupply: totalTokenSupplyZero,
        }),
      `MINIMUM_INITIAL_SUPPLY`,
      `failed to error when constructed with 0 total supply`
    );

    await Util.assertError(
      async () =>
        await Util.redeemableERC20Deploy(signers[0], {
          admin: signers[0].address,
          reserve: reserve.address,
          erc20Config,
          tier: tier.address,
          minimumTier,
          totalSupply: totalTokenSupplyOneShort,
        }),
      `MINIMUM_INITIAL_SUPPLY`,
      `failed to error when constructed with 0 total supply`
    );

    await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalTokenSupplyMinimum,
    });
  });

  it("should allow admin to grant sender/receiver roles, and burn undistributed tokens, bypassing BlockBlockable restrictions", async function () {
    this.timeout(0);

    const TEN_TOKENS = ethers.BigNumber.from("10" + Util.eighteenZeros);

    const signers = await ethers.getSigners();

    const owner = signers[0];
    const sender = signers[1];
    const receiver = signers[2];

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    await tier.setTier(sender.address, Tier.COPPER, []);
    await tier.setTier(receiver.address, Tier.COPPER, []);

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const token = (await Util.redeemableERC20Deploy(owner, {
      admin: owner.address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalSupply,
    })) as RedeemableERC20 & Contract;

    // try sending/receiving, both with insufficient tier
    await Util.assertError(
      async () => await token.connect(sender).transfer(receiver.address, 1),
      "MIN_TIER",
      "sender/receiver sent/received tokens despite insufficient tier status"
    );

    // remove transfer restrictions for sender and receiver
    await token.grantSender(sender.address);
    assert(await token.isSender(sender.address), "sender status was wrong");

    await token.grantReceiver(receiver.address);
    assert(
      await token.isReceiver(receiver.address),
      "receiver status was wrong"
    );

    // sender needs tokens (actually needs permission to receive these tokens anyway)
    await token.grantReceiver(sender.address);
    assert(
      await token.isReceiver(sender.address),
      "sender did not also become receiver"
    );
    assert(
      await token.isSender(sender.address),
      "sender did not remain sender after also becoming receiver"
    );

    // give some tokens
    await token.transfer(sender.address, TEN_TOKENS);

    // should work now
    await token.connect(sender).transfer(receiver.address, 1);

    await token.burnDistributors([Util.oneAddress]);

    // sender and receiver should be unrestricted in phase 1
    await token.connect(sender).transfer(receiver.address, 1);
  });

  it("should prevent tokens being sent to self (when user should be redeeming)", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalSupply,
    });

    // user attempts to wrongly 'redeem' by sending all of their redeemable tokens directly to contract address
    await Util.assertError(
      async () =>
        await redeemableERC20.transfer(
          redeemableERC20.address,
          await redeemableERC20.balanceOf(signers[0].address)
        ),
      "TOKEN_SEND_SELF",
      "user successfully transferred all their redeemables tokens to token contract"
    );
  });

  it("should lock tokens until redeemed", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();
    const alice = signers[1];

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    await tier.setTier(alice.address, Tier.GOLD, []);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier,
      totalSupply: totalSupply,
    });

    await redeemableERC20.deployed();

    // There are no reserve tokens in the redeemer on construction
    assert(
      (await reserve.balanceOf(redeemableERC20.address)).eq(0),
      "reserve was not 0 on redeemable construction"
    );

    // There are no redeemable tokens created on construction
    assert(
      (await redeemableERC20.totalSupply()).eq(totalSupply),
      `total supply was not ${totalSupply} on redeemable construction`
    );

    // The phase is not set (i.e. contract is blocked)
    assert(
      (await redeemableERC20.currentPhase()) === Phase.ZERO,
      `phase was not ${Phase.ZERO} in construction`
    );

    // Normal ERC20 labelling applies
    assert(
      (await redeemableERC20.name()) === "RedeemableERC20",
      "redeemable token did not set name correctly"
    );
    assert(
      (await redeemableERC20.symbol()) === "RDX",
      "redeemable token did not set symbol correctly"
    );

    // Redemption not allowed yet.
    await Util.assertError(
      async () => await redeemableERC20.redeem([reserve.address], 100),
      "BAD_PHASE",
      "redeem did not error"
    );

    // We cannot send to the token address.
    await Util.assertError(
      async () => await redeemableERC20.transfer(redeemableERC20.address, 10),
      "TOKEN_SEND_SELF",
      "self send was not blocked"
    );

    // Send alice some tokens.
    await redeemableERC20.transfer(alice.address, 10);

    const now = await ethers.provider.getBlockNumber();

    await expect(redeemableERC20.burnDistributors([Util.oneAddress]))
      .to.emit(redeemableERC20, "PhaseShiftScheduled")
      .withArgs(now + 1);

    // Funds need to be frozen once redemption phase begins.
    await Util.assertError(
      async () => await redeemableERC20.transfer(signers[1].address, 1),
      "FROZEN",
      "funds were not frozen in next phase"
    );

    assert(
      (await redeemableERC20.currentPhase()) === Phase.ONE,
      `wrong phase, expected ${
        Phase.ONE
      } got ${await redeemableERC20.currentPhase()}`
    );

    const aliceRedeemableERC20 = redeemableERC20.connect(alice);
    // owner is on the unfreezable list.
    await aliceRedeemableERC20.transfer(signers[0].address, 1);

    // but not to anyone else.
    await Util.assertError(
      async () => await redeemableERC20.transfer(signers[2].address, 1),
      "FROZEN",
      "funds were not frozen 2"
    );

    // pool exits and reserve tokens sent to redeemable ERC20 address
    const reserveTotal = ethers.BigNumber.from("1000" + Util.sixZeros);
    await reserve.transfer(redeemableERC20.address, reserveTotal);

    // redeem should work now
    // redeem does NOT need approval
    const redeemableSignerBalanceBefore = await redeemableERC20.balanceOf(
      signers[0].address
    );
    const redeemableContractTotalSupplyBefore =
      await redeemableERC20.totalSupply();
    const reserveSignerBalanceBefore = await reserve.balanceOf(
      signers[0].address
    );
    const reserveContractBalanceBefore = await reserve.balanceOf(
      redeemableERC20.address
    );

    // redemption should emit this
    const redeemAmount = ethers.BigNumber.from("50" + Util.eighteenZeros);
    const expectedReserveRedemption = ethers.BigNumber.from(
      "10" + Util.sixZeros
    );
    // signer redeems all tokens they have for fraction of each asset
    await expect(redeemableERC20.redeem([reserve.address], redeemAmount))
      .to.emit(redeemableERC20, "Redeem")
      .withArgs(signers[0].address, reserve.address, [
        redeemAmount,
        expectedReserveRedemption,
      ]);

    const redeemableSignerBalanceAfter = await redeemableERC20.balanceOf(
      signers[0].address
    );
    const redeemableContractTotalSupplyAfter =
      await redeemableERC20.totalSupply();
    const reserveSignerBalanceAfter = await reserve.balanceOf(
      signers[0].address
    );
    const reserveContractBalanceAfter = await reserve.balanceOf(
      redeemableERC20.address
    );

    // signer should have redeemed 50 redeemable tokens
    assert(
      redeemableSignerBalanceBefore
        .sub(redeemableSignerBalanceAfter)
        .eq(redeemAmount),
      "wrong number of redeemable tokens redeemed"
    );

    // signer should have gained 10 reserve tokens
    assert(
      reserveSignerBalanceAfter
        .sub(reserveSignerBalanceBefore)
        .eq(expectedReserveRedemption),
      `wrong number of reserve tokens released ${reserveSignerBalanceBefore} ${reserveSignerBalanceAfter}`
    );

    // total supply should have lost 50 redeemable tokens
    assert(
      redeemableContractTotalSupplyBefore
        .sub(redeemableContractTotalSupplyAfter)
        .eq(redeemAmount),
      `contract did not receive correct tokens ${redeemableContractTotalSupplyBefore} ${redeemableContractTotalSupplyAfter}`
    );

    // contract should have sent 10 reserve tokens
    assert(
      reserveContractBalanceBefore
        .sub(reserveContractBalanceAfter)
        .eq(expectedReserveRedemption),
      "contract did not send correct reserve tokens"
    );

    // signer cannot redeem more tokens than they have
    await Util.assertError(
      async () =>
        await redeemableERC20.redeem(
          [reserve.address],
          ethers.BigNumber.from("10000" + Util.eighteenZeros)
        ),
      "ERC20: burn amount exceeds balance",
      "failed to stop greedy redeem"
    );

    // check math for more redemptions
    {
      let i = 0;
      const expectedDiff = "10000000";
      while (i < 3) {
        const balanceBefore = await reserve.balanceOf(signers[0].address);
        await expect(redeemableERC20.redeem([reserve.address], redeemAmount))
          .to.emit(redeemableERC20, "Redeem")
          .withArgs(signers[0].address, reserve.address, [
            redeemAmount,
            expectedDiff,
          ]);
        const balanceAfter = await reserve.balanceOf(signers[0].address);
        const diff = balanceAfter.sub(balanceBefore);
        assert(
          diff.eq(expectedDiff),
          `wrong diff ${i} ${expectedDiff} ${diff} ${balanceBefore} ${balanceAfter}`
        );
        i++;
      }
    }

    {
      // Things dynamically recalculate if we dump more reserve back in the token contract
      await reserve.transfer(
        redeemableERC20.address,
        ethers.BigNumber.from("20" + Util.sixZeros)
      );

      let i = 0;
      const expectedDiff = "10208333";

      while (i < 3) {
        const balanceBefore = await reserve.balanceOf(signers[0].address);
        await expect(redeemableERC20.redeem([reserve.address], redeemAmount))
          .to.emit(redeemableERC20, "Redeem")
          .withArgs(signers[0].address, reserve.address, [
            redeemAmount,
            expectedDiff,
          ]);
        const balanceAfter = await reserve.balanceOf(signers[0].address);
        const diff = balanceAfter.sub(balanceBefore);
        assert(
          diff.eq(expectedDiff),
          `wrong diff ${i} ${expectedDiff} ${diff} ${balanceBefore} ${balanceAfter}`
        );
        i++;
      }
    }
  });

  it("should only allow sender with DISTRIBUTOR_BURNER role to call burnDistributor", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    assert(
      (await redeemableERC20.currentPhase()) === Phase.ZERO,
      "default phase was not zero"
    );

    const redeemableERC201 = new ethers.Contract(
      redeemableERC20.address,
      redeemableERC20.interface,
      signers[1]
    );

    await Util.assertError(
      async () => await redeemableERC201.burnDistributors([Util.oneAddress]),
      "ONLY_ADMIN",
      "was wrongly able to set phase block with insuffient role permissions"
    );

    await redeemableERC20.burnDistributors([Util.oneAddress]);
  });

  it("should set owner as unfreezable on construction", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;
    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    assert(
      await redeemableERC20.isReceiver(signers[0].address),
      "owner not set as receiver on token construction"
    );
  });

  it("should allow token transfers in constructor regardless of owner tier level", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;

    // Set owner to COPPER status, lower than minimum status of DIAMOND
    await tier.setTier(signers[0].address, Tier.COPPER, []);

    const minimumTier = Tier.DIAMOND;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    // admin is made receiver during construction, so required token transfers can go ahead
    assert(
      await redeemableERC20.isReceiver(signers[0].address),
      "admin not made receiver during construction"
    );

    await redeemableERC20.burnDistributors([Util.oneAddress]);

    await reserve.transfer(redeemableERC20.address, 1);
  });

  it("should allow transfer only if redeemer meets minimum tier level", async function () {
    this.timeout(0);

    const signers = await ethers.getSigners();

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;

    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    // grant second signer GOLD status so they can receive transferred tokens
    await tier.setTier(signers[1].address, Tier.GOLD, []);
    // grant third signer SILVER status which is NOT enough to receive transfers
    await tier.setTier(signers[2].address, Tier.SILVER, []);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: signers[0].address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    await redeemableERC20.deployed();

    const redeemableERC20_SILVER = new ethers.Contract(
      redeemableERC20.address,
      redeemableERC20.interface,
      signers[2]
    );
    await Util.assertError(
      async () => await redeemableERC20.transfer(signers[2].address, 1),
      "MIN_TIER",
      "user could receive transfers despite not meeting minimum status"
    );

    await redeemableERC20.transfer(signers[1].address, totalSupply);

    await redeemableERC20.burnDistributors([Util.oneAddress]);

    // pool exits and reserve tokens sent to redeemable ERC20 address
    const reserveTotal = ethers.BigNumber.from("1000" + Util.sixZeros);
    await reserve.transfer(redeemableERC20.address, reserveTotal);

    // GOLD signer can redeem.
    await redeemableERC20
      .connect(signers[1])
      .redeem(
        [reserve.address],
        await redeemableERC20.balanceOf(signers[1].address)
      );

    // There is no way the SILVER user can receive tokens so they also cannot redeem tokens.
    await Util.assertError(
      async () => await redeemableERC20_SILVER.redeem([reserve.address], 1),
      "ERC20: burn amount exceeds balance",
      "user could transfer despite not meeting minimum status"
    );
  });

  it("should return multiple treasury assets upon redeeming", async function () {
    this.timeout(0);

    const FIVE_TOKENS = ethers.BigNumber.from("5" + Util.eighteenZeros);
    const TEN_TOKENS = ethers.BigNumber.from("10" + Util.eighteenZeros);
    const TWENTY_TOKENS = ethers.BigNumber.from("20" + Util.eighteenZeros);

    const signers = await ethers.getSigners();

    const admin = signers[0];
    const signer1 = signers[1];
    const signer2 = signers[2];

    const reserve1 = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;
    const reserve2 = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    // Constructing the RedeemableERC20 sets the parameters but nothing stateful happens.

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;

    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    await tier.setTier(signer1.address, Tier.GOLD, []);
    await tier.setTier(signer2.address, Tier.GOLD, []);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: admin.address,
      reserve: reserve1.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    // There are no reserve tokens in the redeemer on construction
    assert(
      (await reserve1.balanceOf(redeemableERC20.address)).eq(0) &&
        (await reserve2.balanceOf(redeemableERC20.address)).eq(0),
      "reserve was not 0 on redeemable construction"
    );

    await redeemableERC20.transfer(signer1.address, TEN_TOKENS);
    await redeemableERC20.transfer(signer2.address, TWENTY_TOKENS);

    await redeemableERC20.burnDistributors([Util.oneAddress]);

    // at this point signer[1] should have 10 tokens
    assert(
      (await redeemableERC20.balanceOf(signer1.address)).eq(TEN_TOKENS),
      "signer[1] does not have a balance of 10 tokens"
    );
    // at this point signer[2] should have 20 tokens
    assert(
      (await redeemableERC20.balanceOf(signer2.address)).eq(TWENTY_TOKENS),
      "signer[2] does not have a balance of 20 tokens"
    );

    // pool exits and reserve tokens sent to redeemable ERC20 address
    const reserve1Total = ethers.BigNumber.from("1000" + Util.sixZeros);
    const reserve2Total = ethers.BigNumber.from("2000" + Util.sixZeros);

    // move all reserve tokens, to become redeemables
    await reserve1.transfer(redeemableERC20.address, reserve1Total);
    await reserve2.transfer(redeemableERC20.address, reserve2Total);

    // contract should hold correct redeemables
    assert(
      (await reserve1.balanceOf(redeemableERC20.address)).eq(reserve1Total),
      "contract does not hold correct amount of reserve 1 tokens"
    );
    assert(
      (await reserve2.balanceOf(redeemableERC20.address)).eq(reserve2Total),
      "contract does not hold correct amount of reserve 2 tokens"
    );

    // contract before
    const redeemableContractTotalSupplyBefore =
      await redeemableERC20.totalSupply();
    const reserve1ContractBalanceBefore = await reserve1.balanceOf(
      redeemableERC20.address
    );
    const reserve2ContractBalanceBefore = await reserve2.balanceOf(
      redeemableERC20.address
    );

    // Signer before
    const redeemableSignerBalanceBefore = await redeemableERC20.balanceOf(
      signer1.address
    );
    const reserve1SignerBalanceBefore = await reserve1.balanceOf(
      signer1.address
    );
    const reserve2SignerBalanceBefore = await reserve2.balanceOf(
      signer1.address
    );

    // redeem half of signer 1 holding
    const redeemAmount = FIVE_TOKENS;

    // expect every redeemable released in the same proportion.
    const expectedReserve1Redemption = redeemAmount
      .mul(ethers.BigNumber.from(reserve1ContractBalanceBefore))
      .div(ethers.BigNumber.from(redeemableContractTotalSupplyBefore));
    const expectedReserve2Redemption = redeemAmount
      .mul(ethers.BigNumber.from(reserve2ContractBalanceBefore))
      .div(ethers.BigNumber.from(redeemableContractTotalSupplyBefore));

    // signer redeems all tokens they have for fraction of each redeemable asset
    await expect(
      redeemableERC20
        .connect(signer1)
        .redeem([reserve1.address, reserve2.address], redeemAmount)
    )
      .to.emit(redeemableERC20, "Redeem")
      .withArgs(signer1.address, reserve1.address, [
        redeemAmount,
        expectedReserve1Redemption,
      ]);

    // contract after
    const redeemableContractTotalSupplyAfter =
      await redeemableERC20.totalSupply();
    const reserve1ContractBalanceAfter = await reserve1.balanceOf(
      redeemableERC20.address
    );
    const reserve2ContractBalanceAfter = await reserve2.balanceOf(
      redeemableERC20.address
    );

    // Signer after
    const redeemableSignerBalanceAfter = await redeemableERC20.balanceOf(
      signer1.address
    );
    const reserve1SignerBalanceAfter = await reserve1.balanceOf(
      signer1.address
    );
    const reserve2SignerBalanceAfter = await reserve2.balanceOf(
      signer1.address
    );

    // signer should have redeemed half of their redeemable tokens
    assert(
      redeemableSignerBalanceBefore
        .sub(redeemableSignerBalanceAfter)
        .eq(redeemAmount),
      "wrong number of redeemable tokens redeemed"
    );

    // signer should have gained fraction of reserve 1 tokens
    assert(
      reserve1SignerBalanceAfter
        .sub(reserve1SignerBalanceBefore)
        .eq(expectedReserve1Redemption),
      `wrong number of reserve 1 tokens released ${reserve1SignerBalanceBefore} ${reserve1SignerBalanceAfter}, expected ${expectedReserve1Redemption}`
    );

    // signer should have gained fraction of reserve 2 tokens
    assert(
      reserve2SignerBalanceAfter
        .sub(reserve2SignerBalanceBefore)
        .eq(expectedReserve2Redemption),
      `wrong number of reserve 2 tokens released ${reserve2SignerBalanceBefore} ${reserve2SignerBalanceAfter}, expected ${expectedReserve2Redemption}`
    );

    // total supply of contract tokens should be 5 less
    assert(
      redeemableContractTotalSupplyBefore
        .sub(redeemableContractTotalSupplyAfter)
        .eq(redeemAmount),
      `wrong amount of total token supply after ${redeemAmount} were redeemed ${redeemableContractTotalSupplyBefore} ${redeemableContractTotalSupplyAfter}`
    );

    // reserve 1 amount at contract address should reduce
    assert(
      reserve1ContractBalanceBefore
        .sub(reserve1ContractBalanceAfter)
        .eq(expectedReserve1Redemption),
      "wrong amount of reserve 1 at contract address"
    );

    // reserve 2 amount at contract address should reduce
    assert(
      reserve2ContractBalanceBefore
        .sub(reserve2ContractBalanceAfter)
        .eq(expectedReserve2Redemption),
      "wrong amount of reserve 2 at contract address"
    );
  });

  it("should allow specific redeeming of other redeemables when a redeemable transfer fails", async function () {
    this.timeout(0);

    const FIVE_TOKENS = ethers.BigNumber.from("5" + Util.eighteenZeros);
    const TEN_TOKENS = ethers.BigNumber.from("10" + Util.eighteenZeros);
    const TWENTY_TOKENS = ethers.BigNumber.from("20" + Util.eighteenZeros);

    const signers = await ethers.getSigners();

    const admin = signers[0];
    const signer1 = signers[1];
    const signer2 = signers[2];

    const reserve1 = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;
    const reserve2 = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;

    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    await tier.setTier(signer1.address, Tier.GOLD, []);
    await tier.setTier(signer2.address, Tier.GOLD, []);

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: admin.address,
      reserve: reserve1.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    await reserve2.transfer(
      redeemableERC20.address,
      await reserve2.totalSupply()
    );

    await reserve1.transfer(
      redeemableERC20.address,
      (await reserve1.totalSupply()).div(5)
    );

    // reserve 1 blacklists signer 1. Signer 1 cannot receive reserve 1 upon redeeming contract tokens
    reserve1.addFreezable(signer1.address);

    await redeemableERC20.transfer(signer1.address, TEN_TOKENS);
    await redeemableERC20.transfer(signer2.address, TWENTY_TOKENS);

    await redeemableERC20.burnDistributors([Util.oneAddress]);

    const redeemableSignerBalanceBefore = await redeemableERC20.balanceOf(
      signer1.address
    );

    const redeemAmount = FIVE_TOKENS;

    // should succeed, despite emitting redeem fail event for one redeemable
    await Util.assertError(
      async () =>
        await redeemableERC20
          .connect(signer1)
          .redeem([reserve1.address, reserve2.address], redeemAmount),
      `FROZEN`,
      `failed to error when reserve is frozen`
    );

    await redeemableERC20
      .connect(signer1)
      .redeem([reserve2.address], redeemAmount);

    const redeemableSignerBalanceAfter = await redeemableERC20.balanceOf(
      signer1.address
    );

    assert(
      redeemableSignerBalanceBefore
        .sub(redeemableSignerBalanceAfter)
        .eq(redeemAmount),
      "wrong number of redeemable tokens redeemed"
    );

    assert(
      (await reserve1.balanceOf(signer1.address)).eq(0),
      "reserve 1 transferred tokens to signer 1 upon redemption, despite being blacklisted"
    );

    const reserve2Balance = await reserve2.balanceOf(signer1.address);
    assert(
      !reserve2Balance.eq(0),
      `reserve 2 didn't transfer tokens to signer 1 upon redemption. Reserve 2: ${reserve2.address}, Signer: ${signer1.address}, Balance: ${reserve2Balance}`
    );
  });

  it("should prevent sending redeemable tokens to zero address", async function () {
    this.timeout(0);

    const TEN_TOKENS = ethers.BigNumber.from("10" + Util.eighteenZeros);

    const signers = await ethers.getSigners();

    const admin = signers[0];
    const signer1 = signers[1];

    const tierFactory = await ethers.getContractFactory("ReadWriteTier");
    const tier = (await tierFactory.deploy()) as ReadWriteTier & Contract;

    const minimumTier = Tier.GOLD;

    const erc20Config = { name: "RedeemableERC20", symbol: "RDX" };
    const totalSupply = ethers.BigNumber.from("5000" + Util.eighteenZeros);

    await tier.setTier(signer1.address, Tier.GOLD, []);

    const reserve = (await Util.basicDeploy(
      "ReserveToken",
      {}
    )) as ReserveToken & Contract;

    const redeemableERC20 = await Util.redeemableERC20Deploy(signers[0], {
      admin: admin.address,
      reserve: reserve.address,
      erc20Config,
      tier: tier.address,
      minimumTier: minimumTier,
      totalSupply: totalSupply,
    });

    await Util.assertError(
      async () =>
        await redeemableERC20.transfer(
          ethers.constants.AddressZero,
          TEN_TOKENS
        ),
      "ERC20: transfer to the zero address",
      "owner sending redeemable tokens to zero address did not error"
    );

    await redeemableERC20.transfer(signer1.address, TEN_TOKENS);

    await Util.assertError(
      async () =>
        await redeemableERC20
          .connect(signer1)
          .transfer(ethers.constants.AddressZero, TEN_TOKENS),
      "ERC20: transfer to the zero address",
      "signer 1 sending redeemable tokens to zero address did not error"
    );
  });
});
