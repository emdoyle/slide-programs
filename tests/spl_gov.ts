import { Slide } from "../target/types/slide";
import { Program } from "@project-serum/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { createAccount, createMint, mintTo } from "@solana/spl-token";
import {
  withCreateRealm,
  withCreateTokenOwnerRecord,
  withDepositGoverningTokens,
  withCreateGovernance,
  GovernanceConfig,
  VoteThresholdPercentage,
  withCreateNativeTreasury,
  withCreateProposal,
  VoteType,
  withCastVote,
  Vote,
  withExecuteTransaction,
  withInsertTransaction,
  InstructionData,
  AccountMetaData,
  VoteChoice,
  withSignOffProposal,
} from "@solana/spl-governance";
import {
  addAccountAsSigner,
  flushInstructions,
  getAccessRecordAddressAndBump,
  getExpensePackageAddressAndBump,
  getFundedAccount,
  getGovernanceAddressAndBump,
  getNativeTreasuryAddressAndBump,
  getTokenOwnerRecordAddressAndBump,
  setWritable,
  signers,
  SPL_GOV_PROGRAM_ID,
  toBN,
} from "./utils";
import { MintMaxVoteWeightSource } from "@solana/spl-governance/lib/governance/accounts";
import * as anchor from "@project-serum/anchor";
import { createExpenseManager } from "./program_rpc";
import { assert, expect } from "chai";

async function setupSPLGov(
  program: Program<Slide>,
  user: Keypair,
  name?: string
) {
  const membershipTokenMint = await createMint(
    program.provider.connection,
    user,
    user.publicKey,
    null,
    9
  );
  const userTokenAccount = await createAccount(
    program.provider.connection,
    user,
    membershipTokenMint,
    user.publicKey
  );
  await mintTo(
    program.provider.connection,
    user,
    membershipTokenMint,
    userTokenAccount,
    user,
    100
  );
  const instructions = [];
  const realmName = name ?? "SPLGOVREALM";
  const realm = await withCreateRealm(
    instructions,
    SPL_GOV_PROGRAM_ID,
    2,
    realmName,
    user.publicKey,
    membershipTokenMint,
    user.publicKey,
    undefined,
    new MintMaxVoteWeightSource({ value: toBN(50_000) }),
    toBN(1)
  );
  const tokenOwnerRecord = await withCreateTokenOwnerRecord(
    instructions,
    SPL_GOV_PROGRAM_ID,
    realm,
    user.publicKey,
    membershipTokenMint,
    user.publicKey
  );
  await withDepositGoverningTokens(
    instructions,
    SPL_GOV_PROGRAM_ID,
    2,
    realm,
    userTokenAccount,
    membershipTokenMint,
    user.publicKey,
    user.publicKey,
    user.publicKey,
    toBN(100)
  );
  const txn = new Transaction();
  txn.add(...instructions);
  await program.provider.send(txn, signers(program, [user]));
  return {
    realm,
    realmName,
    membershipTokenMint,
    userTokenAccount,
    tokenOwnerRecord,
  };
}

async function createExpenseGovernance(
  program: Program<Slide>,
  user: Keypair,
  realm: PublicKey,
  tokenOwnerRecord: PublicKey,
  expenseManager: PublicKey
) {
  let instructions = [];
  const governance = await withCreateGovernance(
    instructions,
    SPL_GOV_PROGRAM_ID,
    2,
    realm,
    expenseManager,
    new GovernanceConfig({
      // TODO: don't really know what any of these values do
      voteThresholdPercentage: new VoteThresholdPercentage({ value: 1 }),
      minCommunityTokensToCreateProposal: toBN(1),
      minInstructionHoldUpTime: 0,
      maxVotingTime: 100,
      minCouncilTokensToCreateProposal: toBN(0),
    }),
    tokenOwnerRecord,
    user.publicKey, // payer
    user.publicKey // createAuthority
  );
  const nativeTreasury = await withCreateNativeTreasury(
    instructions,
    SPL_GOV_PROGRAM_ID,
    governance,
    user.publicKey
  );

  const txn = new Transaction();
  txn.add(...instructions);
  await program.provider.send(txn, signers(program, [user]));

  await program.provider.connection.requestAirdrop(
    nativeTreasury,
    2 * LAMPORTS_PER_SOL
  );
  return { governance, nativeTreasury };
}

type SPLGovSharedData = {
  user?: Keypair;
  realm?: PublicKey;
  membershipTokenMint?: PublicKey;
  tokenOwnerRecord?: PublicKey;
  tokenBump?: number;
  governance?: PublicKey;
  governanceBump?: number;
  nativeTreasury?: PublicKey;
  treasuryBump?: number;
  expenseManager?: PublicKey;
  accessRecord?: PublicKey;
  expensePackage?: PublicKey;
  packageNonce?: number;
};

describe("slide SPL Governance integration tests", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;
  const managerName = "SPLGOVINTEGRATIONTESTMANAGER";
  const packageName = "SPLGOVINTEGRATIONTESTPACKAGE";
  const packageDescription = "SPLGOVINTEGRATIONTESTPACKAGEDESCRIPTION";
  const packageQuantity = toBN(300_000);
  const realmName = "SPLGOVINTEGRATIONTESTREALM";
  const proposalName = "SPLGOVINTEGRATIONTESTPROPOSAL";
  const proposalDescriptionLink = "SPLGOVINTEGRATIONTESTPROPOSALDESCRIPTION";
  const sharedData: SPLGovSharedData = {};

  it("sets up realm and tokens", async () => {
    const user = await getFundedAccount(program);
    const { realm, membershipTokenMint, tokenOwnerRecord } = await setupSPLGov(
      program,
      user,
      realmName
    );
    // not testing SPL Gov SDK here, assuming accounts are well-formed

    sharedData.realm = realm;
    sharedData.membershipTokenMint = membershipTokenMint;
    sharedData.tokenOwnerRecord = tokenOwnerRecord;
    sharedData.user = user;
  });
  it("creates and initializes an expense manager", async () => {
    const { user, realm, membershipTokenMint, tokenOwnerRecord } = sharedData;
    // TODO: do creation and initialization need to happen in the same transaction?
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      membershipTokenMint,
      user,
      managerName
    );
    const [, tokenBump] = getTokenOwnerRecordAddressAndBump(
      realm,
      membershipTokenMint,
      user.publicKey
    );
    const { governance, nativeTreasury } = await createExpenseGovernance(
      program,
      user,
      realm,
      tokenOwnerRecord,
      expenseManagerPDA
    );
    const [, governanceBump] = getGovernanceAddressAndBump(
      realm,
      expenseManagerPDA
    );
    await program.methods
      .splGovInitializeExpenseManager(
        managerName,
        realm,
        governance,
        tokenBump,
        governanceBump
      )
      .accounts({
        expenseManager: expenseManagerPDA,
        governanceAuthority: governance,
        tokenOwnerRecord,
        member: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();
    const expenseManager = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );

    sharedData.expenseManager = expenseManagerPDA;
    sharedData.tokenBump = tokenBump;
    sharedData.governance = governance;
    sharedData.governanceBump = governanceBump;
    sharedData.nativeTreasury = nativeTreasury;

    assert(expenseManager.realm.equals(realm));
    assert(expenseManager.governanceAuthority.equals(governance));
  });
  it("creates an expense package", async () => {
    const { user, realm, tokenOwnerRecord, tokenBump, expenseManager } =
      sharedData;
    const [expensePackagePDA, package_bump] = getExpensePackageAddressAndBump(
      expenseManager,
      user.publicKey,
      0,
      program.programId
    );
    await program.methods
      .splGovCreateExpensePackage(managerName, realm, 0, tokenBump)
      .accounts({
        expensePackage: expensePackagePDA,
        expenseManager,
        tokenOwnerRecord,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    const expenseManagerData = await program.account.expenseManager.fetch(
      expenseManager
    );

    sharedData.expensePackage = expensePackagePDA;
    sharedData.packageNonce = 0;

    expect(expensePackageData.bump).to.equal(package_bump);
    expect(expensePackageData.state).to.eql({ created: {} });
    expect(expenseManagerData.expensePackageNonce).to.equal(1);
  });
  it("updates an expense package", async () => {
    const {
      user,
      realm,
      tokenOwnerRecord,
      tokenBump,
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .splGovUpdateExpensePackage(
        managerName,
        realm,
        packageName,
        packageDescription,
        packageQuantity,
        packageNonce,
        tokenBump
      )
      .accounts({
        expensePackage,
        expenseManager,
        tokenOwnerRecord,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    expect(expensePackageData.name).to.equal(packageName);
    expect(expensePackageData.description).to.equal(packageDescription);
    expect(expensePackageData.quantity.toString()).to.equal(
      packageQuantity.toString()
    );
  });
  it("submits an expense package", async () => {
    const {
      user,
      realm,
      tokenOwnerRecord,
      tokenBump,
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .splGovSubmitExpensePackage(managerName, realm, packageNonce, tokenBump)
      .accounts({
        expensePackage,
        expenseManager,
        tokenOwnerRecord,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    expect(expensePackageData.state).to.eql({ pending: {} });
  });
  it("grants reviewer access", async () => {
    // generate instructions for creating an access record
    const {
      user,
      expenseManager,
      realm,
      tokenOwnerRecord,
      membershipTokenMint,
      governance,
      governanceBump,
      nativeTreasury,
    } = sharedData;
    const [, treasuryBump] = getNativeTreasuryAddressAndBump(governance);
    const [accessRecord] = getAccessRecordAddressAndBump(
      program.programId,
      expenseManager,
      user.publicKey
    );
    const instruction: TransactionInstruction = await program.methods
      .splGovCreateAccessRecord(
        managerName,
        realm,
        user.publicKey,
        { reviewer: {} },
        governanceBump,
        treasuryBump
      )
      .accounts({
        accessRecord,
        expenseManager,
        governanceAuthority: governance,
        nativeTreasury,
      })
      .instruction();
    const instructionData = new InstructionData({
      programId: program.programId,
      accounts: instruction.keys.map((key) => new AccountMetaData({ ...key })),
      data: instruction.data,
    });
    // create a proposal containing those instructions
    let instructions = [];
    const proposal = await withCreateProposal(
      instructions,
      SPL_GOV_PROGRAM_ID,
      2,
      realm,
      governance,
      tokenOwnerRecord,
      proposalName,
      proposalDescriptionLink,
      membershipTokenMint,
      user.publicKey,
      0,
      new VoteType({ type: 0, choiceCount: 1 }),
      ["Grant Access"],
      true,
      user.publicKey
    );
    const proposalTransaction = await withInsertTransaction(
      instructions,
      SPL_GOV_PROGRAM_ID,
      2,
      governance,
      proposal,
      tokenOwnerRecord,
      user.publicKey,
      0,
      0,
      0,
      [instructionData],
      user.publicKey
    );
    // initiate voting on the proposal
    await withSignOffProposal(
      instructions,
      SPL_GOV_PROGRAM_ID,
      2,
      realm,
      governance,
      proposal,
      user.publicKey,
      undefined,
      tokenOwnerRecord
    );

    await flushInstructions(program, instructions, [user]);
    instructions = [];

    // cast a vote for the proposal (finalizing is unnecessary due to vote tipping)
    await withCastVote(
      instructions,
      SPL_GOV_PROGRAM_ID,
      2,
      realm,
      governance,
      proposal,
      tokenOwnerRecord,
      tokenOwnerRecord,
      user.publicKey,
      membershipTokenMint,
      new Vote({
        voteType: 0,
        approveChoices: [new VoteChoice({ rank: 0, weightPercentage: 100 })],
        deny: false,
      }),
      user.publicKey
    );

    setWritable(instructions, user.publicKey);
    await flushInstructions(program, instructions, [user]);
    instructions = [];

    // execute the transaction
    await withExecuteTransaction(
      instructions,
      SPL_GOV_PROGRAM_ID,
      2,
      governance,
      proposal,
      proposalTransaction,
      [instructionData]
    );

    // need to wait for unix timestamp on cluster to advance before executing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addAccountAsSigner(instructions[0], user.publicKey);
    await flushInstructions(program, instructions, [user]);

    // verify that reviewer access is granted to the user (AccessRecord exists and is initialized)
    const accessRecordData = await program.account.accessRecord.fetch(
      accessRecord
    );

    expect(accessRecordData.role).to.eql({ reviewer: {} });
  });
});
