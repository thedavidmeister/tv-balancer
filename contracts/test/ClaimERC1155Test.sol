// SPDX-License-Identifier: CAL
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "../tier/ERC20BalanceTier.sol";
import {TierByConstructionClaim} from "../claim/TierByConstructionClaim.sol";
import {ITier} from "../tier/ITier.sol";

/// @title ClaimERC1155Test
/// Contract that implements claiming an erc1155 contingent on tiers for
/// testing and demonstration purposes.
/// The contract is `ERC20BalanceTier`, `TierByConstructionClaim` and `ERC1155`
/// from open zeppelin:
/// - The balance tier compares the current holdings of an erc20 against preset
///   values.
/// - The tier by construction ensures the claim is restricted to anyone
///   tier 3 and above.
/// - The tier by construction also exposes `isTier` to provide further goodies
///   to tier 5 and above.
/// - The erc1155 enables and tracks minted NFTs.
contract ClaimERC1155Test is
    ERC20BalanceTier,
    TierByConstructionClaim,
    ERC1155
{
    uint256 public constant ART = 0;
    uint256 public constant GOOD_ART = 1;

    constructor(IERC20 redeemableToken_, uint256[8] memory tierValues_)
        ERC1155("https://example.com/{id}.json")
        TierByConstructionClaim(this, 3)
    {
        initializeValueTier(tierValues_);
        erc20 = redeemableToken_;
    }

    function _afterClaim(
        address account_,
        uint256,
        bytes memory
    ) internal override {
        // Anyone above tier 5 gets more art and some good art.
        bool isFive_ = isTier(account_, 5);

        uint256[] memory ids_ = new uint256[](2);
        uint256[] memory amounts_ = new uint256[](2);

        ids_[0] = (ART);
        ids_[1] = (GOOD_ART);

        amounts_[0] = isFive_ ? 2 : 1;
        amounts_[1] = isFive_ ? 1 : 0;

        // `_mintBatch` to avoid Reentrancy interleaved with state change from
        // multiple `_mint` calls.
        // The reentrancy comes from the erc1155 receiver.
        _mintBatch(account_, ids_, amounts_, "");
    }
}
