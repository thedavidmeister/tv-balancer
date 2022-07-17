// SPDX-License-Identifier: CAL
pragma solidity ^0.8.15;

import "hardhat/console.sol";

enum DebugStyle {
    StateAbi,
    StatePacked,
    Stack,
    StackIndex
}

/// Everything required to evaluate and track the state of a rain script.
/// As this is a struct it will be in memory when passed to `RainVM` and so
/// will be modified by reference internally. This is important for gas
/// efficiency; the stack, arguments and stackIndex will likely be mutated by
/// the running script.
/// @param stackIndex Opcodes write to the stack at the stack index and can
/// consume from the stack by decrementing the index and reading between the
/// old and new stack index.
/// IMPORANT: The stack is never zeroed out so the index must be used to
/// find the "top" of the stack as the result of an `eval`.
/// @param stack Stack is the general purpose runtime state that opcodes can
/// read from and write to according to their functionality.
/// @param sources Sources available to be executed by `eval`.
/// Notably `ZIPMAP` can also select a source to execute by index.
/// @param constants Constants that can be copied to the stack by index by
/// `VAL`.
/// @param arguments `ZIPMAP` populates arguments which can be copied to the
/// stack by `VAL`.
struct VMState {
    uint256 stackIndex;
    uint256[] stack;
    bytes[] ptrSources;
    uint256[] constants;
    /// `ZIPMAP` populates arguments into constants which can be copied to the
    /// stack by `VAL` as usual, starting from this index. This copying is
    /// destructive so it is recommended to leave space in the constants array.
    uint256 argumentsIndex;
}

library LibVMState {
    using LibVMState for VMState;

    /// Put the state back to a freshly eval-able value. The same state can be
    /// run more than once (e.g. two different entrypoints) to yield different
    /// stacks, as long as all the sources are VALID and reset is called
    /// between each eval call.
    /// Generally this should be called whenever eval is run over a state that
    /// is exposed to the calling context (e.g. it is an argument) so that the
    /// caller may safely eval multiple times on any state it has in scope.
    function reset(VMState memory state_) internal pure {
        state_.stackIndex = 0;
    }

    function toBytesDebug(VMState memory state_)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encode(state_);
    }

    function debug(VMState memory state_, DebugStyle debugStyle_)
        internal
        view
    {
        bytes memory debug_;
        if (debugStyle_ == DebugStyle.StateAbi) {
            debug_ = abi.encode(state_);
        } else if (debugStyle_ == DebugStyle.StatePacked) {
            debug_ = state_.toBytesPacked();
        } else if (debugStyle_ == DebugStyle.Stack) {
            debug_ = abi.encodePacked(state_.stack);
        } else if (debugStyle_ == DebugStyle.StackIndex) {
            debug_ = abi.encodePacked(state_.stackIndex);
        }
        if (debug_.length > 0) {
            console.logBytes(debug_);
        }
    }

    function fromBytesPacked(bytes memory stateBytes_)
        internal
        pure
        returns (VMState memory)
    {
        unchecked {
            VMState memory state_;
            uint256 indexes_;
            assembly ("memory-safe") {
                // Load indexes from state bytes.
                indexes_ := mload(add(stateBytes_, 0x20))
                // mask out everything but the constants length from state
                // bytes.
                mstore(add(stateBytes_, 0x20), and(indexes_, 0xFF))
                // point state constants at state bytes
                mstore(add(state_, 0x60), add(stateBytes_, 0x20))
            }
            // Stack index 0 is implied.
            state_.stack = new uint256[]((indexes_ >> 8) & 0xFF);
            state_.argumentsIndex = (indexes_ >> 16) & 0xFF;
            uint256 sourcesLen_ = (indexes_ >> 24) & 0xFF;
            bytes[] memory ptrSources_;
            uint256[] memory ptrSourcesPtrs_ = new uint256[](sourcesLen_);

            assembly {
                let sourcesStart_ := add(
                    stateBytes_,
                    add(
                        // 0x40 for constants and state array length
                        0x40,
                        // skip over length of constants
                        mul(0x20, mload(add(stateBytes_, 0x20)))
                    )
                )
                let cursor_ := sourcesStart_

                for {
                    let i_ := 0
                } lt(i_, sourcesLen_) {
                    i_ := add(i_, 1)
                } {
                    // sources_ is a dynamic array so it is a list of
                    // pointers that can be set literally to the cursor_
                    mstore(
                        add(ptrSourcesPtrs_, add(0x20, mul(i_, 0x20))),
                        cursor_
                    )
                    // move the cursor by the length of the source in bytes
                    cursor_ := add(cursor_, add(0x20, mload(cursor_)))
                }
                // point state at sources_ rather than clone in memory
                ptrSources_ := ptrSourcesPtrs_
                mstore(add(state_, 0x40), ptrSources_)
            }
            return state_;
        }
    }

    function toBytesPacked(VMState memory state_)
        internal
        pure
        returns (bytes memory)
    {
        unchecked {
            // indexes + constants
            uint256[] memory constants_ = state_.constants;
            // constants is first so we can literally use it on the other end
            uint256 indexes_ = state_.constants.length |
                (state_.stack.length << 8) |
                (state_.argumentsIndex << 16) |
                (state_.ptrSources.length << 24);
            bytes memory ret_ = bytes.concat(
                bytes32(indexes_),
                abi.encodePacked(constants_)
            );
            for (uint256 i_ = 0; i_ < state_.ptrSources.length; i_++) {
                ret_ = bytes.concat(
                    ret_,
                    bytes32(state_.ptrSources[i_].length),
                    state_.ptrSources[i_]
                );
            }
            return ret_;
        }
    }
}
