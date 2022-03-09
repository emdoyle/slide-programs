import { Slide } from "../target/types/slide";
import { Program } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createAccount, createMint, mintTo } from "@solana/spl-token";
import {
  withCreateRealm,
  withCreateTokenOwnerRecord,
  withDepositGoverningTokens,
  withCreateGovernance,
  GovernanceConfig,
  VoteThresholdPercentage,
} from "@solana/spl-governance";
import {
  getExpensePackageAddressAndBump,
  getFundedAccount,
  getGovernanceAddressAndBump,
  getTokenOwnerRecordAddressAndBump,
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
      minCommunityTokensToCreateProposal: toBN(1_000),
      minInstructionHoldUpTime: 100,
      maxVotingTime: 100,
      minCouncilTokensToCreateProposal: toBN(0),
    }),
    tokenOwnerRecord,
    user.publicKey, // payer
    user.publicKey // createAuthority
  );

  // TODO: dirty hack until payer is marked writable correctly by SDK
  instructions[0].keys.forEach((keyObj) => {
    if (keyObj.pubkey.equals(user.publicKey)) {
      keyObj.isWritable = true;
    }
  });
  const txn = new Transaction();
  txn.add(...instructions);
  await program.provider.send(txn, signers(program, [user]));
  return { governance };
}

type SPLGovSharedData = {
  user?: Keypair;
  realm?: PublicKey;
  membershipTokenMint?: PublicKey;
  tokenOwnerRecord?: PublicKey;
  tokenBump?: number;
  expenseManager?: PublicKey;
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
    const { governance } = await createExpenseGovernance(
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
  it("approves an expense package", async () => {});
});
