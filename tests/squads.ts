import { Slide } from "../target/types/slide";
import { BN, Program } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import {
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

    assert(expenseManagerData.membershipTokenMint.equals(squadMint));
    assert(expenseManagerData.squad.equals(squad));
    expect(expenseManagerData.name).to.equal(managerName);
  });
});
