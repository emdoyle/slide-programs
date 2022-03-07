import { BN, Program } from "@project-serum/anchor";
import { Wallet } from "@project-serum/anchor/src/provider";
import { AccountInfo, Keypair, PublicKey } from "@solana/web3.js";
import { Slide } from "../target/types/slide";

import * as anchor from "@project-serum/anchor";

export const IS_LOCAL = process.env.ANCHOR_PROVIDER_URL.includes("localhost");
export const DEFAULT_FUNDING_PER_TEST = IS_LOCAL ? 5_000_000_000 : 500_000_000;

export const SPL_GOV_PROGRAM_ID = new PublicKey(
  "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"
);
export const SQUADS_PROGRAM_ID = new PublicKey(
  "SQDSm7ifFqwmgxY5aL59BtHcBGHEgbg5thh4Y9ytdn3"
);

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

export async function getBalanceSum(
  program,
  addresses: PublicKey[]
): Promise<BN> {
  let sum = new BN("0", 10);
  let current;
  for (let i = 0; i < addresses.length; i++) {
    current = toBN(await getBalance(program, addresses[i]));
    sum = sum.add(current);
  }
  return sum;
}

export async function getAccountInfo(
  program: Program<Slide>,
  account: PublicKey
) {
  return await program.provider.connection.getAccountInfo(account);
}

export async function getBalance(program: Program<Slide>, account: PublicKey) {
  return await program.provider.connection.getBalance(account);
}

export async function getRentExemptBalance(
  program: Program<Slide>,
  accountInfo: AccountInfo<Buffer>
) {
  return await program.provider.connection.getMinimumBalanceForRentExemption(
    accountInfo.data.byteLength
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

export async function getFundedAccount(
  program: Program<Slide>,
  quantity?: number
): Promise<Keypair> {
  const account = anchor.web3.Keypair.generate();
  const providerWallet = program.provider.wallet;
  await transfer(
    program,
    providerWallet.publicKey,
    account.publicKey,
    providerWallet,
    quantity ?? DEFAULT_FUNDING_PER_TEST
  );
  return account;
}

export function getUserDataAddressAndBump(
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("user_data"), user.toBuffer()],
    programId
  );
}

export function getExpenseManagerAddressAndBump(
  name: string,
  programId: PublicKey
): [PublicKey, number] {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("expense_manager"), Buffer.from(name)],
    programId
  );
}

export function getExpensePackageAddressAndBump(
  expenseManagerPDA: PublicKey,
  owner: PublicKey,
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

export function getTokenOwnerRecordAddressAndBump(
  realm: PublicKey,
  mint: PublicKey,
  member: PublicKey
) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [
      Buffer.from("governance"),
      realm.toBuffer(),
      mint.toBuffer(),
      member.toBuffer(),
    ],
    SPL_GOV_PROGRAM_ID
  );
}
