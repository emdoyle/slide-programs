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
} from "./utils";

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
    // TODO: actually initialize a mint, verify on-chain
    const membership_token_mint = anchor.web3.Keypair.generate();
    const payer = await getFundedAccount(program);
    // TODO: membership_token_mint
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      membership_token_mint.publicKey,
      payer,
      "testing manager"
    );
    let expenseManagerData = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );
    expect(expenseManagerData.name).to.equal("testing manager");
  });
});
