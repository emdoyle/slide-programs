import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Slide } from "../target/types/slide";
import { assert, expect } from "chai";

function getExpenseManagerAddressAndBump(
  name: string,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("expense_manager"), Buffer.from(name)],
    programId
  );
}

function getExpensePackageAddressAndBump(
  expenseManagerPDA: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [
      Buffer.from("expense_package"),
      expenseManagerPDA.toBuffer(),
      owner.toBuffer(),
    ],
    programId
  );
}

async function setupExpenseManager(program: Program<Slide>, name: string) {
  const authority = program.provider.wallet;
  const [expenseManagerPDA, bump] = getExpenseManagerAddressAndBump(
    name,
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
  program: Program<Slide>,
  name: string,
  description: string,
  user: anchor.web3.PublicKey,
  expenseManagerPDA: anchor.web3.PublicKey
) {
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user,
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
        owner: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [],
    }
  );
  return {
    expensePackagePDA,
  };
}

async function addTransactionHash(
  program: Program<Slide>,
  managerName: string,
  transactionHash: string,
  user: anchor.web3.PublicKey
) {
  const [expenseManagerPDA, managerBump] = getExpenseManagerAddressAndBump(
    managerName,
    program.programId
  );
  const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user,
    program.programId
  );
  await program.rpc.addTransactionHash(
    transactionHash,
    managerName,
    managerBump,
    packageBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
        owner: user,
      },
    }
  );
  return {
    expensePackagePDA,
  };
}

describe("slide", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;

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

  it("adds a transaction hash to expense package", async () => {
    const { authority, expenseManagerPDA } = await setupExpenseManager(
      program,
      "testing manager 3"
    );
    await setupExpensePackage(
      program,
      "myexpense",
      "I bought some stuff on ebay",
      authority.publicKey,
      expenseManagerPDA
    );
    const { expensePackagePDA } = await addTransactionHash(
      program,
      "testing manager 3",
      "faketransactionhash",
      authority.publicKey
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.transactionHashes).to.eql([
      "faketransactionhash",
    ]);
  });
});
