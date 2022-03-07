import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Slide } from "../target/types/slide";
import { assert, expect } from "chai";
import {
  getBalance,
  getExpenseManagerAddressAndBump,
  getExpensePackageAddressAndBump,
  getFundedAccount,
  getUserDataAddressAndBump,
  Payer,
  signers,
  toBN,
  transfer,
  SPL_GOV_PROGRAM_ID,
  SQUADS_PROGRAM_ID,
} from "./utils";
import { getRealms } from "@solana/spl-governance";
import { createMint, mintTo } from "@solana/spl-token";

/*
 * Notes
 * - connection.requestAirdrop could be useful instead of funding from provider wallet (might slow down tests tho)
 */

/*
 * Issues
 * - doesn't seem to include new blockhash between tests? getting dupe txn errors
 * */

async function initializeUser(
  program: Program<Slide>,
  user: Payer,
  username: string,
  realName: string
) {
  const [userDataPDA, bump] = getUserDataAddressAndBump(
    user.publicKey,
    program.programId
  );
  await program.rpc.initializeUser(username, realName, bump, {
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
  const [expenseManagerPDA, bump] = getExpenseManagerAddressAndBump(
    name,
    program.programId
  );
  await program.rpc.createExpenseManager(name, membership_token_mint, bump, {
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
  // to test the deserialization, need to:
  // - create realm
  // - create TokenOwnerRecord (might have to also create mint and mint some tokens)
  // - pass the TokenOwnerRecord to an instruction that tries to deserialize it
});
