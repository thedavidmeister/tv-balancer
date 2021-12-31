// SPDX-License-Identifier: CAL
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./TierReport.sol";
import "../../math/SaturatingMath.sol";

library TierwiseCombine {
    using Math for uint256;
    using SaturatingMath for uint256;

    /// Every lte check in `selectLte` must pass.
    uint constant public LOGIC_EVERY = 0;
    /// Only one lte check in `selectLte` must pass.
    uint constant public LOGIC_ANY = 1;

    /// Select the minimum block number from passing blocks in `selectLte`.
    uint constant public MODE_MIN = 0;
    /// Select the maximum block number from passing blocks in `selectLte`.
    uint constant public MODE_MAX = 1;
    /// Select the first block number that passes in `selectLte`.
    uint constant public MODE_FIRST = 2;

    /// Performs a tierwise saturating subtraction of two reports.
    /// Intepret as "# of blocks older report was held before newer report".
    /// If older report is in fact newer then `0` will be returned.
    /// i.e. the diff cannot be negative, older report as simply spent 0 blocks
    /// existing before newer report, if it is in truth the newer report.
    function saturatingSub(
        uint olderReport_,
        uint newerReport_
    ) internal pure returns (uint) {
        unchecked {
            uint ret_;
            for (uint tier_ = 1; tier_ <= 8; tier_++) {
                uint olderBlock_ = TierReport.tierBlock(
                    olderReport_,
                    tier_
                );
                uint newerBlock_ = TierReport.tierBlock(
                    newerReport_,
                    tier_
                );
                uint diff_ = newerBlock_.saturatingSub(olderBlock_);
                ret_ = TierReport
                    .updateBlockAtTier(
                        ret_,
                        tier_ - 1,
                        diff_
                    );
            }
            return ret_;
        }
    }

    /// Given a list of reports, selects the best tier in a tierwise fashion.
    /// The "best" criteria can be configured by `logic_` and `mode_`.
    /// Logic can be "every" or "any", which means that the reports for a given
    /// tier must either all or any be less than or equal to the reference
    /// `blockNumber_`.
    /// Mode can be "min", "max", "first" which selects between all the block
    /// numbers for a given tier that meet the lte criteria.
    /// @param reports_ The list of reports to select over.
    /// @param blockNumber_ The block number that tier blocks must be lte.
    /// @param logic_ `LOGIC_EVERY` or `LOGIC_ANY`.
    /// @param mode_ `MODE_MIN`, `MODE_MAX` or `MODE_FIRST`.
    function selectLte(
        uint[] memory reports_,
        uint blockNumber_,
        uint logic_,
        uint mode_
    ) internal pure returns (uint) {
        unchecked {
            uint ret_;
            uint block_;
            bool anyLte_;
            uint length_ = reports_.length;
            for (uint tier_ = 1; tier_ <= 8; tier_++) {
                uint accumulator_;
                // Nothing lte the reference block for this tier yet.
                anyLte_ = false;

                // Initialize the accumulator for this tier.
                if (mode_ == MODE_MIN) {
                    accumulator_ = TierReport.NEVER;
                }
                else {
                    accumulator_ = 0;
                }

                // Filter all the blocks at the current tier from all the
                // reports against the reference tier and each other.
                for (uint i_ = 0; i_ < length_; i_++) {
                    block_ = TierReport.tierBlock(reports_[i_], tier_);

                    if (block_ <= blockNumber_) {
                        // Min and max need to compare current value against
                        // the accumulator.
                        if (mode_ == MODE_MIN) {
                            accumulator_ = block_.min(accumulator_);
                        }
                        else if (mode_ == MODE_MAX) {
                            accumulator_ = block_.max(accumulator_);
                        }
                        else if (mode_ == MODE_FIRST && !anyLte_) {
                            accumulator_ = block_;
                        }
                        anyLte_ = true;
                    }
                    else if (logic_ == LOGIC_EVERY) {
                        // Can short circuit for an "every" check.
                        accumulator_ = TierReport.NEVER;
                        break;
                    }
                }
                if (!anyLte_) {
                    accumulator_ = TierReport.NEVER;
                }
                ret_ = TierReport.updateBlockAtTier(
                    ret_,
                    tier_ - 1,
                    accumulator_
                );
            }
            return ret_;
        }
    }
}