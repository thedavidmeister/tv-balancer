// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

// Needed to handle structures externally
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol" as ERC20;
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/SafeERC20.sol';

import "hardhat/console.sol";

import { CRPFactory } from './configurable-rights-pool/contracts/CRPFactory.sol';
import { BFactory } from './configurable-rights-pool/contracts/test/BFactory.sol';

import { Constants } from './libraries/Constants.sol';
import { Initable } from './libraries/Initable.sol';
import { RedeemableERC20 } from './RedeemableERC20.sol';
import { RedeemableERC20Pool } from './RedeemableERC20Pool.sol';

// Examples
// 2 book ratio: 20:1 95%
// | P: 50 000 | T: 100 000 |
// | V: 1 000 000 | T: 100 000 |
//
// Pool:
// - works in terms of weights and derives values based on amounts relative to the weights
// - if we have T tokens in circulation and we put P$ in the pool and say it is 1:20 ratio
//   this => T tokens = 20x P$ from the pool's perspective
//   => $50 000 in the pool at 20x weighting => $ 1 000 000 valuation for the tokens
//
// Redemption:
// - pure book value
// - a specific block in the future at which point T tokens = R$ pro rata
// - completely linear and fixed
// - if we put R$ in at the start which is $ 100 000 this values all tokens T at $ 100 000
//
// So if the ratio of ( $P x weight ) of $P to $R is > 1 then we're adding speculative value
//
// So when we _create_ the trust _we_ put in ( $P + $R ) and we define weights + book ratio
//
// example 2:
//
// $ 150 000 total ( $P + $R )
//
// T = 100 000
//
// expected max valuation = $3 per token = $300 000
// book value ( $R ) = $ 100 000
// pool $P = $ 50 000
// 100 000 T : $P => $300 000
// 50 000 : 300 000 = weight of $P
// therefore the weight should be 6 for $P at the start
// T which is the mint ratio = 1 because we minted 100 000 T for 100 000 $R
//
// Start:
// Pool: 100 000 T : $ 50 000 - weight of 6:1 T - which is spot price $3 per T
// Book: 0 T: $100 000 - therefore 1 T = $1 after unlock
//
// End at a preset block:
// Pool: 20 000 T : $ 200 000 - weight 1:10 T - PT in the trust
// Exit => PT is all given to the initializer/owner of the trust
// $200 000 + 20 000 T which can be immediately redeemed for $1 each => after redemption lump sum $220 000
//
// | TV hype to create premium  | TV cashes out premium and delivers goodies |
// | Phase trading distribution | Phase goodies + stablecoin proxy           |
contract Trust is Ownable, Initable {

    using SafeMath for uint256;

    CRPFactory crp_factory;
    BFactory balancer_factory;
    uint256 public reserve_init;
    uint256 public mint_init;
    uint256 public initial_pool_valuation;
    uint256 public redeem_init;
    uint256 public min_raise;

    using SafeERC20 for IERC20;
    IERC20 public reserve;
    RedeemableERC20 public token;
    RedeemableERC20Pool public pool;


    constructor (
        CRPFactory _crp_factory,
        BFactory _balancer_factory,
        IERC20 _reserve,
        // Amount of reserve token to initialize the pool.
        // The starting/final weights are calculated against this.
        // This amount will be refunded to the Trust owner after the distribution.
        uint256 _reserve_init,
        // Number of redeemable tokens to mint.
        uint256 _mint_init,
        // initial marketcap of the token according to the balancer pool denominated in reserve token
        uint256 _initial_pool_valuation,
        // the amount of reserve to back the redemption initially after trading finishes.
        uint256 _redeem_init,
        // minimum amount to raise from the distribution period.
        // this is only relevant to the exit function, determines whether the raise is sent to the owner or rolled to token holders.
        uint256 _min_raise
    ) public {
        crp_factory = _crp_factory;
        balancer_factory = _balancer_factory;
        reserve = _reserve;
        reserve_init = _reserve_init;
        mint_init = _mint_init;
        initial_pool_valuation = _initial_pool_valuation;
        redeem_init = _redeem_init;
        min_raise = _min_raise;
    }


    function init(string memory _name, string memory _symbol, uint256 _unblock_block) public onlyOwner withInit {
        token = new RedeemableERC20(
            _name,
            _symbol,
            reserve,
            mint_init,
            _unblock_block
        );

        token.reserve().safeTransferFrom(
            owner(),
            address(this),
            reserve_init
        );
        console.log(
            "Trust: init token: reserve balance: %s",
            token.reserve().balanceOf(address(this))
        );

        reserve.approve(address(token), reserve_init);

        pool = new RedeemableERC20Pool(
            crp_factory,
            balancer_factory,
            token,
            reserve_init,
            redeem_init,
            initial_pool_valuation,
            min_raise.add(redeem_init)
        );
        console.log(
            "Trust: init pool: reserve balance: %s",
            token.reserve().balanceOf(address(this))
        );
        token.approve(address(pool), token.totalSupply());
        // @todo dust is possible here, e.g. if the book ratio is 2 we divide by 3.
        // Either the init will fail and revert.
        // Or there will be a rounding error in the reserve trapped in the trust.
        // Recommend testing a dry run on local for desired parameters to avoid failed init on prod.
        token.reserve().approve(address(pool), pool.pool_amounts(0));
        pool.init();

        // Need to make a few addresses unfreezable to facilitate exits.
        token.addUnfreezable(address(pool.crp()));
        token.addUnfreezable(address(balancer_factory));
        token.addUnfreezable(address(pool));
    }


    // This function can be called by anyone!
    // It defers to the pool exit function (which is owned by the trust and has block blocking).
    // If the minimum raise is reached then the trust owner receives the raise.
    // If the minimum raise is NOT reached then the reserve is refunded to the owner and sale proceeds rolled to token holders.
    function exit() public onlyInit {
        pool.exit();

        uint256 _final_balance = token.reserve().balanceOf(address(this));
        uint256 _profit = _final_balance.sub(reserve_init);
        // Min profit is the raise plus the redemption backing.
        uint256 _min_profit = min_raise.add(redeem_init);

        // Back the redemption if we reached the minimum.
        if (_min_profit <= _profit) {
            reserve.safeTransfer(address(token), redeem_init);
        }
        // Process a pro-rata refund if we did not.
        else {
            reserve.safeTransfer(address(token), _profit);
        }

        // Send everything else to the trust owner.
        token.reserve().safeTransfer(
            owner(),
            token.reserve().balanceOf(address(this))
        );

        require(token.reserve().balanceOf(address(this)) == 0, "ERR_EXIT_CLEAN");
    }
}