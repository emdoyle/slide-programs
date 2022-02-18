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

async function initializeUser(
  program: Program<Slide>,
  username: string,
  realName: string
) {
  const user = program.provider.wallet;
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
    signers: [],
  });
  return { user, userDataPDA };
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
  await program.rpc.createExpensePackage(
    name,
    description,
    nonce,
    managerName,
    managerBump,
    packageBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
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

describe("slide", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;

  it("creates user data with correct initial values", async () => {
    const { user, userDataPDA } = await initializeUser(
      program,
      "0x63problems",
      "me"
    );
    let userData = await program.account.userData.fetch(userDataPDA);
    expect(userData.username).to.equal("0x63problems");
    expect(userData.realName).to.equal("me");
    assert(userData.user.equals(user.publicKey));
    expect(userData.accountType).to.eql({ userData: {} });
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
    expect(expenseManagerData.accountType).to.eql({ expenseManager: {} });
    expect(expenseManagerData.nativePayout).to.equal(true);
    expect(expenseManagerData.tokenPayout).to.be.null;
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
    assert(expensePackageData.expenseManager.equals(expenseManagerPDA));
    expect(expensePackageData.state).to.eql({ created: {} });
    expect(expensePackageData.quantity.toNumber()).to.equal(0);
    expect(expensePackageData.tokenAuthority).to.be.null;
  });
});
