import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { RiptideQ1 } from "../target/types/riptide_q1";
import { expect } from "chai";

async function setup(program: Program<RiptideQ1>, name: string) {
  const daoMember = program.provider.wallet; // from Anchor.toml, this is also the payer so wallet needs funds
  const [expenseManagerPDA, bump] =
    anchor.utils.publicKey.findProgramAddressSync(
      [Buffer.from("expense_manager"), Buffer.from(name)],
      program.programId
    );
  await program.rpc.createExpenseManager(name, bump, {
    accounts: {
      expenseManager: expenseManagerPDA,
      daoMember: daoMember.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [], // playerOne automatically included as a signer because it is listed as the provider
  });
  return {
    daoMember,
    expenseManagerPDA,
  };
}

describe("riptide-q1", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.RiptideQ1 as Program<RiptideQ1>;

  it("creates expense manager", async () => {
    const { expenseManagerPDA } = await setup(program, "testing manager");
    let expenseManagerData = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );
    expect(expenseManagerData.name).to.equal("testing manager");
  });
});
