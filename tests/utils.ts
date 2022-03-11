import { BN, Program } from "@project-serum/anchor";
import { Wallet } from "@project-serum/anchor/src/provider";
import {
  AccountInfo,
  Keypair,
  PublicKey,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Transaction,
} from "@solana/web3.js";
import { Slide } from "../target/types/slide";

import * as anchor from "@project-serum/anchor";

export const IS_MAINNET =
  process.env.ANCHOR_PROVIDER_URL == clusterApiUrl("mainnet-beta");

export const SPL_GOV_PROGRAM_ID = new PublicKey(
  "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"
);
// devnet
// export const SQUADS_PROGRAM_ID = new PublicKey(
//   "SQDSm7ifFqwmgxY5aL59BtHcBGHEgbg5thh4Y9ytdn3"
// );

// mainnet
export const SQUADS_PROGRAM_ID = new PublicKey(
  "SQUADSxWKud1RVxuhJzNcqYqu7F3GLNiktGzjnNtriT"
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

export async function getFundedAccount(
  program: Program<Slide>
): Promise<Keypair> {
  if (IS_MAINNET) {
    return await getFundedAccountFromProgramWallet(program);
  }
  const account = anchor.web3.Keypair.generate();
  const signature = await program.provider.connection.requestAirdrop(
    account.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await program.provider.connection.confirmTransaction(signature);
  return account;
}

export function setWritable(
  instructions: TransactionInstruction[],
  account: PublicKey
) {
  // TODO: dirty hack until payer is marked writable correctly by SDK
  instructions.forEach((instruction) =>
    instruction.keys.forEach((keyObj) => {
      if (keyObj.pubkey.equals(account)) {
        keyObj.isWritable = true;
      }
    })
  );
}

export function addAccountAsSigner(
  instruction: TransactionInstruction,
  account: PublicKey,
  writable: boolean = false
) {
  instruction.keys.push({
    pubkey: account,
    isWritable: writable,
    isSigner: true,
  });
}

export async function flushInstructions(
  program: Program<Slide>,
  instructions: TransactionInstruction[],
  keypairs: Payer[]
) {
  const txn = new Transaction();
  txn.add(...instructions);
  return await program.provider.send(txn, signers(program, keypairs));
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

export function getExpensePackageAddressAndBump(
  expenseManagerPDA: PublicKey,
  owner: PublicKey,
  nonce: number,
  programId: PublicKey
): [PublicKey, number] {
  let nonceBuf = Buffer.allocUnsafe(4);
  nonceBuf.writeInt32LE(nonce);
  return anchor.utils.publicKey.findProgramAddressSync(
    [
      Buffer.from("expense-package"),
      expenseManagerPDA.toBuffer(),
      owner.toBuffer(),
      nonceBuf,
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

export function getGovernanceAddressAndBump(
  realm: PublicKey,
  governedAccount: PublicKey
) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [
      Buffer.from("account-governance"),
      realm.toBuffer(),
      governedAccount.toBuffer(),
    ],
    SPL_GOV_PROGRAM_ID
  );
}

export function getNativeTreasuryAddressAndBump(governance: PublicKey) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("native-treasury"), governance.toBuffer()],
    SPL_GOV_PROGRAM_ID
  );
}

export function getAccessRecordAddressAndBump(
  programId: PublicKey,
  expenseManager: PublicKey,
  user: PublicKey
) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [Buffer.from("access-record"), expenseManager.toBuffer(), user.toBuffer()],
    programId
  );
}

export function getMemberEquityAddressAndBump(
  member: PublicKey,
  squad: PublicKey
) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [member.toBuffer(), squad.toBuffer(), Buffer.from("!memberequity")],
    SQUADS_PROGRAM_ID
  );
}

export function getSquadMintAddressAndBump(squad: PublicKey) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [squad.toBuffer(), Buffer.from("!squadmint")],
    SQUADS_PROGRAM_ID
  );
}
