import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { RiptideQ1 } from "../target/types/riptide_q1";
import { assert, expect } from "chai";

async function setupExpenseManager(program: Program<RiptideQ1>, name: string) {
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

async function setupExpensePackage(
  program: Program<RiptideQ1>,
  name: string,
  description: string,
  user: anchor.web3.PublicKey,
  expenseManagerPDA: anchor.web3.PublicKey
) {
  const [expensePackagePDA, bump] =
    anchor.utils.publicKey.findProgramAddressSync(
      [
        Buffer.from("expense_package"),
        expenseManagerPDA.toBuffer(),
        user.toBuffer(),
      ],
      program.programId
    );
  await program.rpc.createExpensePackage(
    name,
    description,
    expenseManagerPDA,
    bump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        user,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [],
    }
  );
  return {
    expensePackagePDA,
  };
}

describe("riptide-q1", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.RiptideQ1 as Program<RiptideQ1>;

  it("creates expense manager with correct initial values", async () => {
    const { authority, expenseManagerPDA } = await setupExpenseManager(
      program,
      "testing manager"
    );
    let expenseManagerData = await program.account.expenseManager.fetch(
      expenseManagerPDA
    );
    expect(expenseManagerData.name).to.equal("testing manager");
    assert(expenseManagerData.authority.equals(authority.publicKey));
  });

  it("creates an expense package with correct initial values", async () => {
    const { authority, expenseManagerPDA } = await setupExpenseManager(
      program,
      "testing manager 2"
    );
    const { expensePackagePDA } = await setupExpensePackage(
      program,
      "myexpense",
      "I bought some stuff on ebay",
      authority.publicKey,
      expenseManagerPDA
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.name).to.equal("myexpense");
    expect(expensePackageData.description).to.equal(
      "I bought some stuff on ebay"
    );
    assert(expensePackageData.owner.equals(authority.publicKey));
    assert(expensePackageData.expenseManager.equals(expenseManagerPDA));
    expect(expensePackageData.state).to.eql({ created: {} });
  });
});
