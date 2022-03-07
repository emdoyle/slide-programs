import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Slide } from "../target/types/slide";
import { assert, expect } from "chai";
import {
  getExpenseManagerAddressAndBump,
  getFundedAccount,
  getUserDataAddressAndBump,
  Payer,
  signers,
  toBN,
  SPL_GOV_PROGRAM_ID,
  SQUADS_PROGRAM_ID,
  getAccountInfo,
  getTokenOwnerRecordAddressAndBump,
} from "./utils";
import {
  withCreateRealm,
  withCreateTokenOwnerRecord,
  withDepositGoverningTokens,
} from "@solana/spl-governance";
import { createMint, mintTo, createAccount } from "@solana/spl-token";
import { MintMaxVoteWeightSource } from "@solana/spl-governance/lib/governance/accounts";

/*
 * Notes
 * - connection.requestAirdrop could be useful instead of funding from provider wallet (might slow down tests tho)
 */

async function initializeUser(
  program: Program<Slide>,
  user: Payer,
  username: string,
  realName: string
) {
  const [userDataPDA] = getUserDataAddressAndBump(
    user.publicKey,
    program.programId
  );
  await program.rpc.initializeUser(username, realName, {
    accounts: {
      userData: userDataPDA,
      user: user.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: signers(program, [user]),
  });
  return { userDataPDA };
}

async function createExpenseManager(
  program: Program<Slide>,
  membership_token_mint: PublicKey,
  payer: Payer,
  name: string
) {
  const [expenseManagerPDA] = getExpenseManagerAddressAndBump(
    name,
    program.programId
  );
  await program.rpc.createExpenseManager(name, membership_token_mint, {
    accounts: {
      expenseManager: expenseManagerPDA,
      payer: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: signers(program, [payer]),
  });
  return {
    expenseManagerPDA,
  };
}

async function setupSPLGov(program: Program<Slide>, user: Keypair) {
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
  const realmName = "SPLGOVREALM";
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

describe("slide", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;

  it("creates user data with correct initial values", async () => {
    const user = await getFundedAccount(program);
    const { userDataPDA } = await initializeUser(
      program,
      user,
      "0x63problems",
      "me"
    );
    let userData = await program.account.userData.fetch(userDataPDA);
    expect(userData.username).to.equal("0x63problems");
    expect(userData.realName).to.equal("me");
    assert(userData.user.equals(user.publicKey));
  });
  it("creates expense manager with correct initial values", async () => {
    const payer = await getFundedAccount(program);
    // NOTE: some pubkey needs to be the authority over the mint itself
    const membership_token_mint = await createMint(
      program.provider.connection,
      payer,
      payer.publicKey,
      null,
      9
    );
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      membership_token_mint,
      payer,
      "testing manager"
    );
    let expenseManagerData = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );
    expect(expenseManagerData.name).to.equal("testing manager");
  });
  it("initializes SPL Gov expense manager", async () => {
    const user = await getFundedAccount(program);
    const { realm, membershipTokenMint, tokenOwnerRecord } = await setupSPLGov(
      program,
      user
    );
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      membershipTokenMint,
      user,
      "testing manager 2"
    );
    const [, bump] = getTokenOwnerRecordAddressAndBump(
      realm,
      membershipTokenMint,
      user.publicKey
    );
    await program.methods
      .splGovInitializeExpenseManager(
        "testing manager 2",
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
  });
});
