// SPDX-License-Identifier: CAL
pragma solidity ^0.8.15;

import "../../LibStackTop.sol";
import "../../LibVMState.sol";
import "../../LibIntegrityState.sol";

/// @title OpThisAddress
/// @notice Opcode for getting the address of the current contract.
library OpThisAddress {
    using LibStackTop for StackTop;
    using LibIntegrityState for IntegrityState;

    function integrity(
        IntegrityState memory integrityState_,
        uint256,
        StackTop stackTop_
    ) internal pure returns (StackTop) {
        return integrityState_.push(stackTop_);
    }

    function thisAddress(
        VMState memory,
        uint256,
        StackTop stackTop_
    ) internal view returns (StackTop) {
        return stackTop_.push(uint256(uint160(address(this))));
    }
}
