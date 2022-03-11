import { Slide } from "../target/types/slide";
import { Program } from "@project-serum/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  addAccountAsSigner,
  flushInstructions,
  getAccessRecordAddressAndBump,
  getExpensePackageAddressAndBump,
  getFundedAccount,
  signers,
  SQUADS_PROGRAM_ID,
  toBN,
} from "./utils";
import * as anchor from "@project-serum/anchor";
import { createExpenseManager } from "./program_rpc";
import { assert, expect } from "chai";
import { withCreateSquad } from "./squads_sdk";

async function setupSquad(
  program: Program<Slide>,
  user: Keypair,
  name?: string
) {
  let instructions = [];
  const { squad } = await withCreateSquad(
    instructions,
    SQUADS_PROGRAM_ID,
    user.publicKey,
    name ?? "my squad",
    "it's cool",
    "SLIDE",
    90,
    40
  );

  const txn = new Transaction();
  txn.add(...instructions);
  await program.provider.send(txn, signers(program, [user]));

  return { squad };
}

type SquadsSharedData = {
  user?: Keypair;
  squad?: PublicKey;
  squadBump?: number;
  squadMint?: PublicKey;
  mintBump?: number;
  memberEquityRecord?: PublicKey;
  equityBump?: number;
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
    await setupSquad(program, user, squadName);
    sharedData.user = user;
  });
  // it("creates and initializes an expense manager", async () => {
  //   const { user } = sharedData;
  // });
});
