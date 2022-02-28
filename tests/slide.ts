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
  authority: Payer,
  name: string
) {
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
    signers: signers(program, [authority]),
  });
  return {
    expenseManagerPDA,
  };
}

async function createExpensePackage(
  program: Program<Slide>,
  user: Payer,
  nonce: number,
  managerName: string
) {
  const [expenseManagerPDA, managerBump] = getExpenseManagerAddressAndBump(
    managerName,
    program.programId
  );
  const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user.publicKey,
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
        owner: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: signers(program, [user]),
    }
  );
  return {
    expensePackagePDA,
  };
}

async function updateExpensePackage(
  program: Program<Slide>,
  user: Payer,
  name: string,
  description: string,
  quantity: number,
  tokenAuthority: PublicKey | null,
  expenseManagerPDA: PublicKey,
  nonce: number
) {
  const quantityBN = toBN(quantity);
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user.publicKey,
    nonce,
    program.programId
  );
  await program.rpc.updateExpensePackage(
    name,
    description,
    quantityBN,
    tokenAuthority,
    expenseManagerPDA,
    nonce,
    bump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        owner: user.publicKey,
      },
      signers: signers(program, [user]),
    }
  );
  return { expensePackagePDA };
}

async function submitExpensePackage(
  program: Program<Slide>,
  user: Payer,
  expenseManagerPDA: PublicKey,
  nonce: number
) {
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user.publicKey,
    nonce,
    program.programId
  );
  await program.rpc.submitExpensePackage(expenseManagerPDA, nonce, bump, {
    accounts: {
      expensePackage: expensePackagePDA,
      owner: user.publicKey,
    },
    signers: signers(program, [user]),
  });
  return { expensePackagePDA };
}

async function approveExpensePackage(
  program: Program<Slide>,
  user: Payer,
  nonce: number,
  managerName: string
) {
  const [expenseManagerPDA, managerBump] = getExpenseManagerAddressAndBump(
    managerName,
    program.programId
  );
  const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user.publicKey,
    nonce,
    program.programId
  );
  await program.rpc.approveExpensePackage(
    user.publicKey,
    nonce,
    managerName,
    managerBump,
    packageBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
        authority: user.publicKey,
      },
      signers: signers(program, [user]),
    }
  );
  return { expensePackagePDA };
}

async function denyExpensePackage(
  program: Program<Slide>,
  user: Payer,
  nonce: number,
  managerName: string
) {
  const [expenseManagerPDA, managerBump] = getExpenseManagerAddressAndBump(
    managerName,
    program.programId
  );
  const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user.publicKey,
    nonce,
    program.programId
  );
  await program.rpc.denyExpensePackage(
    user.publicKey,
    nonce,
    managerName,
    managerBump,
    packageBump,
    {
      accounts: {
        expensePackage: expensePackagePDA,
        expenseManager: expenseManagerPDA,
        authority: user.publicKey,
      },
      signers: signers(program, [user]),
    }
  );
  return { expensePackagePDA };
}

async function withdrawFromExpensePackage(
  program: Program<Slide>,
  user: Payer,
  nonce: number,
  expenseManagerPDA
) {
  const [expensePackagePDA, bump] = getExpensePackageAddressAndBump(
    expenseManagerPDA,
    user.publicKey,
    nonce,
    program.programId
  );
  await program.rpc.withdrawFromExpensePackage(expenseManagerPDA, nonce, bump, {
    accounts: {
      expensePackage: expensePackagePDA,
      owner: user.publicKey,
    },
    signers: signers(program, [user]),
  });
  return { expensePackagePDA };
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
    expect(userData.accountType).to.eql({ userData: {} });
  });
  it("creates expense manager with correct initial values", async () => {
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
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
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
      "testing manager 2"
    );
    const { expensePackagePDA } = await createExpensePackage(
      program,
      authority,
      1,
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
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
      "testing manager 3"
    );
    await createExpensePackage(program, authority, 1, "testing manager 3");
    const tokenAuthority = await getFundedAccount(program);
    const { expensePackagePDA } = await updateExpensePackage(
      program,
      authority,
      "mypackage",
      "this is an expense package",
      1000,
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
    assert(expensePackageData.tokenAuthority !== null);
    // @ts-ignore
    assert(expensePackageData.tokenAuthority.equals(tokenAuthority.publicKey));
  });
  it("submits an expense package and retrieves correctly updated state", async () => {
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
      "testing manager 4"
    );
    await createExpensePackage(program, authority, 1, "testing manager 4");
    const { expensePackagePDA } = await submitExpensePackage(
      program,
      authority,
      expenseManagerPDA,
      1
    );
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.state).to.eql({ pending: {} });
  });
  it("approves an expense package and retrieves correctly updated state", async () => {
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
      "testing manager 5"
    );
    const { expensePackagePDA } = await createExpensePackage(
      program,
      authority,
      1,
      "testing manager 5"
    );
    await submitExpensePackage(program, authority, expenseManagerPDA, 1);
    await approveExpensePackage(program, authority, 1, "testing manager 5");
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.state).to.eql({ approved: {} });
  });
  it("denies an expense package and retrieves correctly updated state", async () => {
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
      "testing manager 6"
    );
    const { expensePackagePDA } = await createExpensePackage(
      program,
      authority,
      1,
      "testing manager 6"
    );
    await submitExpensePackage(program, authority, expenseManagerPDA, 1);
    await denyExpensePackage(program, authority, 1, "testing manager 6");
    let expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    expect(expensePackageData.state).to.eql({ denied: {} });
  });
  it("creates, submits, and approves an expense package and withdraws funds", async () => {
    const expenseAmount = 10000;
    const authority = await getFundedAccount(program);
    const { expenseManagerPDA } = await createExpenseManager(
      program,
      authority,
      "testing manager 7"
    );
    await transfer(
      program,
      authority.publicKey,
      expenseManagerPDA,
      authority,
      expenseAmount * 2
    );
    await createExpensePackage(program, authority, 1, "testing manager 7");
    await updateExpensePackage(
      program,
      authority,
      "mypackage",
      "this is an expense package",
      expenseAmount,
      null,
      expenseManagerPDA,
      1
    );
    const { expensePackagePDA } = await submitExpensePackage(
      program,
      authority,
      expenseManagerPDA,
      1
    );
    const managerBalanceBeforeApproval = await getBalance(
      program,
      expenseManagerPDA
    );
    const packageBalanceBeforeApproval = await getBalance(
      program,
      expensePackagePDA
    );
    await approveExpensePackage(program, authority, 1, "testing manager 7");
    const managerBalanceAfterApproval = await getBalance(
      program,
      expenseManagerPDA
    );
    const packageBalanceAfterApproval = await getBalance(
      program,
      expensePackagePDA
    );
    expect(packageBalanceAfterApproval - packageBalanceBeforeApproval).to.equal(
      expenseAmount
    );
    expect(managerBalanceBeforeApproval - managerBalanceAfterApproval).to.equal(
      expenseAmount
    );
    const packageBalanceBeforeWithdrawal = await getBalance(
      program,
      expensePackagePDA
    );
    const userBalanceBeforeWithdrawal = await getBalance(
      program,
      authority.publicKey
    );
    await withdrawFromExpensePackage(program, authority, 1, expenseManagerPDA);

    const packageBalanceAfterWithdrawal = await getBalance(
      program,
      expensePackagePDA
    );
    const userBalanceAfterWithdrawal = await getBalance(
      program,
      authority.publicKey
    );
    expect(
      packageBalanceBeforeWithdrawal - packageBalanceAfterWithdrawal
    ).to.equal(expenseAmount);
    expect(userBalanceAfterWithdrawal - userBalanceBeforeWithdrawal).to.equal(
      expenseAmount
    );
  });
});
