import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Slide } from "../target/types/slide";
import { assert, expect } from "chai";

function getUserDataAddressAndBump(
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("user_data"), user.toBuffer()],
    programId
  );
}

function getExpenseManagerAddressAndBump(
  name: string,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("expense_manager"), Buffer.from(name)],
    programId
  );
}

function getUserExpenseDataAddressAndBump(
  expenseManagerPDA: anchor.web3.PublicKey,
  user: anchor.web3.PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [
      Buffer.from("user_expense_data"),
      expenseManagerPDA.toBuffer(),
      user.toBuffer(),
    ],
    programId
  );
}

function getExpensePackageAddressAndBump(
  expenseManagerPDA: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey,
  nonce: number,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [
      Buffer.from("expense_package"),
      expenseManagerPDA.toBuffer(),
      owner.toBuffer(),
      Buffer.from([nonce]),
    ],
    programId
  );
}

async function initializeUser(program: Program<Slide>, name: string) {
  const user = program.provider.wallet;
  const [userDataPDA, bump] = getUserDataAddressAndBump(
    user.publicKey,
    program.programId
  );
  await program.rpc.initializeUser(name, bump, {
    accounts: {
      userData: userDataPDA,
      user: user.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [],
  });
  return { userDataPDA };
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

async function joinExpenseManager(program: Program<Slide>, name: string) {
  const user = program.provider.wallet;
  const [userDataPDA, userBump] = getUserDataAddressAndBump(
    user.publicKey,
    program.programId
  );
  const [expenseManagerPDA, managerBump] = getExpenseManagerAddressAndBump(
    name,
    program.programId
  );
  const [userExpenseDataPDA, userExpenseBump] =
    getUserExpenseDataAddressAndBump(
      expenseManagerPDA,
      user.publicKey,
      program.programId
    );
  await program.rpc.joinExpenseManager(
    name,
    managerBump,
    userBump,
    userExpenseBump,
    {
      accounts: {
        userData: userDataPDA,
        expenseManager: expenseManagerPDA,
        userExpenseData: userExpenseDataPDA,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [],
    }
  );
  return { userDataPDA, expenseManagerPDA, userExpenseDataPDA };
}

async function setupExpensePackage(
  program: Program<Slide>,
  name: string,
  description: string,
  nonce: number,
  user: anchor.web3.PublicKey,
  managerName: string
) {
  const [expenseManagerPDA, managerBump] = getExpenseManagerAddressAndBump(
    managerName,
    program.programId
  );
  const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user,
    nonce,
    program.programId
  );
  const [userExpenseDataPDA, userExpenseBump] =
    getUserExpenseDataAddressAndBump(
      expenseManagerPDA,
      user,
      program.programId
    );
  await program.rpc.createExpensePackage(
    name,
    description,
    nonce,
    managerName,
    packageBump,
    managerBump,
    userExpenseBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
        userExpenseData: userExpenseDataPDA,
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
  nonce: number,
  transactionHash: string,
  user: anchor.web3.PublicKey,
  expenseManagerPDA: anchor.web3.PublicKey
) {
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user,
    nonce,
    program.programId
  );
  await program.rpc.addTransactionHash(
    transactionHash,
    expenseManagerPDA,
    bump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
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

  it("creates user data with correct initial values", async () => {
    const { userDataPDA } = await initializeUser(program, "testing user data");
    let userData = await program.account.userData.fetch(userDataPDA);
    expect(userData.name).to.equal("testing user data");
  });
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
  it("joins expense manager and sets correct value in user data", async () => {
    const { expenseManagerPDA } = await setupExpenseManager(
      program,
      "testing another manager"
    );
    const { userDataPDA, userExpenseDataPDA } = await joinExpenseManager(
      program,
      "testing another manager"
    );
    let userData = await program.account.userData.fetch(userDataPDA);
    expect(userData.expenseManagers).to.eql([expenseManagerPDA]);
    let userExpenseData = await program.account.userExpenseData.fetch(
      userExpenseDataPDA
    );
    expect(userExpenseData.expensePackages).to.eql([]);
  });
  it("creates an expense package with correct initial values", async () => {
    const { authority } = await setupExpenseManager(
      program,
      "testing manager 2"
    );
    const { userExpenseDataPDA } = await joinExpenseManager(
      program,
      "testing manager 2"
    );
    const { expensePackagePDA } = await setupExpensePackage(
      program,
      "myexpense",
      "I bought some stuff on ebay",
      1,
      authority.publicKey,
      "testing manager 2"
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.name).to.equal("myexpense");
    expect(expensePackageData.description).to.equal(
      "I bought some stuff on ebay"
    );
    assert(expensePackageData.owner.equals(authority.publicKey));
    expect(expensePackageData.state).to.eql({ created: {} });
    let userExpenseData = await program.account.userExpenseData.fetch(
      userExpenseDataPDA
    );
    expect(userExpenseData.expensePackages).to.eql([
      { nonce: 1, address: expensePackagePDA },
    ]);
  });

  // it("adds a transaction hash to expense package", async () => {
  //   const { authority, expenseManagerPDA } = await setupExpenseManager(
  //     program,
  //     "testing manager 3"
  //   );
  //   const { userDataPDA, userExpenseDataPDA } = await joinExpenseManager(
  //     program,
  //     "testing manager 3"
  //   );
  //   await setupExpensePackage(
  //     program,
  //     "myexpense",
  //     "I bought some stuff on ebay",
  //     1,
  //     authority.publicKey,
  //     "testing manager 3"
  //   );
  //   const { expensePackagePDA } = await addTransactionHash(
  //     program,
  //     1,
  //     "faketransactionhash",
  //     authority.publicKey,
  //     expenseManagerPDA
  //   );
  //   let expensePackageData = await program.account.expensePackage.fetch(
  //     expensePackagePDA
  //   );
  //   expect(expensePackageData.transactionHashes).to.eql([
  //     "faketransactionhash",
  //   ]);
  // });
});
