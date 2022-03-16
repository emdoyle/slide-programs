import { BN, Program } from "@project-serum/anchor";
import { Wallet } from "@project-serum/anchor/src/provider";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";
import { Slide } from "../target/types/slide";

import * as anchor from "@project-serum/anchor";

export const IS_MAINNET =
  process.env.ANCHOR_PROVIDER_URL == clusterApiUrl("mainnet-beta");

export type Payer = Keypair | Wallet;

export function toBN(num: number) {
  return new BN(`${num}`, 10);
}

export function signers(program: Program<Slide>, keypairs: Payer[]): Keypair[] {
  // @ts-ignore
  return keypairs.filter(
    (keypair) => !keypair.publicKey.equals(program.provider.wallet.publicKey)
  );
}

export async function transfer(
  program: Program<Slide>,
  from: PublicKey,
  to: PublicKey,
  payer: Payer,
  lamports: number
) {
  let transaction = new anchor.web3.Transaction();
  transaction.add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports,
    })
  );
  await program.provider.send(transaction, signers(program, [payer]));
}

async function getFundedAccountFromProgramWallet(
  program: Program<Slide>
): Promise<Keypair> {
  const account = anchor.web3.Keypair.generate();
  const providerWallet = program.provider.wallet;
  await transfer(
    program,
    providerWallet.publicKey,
    account.publicKey,
    providerWallet,
    2 * LAMPORTS_PER_SOL
  );
  // In case 'anchor test' is run against mainnet accidentally, this puts the secret keys of
  // any funded accounts in the console...
  console.log(account.secretKey);
  return account;
}

export async function airdropToAccount(
  program: Program<Slide>,
  account: PublicKey
) {
  const signature = await program.provider.connection.requestAirdrop(
    account,
    2 * LAMPORTS_PER_SOL
  );
  await program.provider.connection.confirmTransaction(signature);
}

export async function getFundedAccount(
  program: Program<Slide>
): Promise<Keypair> {
  if (IS_MAINNET) {
    return await getFundedAccountFromProgramWallet(program);
  }
  const account = anchor.web3.Keypair.generate();
  await airdropToAccount(program, account.publicKey);
  return account;
}

export function getUserDataAddressAndBump(
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("user-data"), user.toBuffer()],
    programId
  );
}

export function getExpenseManagerAddressAndBump(
  name: string,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("expense-manager"), Buffer.from(name)],
    programId
  );
}
