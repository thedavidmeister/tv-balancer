import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert } from "chai";
import { concat } from "ethers/lib/utils";
import { ethers } from "hardhat";
import type {
  IInterpreterV1Consumer,
  Rainterpreter,
  ReserveToken,
} from "../../../../typechain";
import { assertError, randomUint256 } from "../../../../utils";
import { basicDeploy } from "../../../../utils/deploy/basicDeploy";
import { rainterpreterDeploy } from "../../../../utils/deploy/interpreter/shared/rainterpreter/deploy";
import deploy1820 from "../../../../utils/deploy/registry1820/deploy";
import { expressionConsumerDeploy } from "../../../../utils/deploy/test/iinterpreterV1Consumer/deploy";
import { memoryOperand, MemoryType, op, standardEvaluableConfig } from "../../../../utils/interpreter/interpreter";
import { AllStandardOps } from "../../../../utils/interpreter/ops/allStandardOps";

let signers: SignerWithAddress[];
let signer1: SignerWithAddress;

let tokenERC20: ReserveToken;
const Opcode = AllStandardOps;

describe("RainInterpreter ERC20 ops", async function () {
  let rainInterpreter: Rainterpreter;
  let logic: IInterpreterV1Consumer;

  before(async () => {
    // Deploy ERC1820Registry
    const signers = await ethers.getSigners();
    await deploy1820(signers[0]);

    rainInterpreter = await rainterpreterDeploy();

    const consumerFactory = await ethers.getContractFactory(
      "IInterpreterV1Consumer"
    );
    logic = (await consumerFactory.deploy()) as IInterpreterV1Consumer;
    await logic.deployed();
  });

  beforeEach(async () => {
    signers = await ethers.getSigners();
    [, signer1] = signers;

    tokenERC20 = (await basicDeploy("ReserveToken", {})) as ReserveToken;
    await tokenERC20.initialize();
  }); 

  const  randomUintLen = (len:number): string => {
    return ethers.utils.hexZeroPad(ethers.utils.randomBytes(len), len);
  }

  it("should return ERC20 total supply", async () => {
    const { sources, constants } = await standardEvaluableConfig(
      `_: erc-20-total-supply(${tokenERC20.address});`
    );

    const expression0 = await expressionConsumerDeploy(
      sources,
      constants,
      rainInterpreter,
      1
    );

    await logic["eval(address,uint256,uint256[][])"](
      rainInterpreter.address,
      expression0.dispatch,
      []
    );
    const result0 = await logic.stackTop();
    const totalTokenSupply = await tokenERC20.totalSupply();
    assert(
      result0.eq(totalTokenSupply),
      `expected ${totalTokenSupply}, got ${result0}`
    );
  }); 

  it("should return ERC20 balance", async () => { 

    const { sources, constants } = await standardEvaluableConfig(
      `_: erc-20-balance-of(${randomUintLen(20)} ${signer1.address});`
    );

    const expression0 = await expressionConsumerDeploy(
      sources,
      constants,
      rainInterpreter,
      1
    );
    await logic["eval(address,uint256,uint256[][])"](
      rainInterpreter.address,
      expression0.dispatch,
      []
    );
    const result0 = await logic.stackTop();
    assert(result0.isZero(), `expected 0, got ${result0}`);

    await tokenERC20.transfer(signer1.address, 100);

    await logic["eval(address,uint256,uint256[][])"](
      rainInterpreter.address,
      expression0.dispatch,
      []
    );
    const result1 = await logic.stackTop();
    assert(result1.eq(100), `expected 100, got ${result1}`);
  });   
  
  it.only("should validate meta for ERC20 balance" , async () => { 

      for(let i = 0 ; i < 10 ; i++){ 
        const constants = [randomUintLen(20), randomUintLen(20)]; // can be random 32 byte value as well 
        const vSigner1 = op(
          Opcode.read_memory,
          memoryOperand(MemoryType.Constant, 0)
        );
        const vTokenAddr = op(
          Opcode.read_memory,
          memoryOperand(MemoryType.Constant, 1)
        );
    
        // prettier-ignore
        const sources = [
          concat([
              vTokenAddr,
              vSigner1,
            op(Opcode.erc_20_balance_of)
          ]),
        ];
    
        const expression0 = await expressionConsumerDeploy(
          sources,
          constants,
          rainInterpreter,
          1
        ); 

        assertError(
          async () => await logic["eval(address,uint256,uint256[][])"](
            rainInterpreter.address,
            expression0.dispatch,
            []
          ) , 
          "" ,
          "Did not error"
        )
      
      }
   

  })

  




});
