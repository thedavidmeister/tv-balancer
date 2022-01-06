// SPDX-License-Identifier: CAL
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./ReadOnlyTier.sol";
import "../verify/libraries/VerifyConstants.sol";
import {State, Verify} from "../verify/Verify.sol";
import "./libraries/TierReport.sol";

/// @title VerifyTier
///
/// @dev A contract that is `VerifyTier` expects to derive tiers from the time
/// the account was approved by the underlying `Verify` contract. The approval
/// block numbers defer to `State.since` returned from `Verify.state`.
contract VerifyTier is ReadOnlyTier, Initializable {
    /// The contract to check to produce reports.
    Verify public verify;

    /// Sets the `verify` contract.
    /// @param verify_ The contract to check to produce reports.
    function initialize(Verify verify_) external initializer {
        verify = verify_;
    }

    /// Every tier will be the `State.since` block if `account_` is approved
    /// otherwise every tier will be uninitialized.
    /// @inheritdoc ITier
    function report(address account_) public view override returns (uint256) {
        State memory state_ = verify.state(account_);
        if (
            // This is comparing an enum variant so it must be equal.
            // slither-disable-next-line incorrect-equality
            verify.statusAtBlock(state_, block.number) ==
            VerifyConstants.STATUS_APPROVED
        ) {
            return
                TierReport.updateBlocksForTierRange(
                    TierReport.NEVER,
                    0,
                    8,
                    state_.approvedSince
                );
        } else {
            return TierReport.NEVER;
        }
    }
}
