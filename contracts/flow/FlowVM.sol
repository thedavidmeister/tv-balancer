// SPDX-License-Identifier: CAL
pragma solidity =0.8.17;

import "../vm/runtime/StandardVM.sol";
import "./libraries/LibFlow.sol";
import "./FlowIntegrity.sol";
import "../idempotent/LibIdempotentFlag.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC721HolderUpgradeable as ERC721Holder } from "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import {ERC1155HolderUpgradeable as ERC1155Holder} from "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

SourceIndex constant CAN_FLOW_ENDPOINT = SourceIndex.wrap(0);
SourceIndex constant FLOW_ENDPOINT = SourceIndex.wrap(1);

contract FlowVM is ERC721Holder, ERC1155Holder, StandardVM {
    using LibIdempotentFlag for IdempotentFlag;
    using LibVMState for VMState;
    using LibStackTop for StackTop;

    /// flow index => id => time
    mapping(uint => mapping(uint256 => uint256)) private _flows;

    constructor(address vmIntegrity_) StandardVM(vmIntegrity_) {}

    /// @param flows_ source and token config. Also controls delegated claims.
    // solhint-disable-next-line func-name-mixedcase
    function __FlowVM_init(StateConfig[] calldata flows_, uint256[] memory flowsFinalMinStacks_)
        internal
        onlyInitializing
    {
        __ERC721Holder_init();
        __ERC1155Holder_init();
        for (uint i_ = 0; i_ < flows_.length; i_++) {
            uint id_ = uint(keccak256(abi.encode(flows_[i_])));
            _saveVMState(id_, flows_[i_], flowsFinalMinStacks_);
        }
    }

    function flowStack(
        VMState memory state_,
        uint256 id_
    ) internal view returns (StackTop) {
        state_.context = LibUint256Array.arrayFrom(
            id_
        );
        require(state_.eval(CAN_FLOW_ENDPOINT).peek() > 0, "CANT_FLOW");
        return state_.eval(FLOW_ENDPOINT);
    }

    function registerFlowTime(
        IdempotentFlag flag_,
        uint flow_,
        uint256 id_
    ) internal {
        if (flag_.get(FLAG_INDEX_FLOW_TIME)) {
            _flows[flow_][id_] = block.timestamp;
        }
    }

    function _flowTime(uint256 flow_, uint256 id_)
        internal
        view
        returns (uint256 flowTime_)
    {
        return _flows[flow_][id_];
    }

    function opFlowTime(
        VMState memory,
        Operand,
        StackTop stackTop_
    ) internal view returns (StackTop) {
        return stackTop_.applyFn(_flowTime);
    }

    function localEvalFunctionPointers()
        internal
        pure
        override
        returns (
            function(VMState memory, Operand, StackTop)
                view
                returns (StackTop)[]
                memory localFnPtrs_
        )
    {
        localFnPtrs_ = new function(VMState memory, Operand, StackTop)
            view
            returns (StackTop)[](LOCAL_OPS_LENGTH);
        localFnPtrs_[0] = opFlowTime;
    }

    receive() external payable virtual {}
}
