import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { BN, Program } from "@project-serum/anchor";
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

async function createExpenseManager(program: Program<Slide>, name: string) {
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

async function createExpensePackage(
  program: Program<Slide>,
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

async function updateExpensePackage(
  program: Program<Slide>,
  user: anchor.web3.PublicKey,
  name: string,
  description: string,
  quantity: BN,
  tokenAuthority: PublicKey | null,
  expenseManagerPDA: PublicKey,
  nonce: number
) {
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user,
    nonce,
    program.programId
  );
  await program.rpc.updateExpensePackage(
    name,
    description,
    quantity,
    tokenAuthority,
    expenseManagerPDA,
    nonce,
    bump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        owner: user,
      },
      signers: [],
    }
  );
  return { expensePackagePDA };
}

async function submitExpensePackage(
  program: Program<Slide>,
  user: anchor.web3.PublicKey,
  expenseManagerPDA: PublicKey,
  nonce: number
) {
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user,
    nonce,
    program.programId
  );
  await program.rpc.submitExpensePackage(expenseManagerPDA, nonce, bump, {
    accounts: {
      expensePackage: expensePackagePDA,
      owner: user,
    },
    signers: [],
  });
  return { expensePackagePDA };
}

async function approveExpensePackage(
  program: Program<Slide>,
  user: anchor.web3.PublicKey,
  nonce: number,
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
  await program.rpc.approveExpensePackage(
    user,
    nonce,
    managerName,
    managerBump,
    packageBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
        authority: user,
      },
      signers: [],
    }
  );
  return { expensePackagePDA };
}

async function denyExpensePackage(
  program: Program<Slide>,
  user: anchor.web3.PublicKey,
  nonce: number,
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
  await program.rpc.denyExpensePackage(
    user,
    nonce,
    managerName,
    managerBump,
    packageBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
        authority: user,
      },
      signers: [],
    }
  );
  return { expensePackagePDA };
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
    const { authority, expenseManagerPDA } = await createExpenseManager(
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
    const { authority, expenseManagerPDA } = await createExpenseManager(
      program,
      "testing manager 2"
    );
    const { expensePackagePDA } = await createExpensePackage(
      program,
      1,
      authority.publicKey,
      "testing manager 2"
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    assert(expensePackageData.owner.equals(authority.publicKey));
    assert(expensePackageData.expenseManager.equals(expenseManagerPDA));
    expect(expensePackageData.state).to.eql({ created: {} });
    expect(expensePackageData.quantity.toNumber()).to.equal(0);
    expect(expensePackageData.tokenAuthority).to.be.null;
  });
  it("updates an expense package and retrieves correct values", async () => {
    const { authority, expenseManagerPDA } = await createExpenseManager(
      program,
      "testing manager 3"
    );
    await createExpensePackage(
      program,
      1,
      authority.publicKey,
      "testing manager 3"
    );
    const tokenAuthority = anchor.web3.Keypair.generate();
    const { expensePackagePDA } = await updateExpensePackage(
      program,
      authority.publicKey,
      "mypackage",
      "this is an expense package",
      new BN("1000", 10),
      tokenAuthority.publicKey,
      expenseManagerPDA,
      1
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.name).to.equal("mypackage");
    expect(expensePackageData.description).to.equal(
      "this is an expense package"
    );
    expect(expensePackageData.quantity.toNumber()).to.equal(1000);
    assert(expensePackageData.tokenAuthority.equals(tokenAuthority.publicKey));
  });
  it("submits an expense package and retrieves correctly updated state", async () => {
    const { authority, expenseManagerPDA } = await createExpenseManager(
      program,
      "testing manager 4"
    );
    await createExpensePackage(
      program,
      1,
      authority.publicKey,
      "testing manager 4"
    );
    const { expensePackagePDA } = await submitExpensePackage(
      program,
      authority.publicKey,
      expenseManagerPDA,
      1
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.state).to.eql({ pending: {} });
  });
  it("approves an expense package and retrieves correctly updated state", async () => {
    const { authority, expenseManagerPDA } = await createExpenseManager(
      program,
      "testing manager 5"
    );
    const { expensePackagePDA } = await createExpensePackage(
      program,
      1,
      authority.publicKey,
      "testing manager 5"
    );
    await submitExpensePackage(
      program,
      authority.publicKey,
      expenseManagerPDA,
      1
    );
    await approveExpensePackage(
      program,
      authority.publicKey,
      1,
      "testing manager 5"
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.state).to.eql({ approved: {} });
  });
  it("denies an expense package and retrieves correctly updated state", async () => {
    const { authority, expenseManagerPDA } = await createExpenseManager(
      program,
      "testing manager 6"
    );
    const { expensePackagePDA } = await createExpensePackage(
      program,
      1,
      authority.publicKey,
      "testing manager 6"
    );
    await submitExpensePackage(
      program,
      authority.publicKey,
      expenseManagerPDA,
      1
    );
    await denyExpensePackage(
      program,
      authority.publicKey,
      1,
      "testing manager 6"
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.state).to.eql({ denied: {} });
  });
});
