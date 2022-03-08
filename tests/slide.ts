import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Slide } from "../target/types/slide";
import { assert, expect } from "chai";
import { getFundedAccount } from "./utils";
import { createMint } from "@solana/spl-token";
import { createExpenseManager, initializeUser } from "./program_rpc";

describe("slide base tests", () => {
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
});
