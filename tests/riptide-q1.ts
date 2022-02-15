import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { RiptideQ1 } from "../target/types/riptide_q1";
import { assert, expect } from "chai";

async function setup(program: Program<RiptideQ1>, name: string) {
  const authority = program.provider.wallet;
  const [expenseManagerPDA, bump] =
    anchor.utils.publicKey.findProgramAddressSync(
      [Buffer.from("expense_manager"), Buffer.from(name)],
      program.programId
    );
  await program.rpc.createExpenseManager(name, bump, {
    accounts: {
      expenseManager: expenseManagerPDA,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [],
  });
  return {
    authority,
    expenseManagerPDA,
  };
}

describe("riptide-q1", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.RiptideQ1 as Program<RiptideQ1>;

  it("creates expense manager with correct initial values", async () => {
    const { authority, expenseManagerPDA } = await setup(
      program,
      "testing manager"
    );
    let expenseManagerData = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );
    expect(expenseManagerData.name).to.equal("testing manager");
    assert(expenseManagerData.authority.equals(authority.publicKey));
  });
});
