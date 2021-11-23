/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import { Contract, ContractFactory, Overrides } from "@ethersproject/contracts";

import type { RightsManager } from "../RightsManager";

export class RightsManager__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(overrides?: Overrides): Promise<RightsManager> {
    return super.deploy(overrides || {}) as Promise<RightsManager>;
  }
  getDeployTransaction(overrides?: Overrides): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): RightsManager {
    return super.attach(address) as RightsManager;
  }
  connect(signer: Signer): RightsManager__factory {
    return super.connect(signer) as RightsManager__factory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): RightsManager {
    return new Contract(address, _abi, signerOrProvider) as RightsManager;
  }
}

const _abi = [
  {
    inputs: [],
    name: "DEFAULT_CAN_ADD_REMOVE_TOKENS",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_CAN_CHANGE_CAP",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_CAN_CHANGE_SWAP_FEE",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_CAN_CHANGE_WEIGHTS",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_CAN_PAUSE_SWAPPING",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEFAULT_CAN_WHITELIST_LPS",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool[]",
        name: "a",
        type: "bool[]",
      },
    ],
    name: "constructRights",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "canPauseSwapping",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeSwapFee",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeWeights",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canAddRemoveTokens",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canWhitelistLPs",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeCap",
            type: "bool",
          },
        ],
        internalType: "struct RightsManager.Rights",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "canPauseSwapping",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeSwapFee",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeWeights",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canAddRemoveTokens",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canWhitelistLPs",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeCap",
            type: "bool",
          },
        ],
        internalType: "struct RightsManager.Rights",
        name: "rights",
        type: "tuple",
      },
    ],
    name: "convertRights",
    outputs: [
      {
        internalType: "bool[]",
        name: "",
        type: "bool[]",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "canPauseSwapping",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeSwapFee",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeWeights",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canAddRemoveTokens",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canWhitelistLPs",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "canChangeCap",
            type: "bool",
          },
        ],
        internalType: "struct RightsManager.Rights",
        name: "self",
        type: "tuple",
      },
      {
        internalType: "enum RightsManager.Permissions",
        name: "permission",
        type: "RightsManager.Permissions",
      },
    ],
    name: "hasPermission",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
];

const _bytecode =
  "0x6106a6610026600b82828239805160001a60731461001957fe5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600436106100ad5760003560e01c80634583544a11610080578063c08473fc11610065578063c08473fc1461010b578063cb0d28f6146100d0578063dccf54e7146100b2576100ad565b80634583544a146100d8578063710a51c2146100eb576100ad565b806308395a34146100b257806321bb04ae146100d05780632cc0c346146100b25780633d027b9d146100b2575b600080fd5b6100ba61012b565b6040516100c79190610615565b60405180910390f35b6100ba610130565b6100ba6100e6366004610595565b610135565b6100fe6100f936600461057a565b610215565b6040516100c791906105cf565b61011e6101193660046104e4565b61034b565b6040516100c79190610620565b600081565b600181565b600081600581111561014357fe5b61015b576101546020840184610553565b905061020f565b81600581111561016757fe5b6001141561017f576101546040840160208501610553565b81600581111561018b57fe5b600214156101a3576101546060840160408501610553565b8160058111156101af57fe5b600314156101c7576101546080840160608501610553565b8160058111156101d357fe5b600414156101eb5761015460a0840160808501610553565b8160058111156101f757fe5b6005141561020f5761015460c0840160a08501610553565b92915050565b60408051600680825260e082019092526060918291906020820160c0803683370190505090506102486020840184610553565b8160008151811061025557fe5b9115156020928302919091018201526102749060408501908501610553565b8160018151811061028157fe5b911515602092830291909101909101526102a16060840160408501610553565b816002815181106102ae57fe5b911515602092830291909101909101526102ce6080840160608501610553565b816003815181106102db57fe5b911515602092830291909101909101526102fb60a0840160808501610553565b8160048151811061030857fe5b9115156020928302919091019091015261032860c0840160a08501610553565b8160058151811061033557fe5b9115156020928302919091019091015292915050565b610353610498565b8161039357506040805160c081018252600080825260016020830181905292820192909252606081018290526080810182905260a081019190915261020f565b6040518060c00160405280848460008181106103ab57fe5b90506020020160208101906103c09190610553565b15158152602001848460018181106103d457fe5b90506020020160208101906103e99190610553565b15158152602001848460028181106103fd57fe5b90506020020160208101906104129190610553565b151581526020018484600381811061042657fe5b905060200201602081019061043b9190610553565b151581526020018484600481811061044f57fe5b90506020020160208101906104649190610553565b151581526020018484600581811061047857fe5b905060200201602081019061048d9190610553565b15159052905061020f565b6040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a081019190915290565b600060c082840312156104de578081fd5b50919050565b600080602083850312156104f6578182fd5b823567ffffffffffffffff8082111561050d578384fd5b818501915085601f830112610520578384fd5b81358181111561052e578485fd5b8660208083028501011115610541578485fd5b60209290920196919550909350505050565b600060208284031215610564578081fd5b81358015158114610573578182fd5b9392505050565b600060c0828403121561058b578081fd5b61057383836104cd565b60008060e083850312156105a7578182fd5b6105b184846104cd565b915060c0830135600681106105c4578182fd5b809150509250929050565b6020808252825182820181905260009190848201906040850190845b818110156106095783511515835292840192918401916001016105eb565b50909695505050505050565b901515815260200190565b600060c08201905082511515825260208301511515602083015260408301511515604083015260608301511515606083015260808301511515608083015260a0830151151560a08301529291505056fea26469706673582212209f3f94e8a4314944bb521850551e9e94a0a24221bad7a2262f199d8749f57b2564736f6c634300060c0033";
