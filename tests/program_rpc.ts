import { Slide } from "../target/types/slide";
import { Program } from "@project-serum/anchor";
import {
  getExpenseManagerAddressAndBump,
  getUserDataAddressAndBump,
  Payer,
  signers,
} from "./utils";
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export async function initializeUser(
  program: Program<Slide>,
  user: Payer,
  username: string,
  realName: string
) {
  const [userDataPDA] = getUserDataAddressAndBump(
    user.publicKey,
    program.programId
  );
  await program.rpc.initializeUser(username, realName, {
    accounts: {
      userData: userDataPDA,
      user: user.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: signers(program, [user]),
  });
  return { userDataPDA };
}

export async function createExpenseManager(
  program: Program<Slide>,
  membership_token_mint: PublicKey,
  payer: Payer,
  name: string
) {
  const [expenseManagerPDA] = getExpenseManagerAddressAndBump(
    name,
    program.programId
  );
  await program.rpc.createExpenseManager(name, membership_token_mint, {
    accounts: {
      expenseManager: expenseManagerPDA,
      payer: payer.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: signers(program, [payer]),
  });
  return {
    expenseManagerPDA,
  };
}
