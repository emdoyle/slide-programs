import { Slide } from "../target/types/slide";
import { BN, Program } from "@project-serum/anchor";
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
  withCreateTokenGovernance,
} from "@solana/spl-governance";
import { airdropToAccount, getFundedAccount } from "./utils";
import { SPL_GOV_PROGRAM_ID } from "@slidexyz/slide-sdk/lib/constants";
import {
  addAccountAsSigner,
  flushInstructions,
  getBalance,
  setWritable,
  signers,
  toBN,
} from "@slidexyz/slide-sdk/lib/utils";
import {
  getAccessRecordAddressAndBump,
  getExpensePackageAddressAndBump,
} from "@slidexyz/slide-sdk/lib/address";
import { MintMaxVoteWeightSource } from "@solana/spl-governance/lib/governance/accounts";
import * as anchor from "@project-serum/anchor";
import { createExpenseManager } from "./program_rpc";
import { assert, expect } from "chai";

async function setupSPLGov(
  program: Program<Slide>,
  user: Keypair,
  name?: string
) {
  const reviewer = anchor.web3.Keypair.generate();
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
  const reviewerTokenAccount = await createAccount(
    program.provider.connection,
    user,
    membershipTokenMint,
    reviewer.publicKey
  );
  await mintTo(
    program.provider.connection,
    user,
    membershipTokenMint,
    userTokenAccount,
    user,
    100_000
  );
  await mintTo(
    program.provider.connection,
    user,
    membershipTokenMint,
    reviewerTokenAccount,
    user,
    1
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
  const reviewerTokenOwnerRecord = await withCreateTokenOwnerRecord(
    instructions,
    SPL_GOV_PROGRAM_ID,
    realm,
    reviewer.publicKey,
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
    toBN(100_000)
  );
  await withDepositGoverningTokens(
    instructions,
    SPL_GOV_PROGRAM_ID,
    2,
    realm,
    reviewerTokenAccount,
    membershipTokenMint,
    reviewer.publicKey,
    reviewer.publicKey,
    user.publicKey,
    toBN(1)
  );
  const txn = new Transaction();
  txn.add(...instructions);
  await program.provider.send(txn, signers(program, [user, reviewer]));
  return {
    realm,
    realmName,
    membershipTokenMint,
    userTokenAccount,
    tokenOwnerRecord,
    reviewer,
    reviewerTokenAccount,
    reviewerTokenOwnerRecord,
  };
}

async function createExpenseGovernance(
  program: Program<Slide>,
  user: Keypair,
  realm: PublicKey,
  tokenOwnerRecord: PublicKey
) {
  const instructions = [];
  const sentinelTokenMint = await createMint(
    program.provider.connection,
    user,
    user.publicKey,
    null,
    9
  );
  const userTokenAccount = await createAccount(
    program.provider.connection,
    user,
    sentinelTokenMint,
    user.publicKey
  );
  const governance = await withCreateTokenGovernance(
    instructions,
    SPL_GOV_PROGRAM_ID,
    2,
    realm,
    userTokenAccount, // governed_account is arbitrary token account to match Gov UI behavior
    new GovernanceConfig({
      // TODO: don't really know what any of these values do
      voteThresholdPercentage: new VoteThresholdPercentage({ value: 1 }),
      minCommunityTokensToCreateProposal: toBN(1),
      minInstructionHoldUpTime: 0,
      maxVotingTime: 100,
      minCouncilTokensToCreateProposal: toBN(0),
    }),
    false,
    user.publicKey,
    tokenOwnerRecord,
    user.publicKey, // payer
    user.publicKey // governanceAuthority
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

  return { governance, nativeTreasury };
}

type SPLGovSharedData = {
  user?: Keypair;
  reviewer?: Keypair;
  realm?: PublicKey;
  membershipTokenMint?: PublicKey;
  tokenOwnerRecord?: PublicKey;
  reviewerTokenOwnerRecord?: PublicKey;
  governance?: PublicKey;
  nativeTreasury?: PublicKey;
  expenseManager?: PublicKey;
  accessRecord?: PublicKey;
  expensePackage?: PublicKey;
  packageNonce?: number;
};

describe("slide SPL Governance integration tests", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;
  const connection = program.provider.connection;
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
    const {
      realm,
      membershipTokenMint,
      tokenOwnerRecord,
      reviewer,
      reviewerTokenOwnerRecord,
    } = await setupSPLGov(program, user, realmName);

    sharedData.realm = realm;
    sharedData.membershipTokenMint = membershipTokenMint;
    sharedData.tokenOwnerRecord = tokenOwnerRecord;
    sharedData.user = user;
    sharedData.reviewer = reviewer;
    sharedData.reviewerTokenOwnerRecord = reviewerTokenOwnerRecord;
  });
  it("creates and initializes an expense manager", async () => {
    const { user, realm, membershipTokenMint, tokenOwnerRecord } = sharedData;
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      membershipTokenMint,
      user,
      managerName
    );
    await airdropToAccount(program, expenseManagerPDA);
    const { governance, nativeTreasury } = await createExpenseGovernance(
      program,
      user,
      realm,
      tokenOwnerRecord
    );
    await airdropToAccount(program, nativeTreasury);
    await program.methods
      .splGovInitializeExpenseManager(realm)
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
    sharedData.governance = governance;
    sharedData.nativeTreasury = nativeTreasury;

    assert(expenseManager.realm.equals(realm));
    assert(expenseManager.governanceAuthority.equals(governance));
  });
  it("creates an expense package", async () => {
    const { user, realm, tokenOwnerRecord, expenseManager } = sharedData;
    const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
      expenseManager,
      user.publicKey,
      0,
      program.programId
    );
    await program.methods
      .splGovCreateExpensePackage(
        realm,
        0,
        packageName,
        packageDescription,
        packageQuantity
      )
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

    expect(expensePackageData.bump).to.equal(packageBump);
    expect(expensePackageData.state).to.eql({ created: {} });
    expect(expenseManagerData.expensePackageNonce).to.equal(1);
  });
  it("updates an expense package", async () => {
    const {
      user,
      realm,
      tokenOwnerRecord,
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .splGovUpdateExpensePackage(
        realm,
        packageNonce,
        packageName,
        packageDescription,
        packageQuantity
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
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .splGovSubmitExpensePackage(realm, packageNonce)
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
      reviewer,
      reviewerTokenOwnerRecord,
      expenseManager,
      realm,
      tokenOwnerRecord,
      membershipTokenMint,
      governance,
      nativeTreasury,
    } = sharedData;
    const [accessRecord] = getAccessRecordAddressAndBump(
      program.programId,
      expenseManager,
      reviewer.publicKey
    );
    const instruction: TransactionInstruction = await program.methods
      .splGovCreateAccessRecord(realm, reviewer.publicKey, {
        reviewer: {},
      })
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    addAccountAsSigner(instructions[0], user.publicKey);
    await flushInstructions(program, instructions, [user]);

    // verify that reviewer access is granted to the user (AccessRecord exists and is initialized)
    const accessRecordData = await program.account.accessRecord.fetch(
      accessRecord
    );

    sharedData.accessRecord = accessRecord;

    expect(accessRecordData.role).to.eql({ reviewer: {} });
    assert(accessRecordData.user.equals(reviewer.publicKey));
    assert(accessRecordData.expenseManager.equals(expenseManager));
  });
  it("approves expense package", async () => {
    const {
      reviewer,
      reviewerTokenOwnerRecord,
      expensePackage,
      expenseManager,
      packageNonce,
      realm,
      accessRecord,
    } = sharedData;

    await program.methods
      .splGovApproveExpensePackage(realm, packageNonce)
      .accounts({
        expensePackage,
        expenseManager,
        tokenOwnerRecord: reviewerTokenOwnerRecord,
        accessRecord,
        authority: reviewer.publicKey,
      })
      .signers(signers(program, [reviewer]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    expect(expensePackageData.state).to.eql({ approved: {} });
  });
  it("withdraws from expense package", async () => {
    const { user, expensePackage, packageNonce } = sharedData;

    const userBalancePre = await getBalance(connection, user.publicKey);
    const packageBalancePre = await getBalance(connection, expensePackage);

    await program.methods
      .withdrawFromExpensePackage(packageNonce)
      .accounts({
        expensePackage,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const userBalancePost = await getBalance(connection, user.publicKey);
    const packageBalancePost = await getBalance(connection, expensePackage);
    const packageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    // why is a fee not being charged? no idea
    expect(userBalancePost - userBalancePre).to.equal(
      packageQuantity.toNumber()
    );
    expect(packageBalancePre - packageBalancePost).to.equal(
      packageQuantity.toNumber()
    );
    expect(packageData.state).to.eql({ paid: {} });
  });
  it("creates second expense package", async () => {
    const { user, realm, tokenOwnerRecord, expenseManager } = sharedData;
    const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
      expenseManager,
      user.publicKey,
      1,
      program.programId
    );
    await program.methods
      .splGovCreateExpensePackage(
        realm,
        1,
        packageName,
        packageDescription,
        packageQuantity
      )
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
    sharedData.packageNonce = 1;

    expect(expensePackageData.bump).to.equal(packageBump);
    expect(expensePackageData.state).to.eql({ created: {} });
    expect(expenseManagerData.expensePackageNonce).to.equal(2);
  });
  it("submits second expense package", async () => {
    const {
      user,
      realm,
      tokenOwnerRecord,
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .splGovSubmitExpensePackage(realm, packageNonce)
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
  it("denies expense package", async () => {
    const {
      reviewer,
      reviewerTokenOwnerRecord,
      expensePackage,
      expenseManager,
      packageNonce,
      realm,
      accessRecord,
    } = sharedData;

    await program.methods
      .splGovDenyExpensePackage(realm, packageNonce)
      .accounts({
        expensePackage,
        expenseManager,
        tokenOwnerRecord: reviewerTokenOwnerRecord,
        accessRecord,
        authority: reviewer.publicKey,
      })
      .signers(signers(program, [reviewer]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    expect(expensePackageData.state).to.eql({ denied: {} });
  });
  it("withdraws from expense manager", async () => {
    // generate instructions for withdrawal
    const {
      user,
      expenseManager,
      realm,
      tokenOwnerRecord,
      membershipTokenMint,
      governance,
      nativeTreasury,
    } = sharedData;
    const withdrawalAmount = LAMPORTS_PER_SOL;
    const instruction: TransactionInstruction = await program.methods
      .splGovWithdrawFromExpenseManager(realm, new BN(withdrawalAmount))
      .accounts({
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
      1,
      new VoteType({ type: 0, choiceCount: 1 }),
      ["Withdraw"],
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const managerBalancePre = await getBalance(connection, expenseManager);
    const treasuryBalancePre = await getBalance(connection, nativeTreasury);

    addAccountAsSigner(instructions[0], user.publicKey);
    await flushInstructions(program, instructions, [user]);

    const managerBalancePost = await getBalance(connection, expenseManager);
    const treasuryBalancePost = await getBalance(connection, nativeTreasury);

    expect(managerBalancePre - managerBalancePost).to.equal(withdrawalAmount);
    expect(treasuryBalancePost - treasuryBalancePre).to.equal(withdrawalAmount);
  });
});
