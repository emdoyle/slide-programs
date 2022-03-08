import { Slide } from "../target/types/slide";
import { Program } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createAccount, createMint, mintTo } from "@solana/spl-token";
import {
  withCreateRealm,
  withCreateTokenOwnerRecord,
  withDepositGoverningTokens,
} from "@solana/spl-governance";
import {
  getExpensePackageAddressAndBump,
  getFundedAccount,
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
    toBN(100_000)
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

type SPLGovSharedData = {
  user?: Keypair;
  realm?: PublicKey;
  membershipTokenMint?: PublicKey;
  tokenOwnerRecord?: PublicKey;
  tokenBump?: number;
  expenseManager?: PublicKey;
  expensePackage?: PublicKey;
  packageNonce?: Buffer;
};

describe("slide SPL Governance integration tests", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;
  const managerName = "SPLGOVINTEGRATIONTESTMANAGER";
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
    const [, bump] = getTokenOwnerRecordAddressAndBump(
      realm,
      membershipTokenMint,
      user.publicKey
    );
    await program.methods
      .splGovInitializeExpenseManager(
        managerName,
        realm,
        user.publicKey, // TODO: should be gov authority
        bump
      )
      .accounts({
        expenseManager: expenseManagerPDA,
        tokenOwnerRecord,
        member: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();
    const expenseManager = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );
    assert(expenseManager.realm.equals(realm));
    assert(expenseManager.governanceAuthority.equals(user.publicKey));

    sharedData.expenseManager = expenseManagerPDA;
    sharedData.tokenBump = bump;
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
    expect(expensePackageData.bump).to.equal(package_bump);
    expect(expenseManagerData.expensePackageNonce).to.equal(1);
  });
});
