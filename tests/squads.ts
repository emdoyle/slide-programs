import { Slide } from "../target/types/slide";
import { BN, Program } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
  getExpensePackageAddressAndBump,
  getFundedAccount,
  getMemberEquityAddressAndBump,
  getSquadMintAddressAndBump,
  signers,
  SQUADS_PROGRAM_ID,
  toBN,
} from "./utils";
import * as anchor from "@project-serum/anchor";
import { createExpenseManager } from "./program_rpc";
import { assert, expect } from "chai";
import { withAddMembersToSquad, withCreateSquad } from "./squads_sdk";

async function setupSquad(
  program: Program<Slide>,
  user: Keypair,
  name?: string
) {
  let instructions = [];
  const { squad, mintOwner } = await withCreateSquad(
    instructions,
    SQUADS_PROGRAM_ID,
    user.publicKey,
    name ?? "my squad",
    "it's cool",
    "SLIDE",
    90,
    40
  );
  await withAddMembersToSquad(
    instructions,
    SQUADS_PROGRAM_ID,
    user.publicKey,
    squad,
    [[user.publicKey, new BN(100_000)]]
  );

  const txn = new Transaction();
  txn.add(...instructions);
  await program.provider.send(txn, signers(program, [user]));

  return { squad, mintOwner };
}

type SquadsSharedData = {
  user?: Keypair;
  squad?: PublicKey;
  squadMint?: PublicKey;
  memberEquityRecord?: PublicKey;
  expenseManager?: PublicKey;
  accessRecord?: PublicKey;
  expensePackage?: PublicKey;
  packageNonce?: number;
};

describe("slide Squads integration tests", () => {
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Slide as Program<Slide>;
  const managerName = "SQUADSINTEGRATIONTESTMANAGER";
  const packageName = "SQUADSINTEGRATIONTESTPACKAGE";
  const packageDescription = "SQUADSINTEGRATIONTESTPACKAGEDESCRIPTION";
  const packageQuantity = toBN(300_000);
  const squadName = "SQUADSINTEGRATIONTESTSQUAD";
  const sharedData: SquadsSharedData = {};

  it("sets up squad", async () => {
    const user = await getFundedAccount(program);
    const { squad } = await setupSquad(program, user, squadName);
    const [squadMint] = getSquadMintAddressAndBump(squad);
    const [memberEquityRecord] = getMemberEquityAddressAndBump(
      user.publicKey,
      squad
    );
    sharedData.user = user;
    sharedData.squad = squad;
    sharedData.squadMint = squadMint;
    sharedData.memberEquityRecord = memberEquityRecord;
  });
  it("creates and initializes an expense manager", async () => {
    const { user, squad, squadMint, memberEquityRecord } = sharedData;
    const { expenseManagerPDA: expenseManager } = await createExpenseManager(
      program,
      squadMint,
      user,
      managerName
    );
    await program.methods
      .squadsInitializeExpenseManager(managerName)
      .accounts({
        expenseManager,
        memberEquity: memberEquityRecord,
        squad,
        member: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expenseManagerData = await program.account.expenseManager.fetch(
      expenseManager
    );

    sharedData.expenseManager = expenseManager;

    assert(expenseManagerData.membershipTokenMint.equals(squadMint));
    assert(expenseManagerData.squad.equals(squad));
    expect(expenseManagerData.name).to.equal(managerName);
  });
  it("creates an expense package", async () => {
    const { user, squad, memberEquityRecord, expenseManager } = sharedData;
    const [expensePackagePDA, packageBump] = getExpensePackageAddressAndBump(
      expenseManager,
      user.publicKey,
      0,
      program.programId
    );
    await program.methods
      .squadsCreateExpensePackage(0, managerName)
      .accounts({
        expensePackage: expensePackagePDA,
        expenseManager,
        memberEquity: memberEquityRecord,
        squad,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackagePDA
    );
    const expenseManagerData = await program.account.expenseManager.fetch(
      expenseManager
    );

    sharedData.expensePackage = expensePackagePDA;
    sharedData.packageNonce = 0;

    expect(expensePackageData.bump).to.equal(packageBump);
    expect(expensePackageData.state).to.eql({ created: {} });
    expect(expenseManagerData.expensePackageNonce).to.equal(1);
  });
  it("updates an expense package", async () => {
    const {
      user,
      squad,
      memberEquityRecord,
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .squadsUpdateExpensePackage(
        packageNonce,
        managerName,
        packageName,
        packageDescription,
        packageQuantity
      )
      .accounts({
        expensePackage,
        expenseManager,
        squad,
        memberEquity: memberEquityRecord,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    expect(expensePackageData.name).to.equal(packageName);
    expect(expensePackageData.description).to.equal(packageDescription);
    expect(expensePackageData.quantity.toString()).to.equal(
      packageQuantity.toString()
    );
  });
  it("submits an expense package", async () => {
    const {
      user,
      squad,
      memberEquityRecord,
      expenseManager,
      expensePackage,
      packageNonce,
    } = sharedData;
    await program.methods
      .squadsSubmitExpensePackage(managerName, packageNonce)
      .accounts({
        expensePackage,
        expenseManager,
        squad,
        memberEquity: memberEquityRecord,
        owner: user.publicKey,
      })
      .signers(signers(program, [user]))
      .rpc();

    const expensePackageData = await program.account.expensePackage.fetch(
      expensePackage
    );

    expect(expensePackageData.state).to.eql({ pending: {} });
  });
});
