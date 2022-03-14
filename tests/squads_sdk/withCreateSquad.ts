import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@solana/spl-governance";
import {
  CreateSquadArgs,
  SquadsInstruction,
  SquadsSchema,
} from "./instruction";
import { getMintOwnerAddressAndBump, getSquadAddressAndBump } from "./address";

function getRandomId() {
  // generate a random number -> convert to alphanumeric (base 36) -> append 10 zeroes (trailing zeroes were truncated)
  // slice from past floating point ('0.') until 10 characters later
  // ==> random 10 alphanumeric characters
  // ref: https://stackoverflow.com/a/19964557
  return (Math.random().toString(36) + "0000000000").slice(2, 12);
}

export const withCreateSquad = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  payer: PublicKey,
  squadName: string,
  description: string,
  token: string,
  voteSupport: number,
  voteQuorum: number
) => {
  const randomId = getRandomId();
  const args = new CreateSquadArgs({
    voteSupport,
    voteQuorum,
    squadName,
    description,
    token,
    randomId,
  });
  const data = Buffer.alloc(81);
  SquadsSchema.get(SquadsInstruction.CreateSquad).encode(args, data);

  const [squad] = await getSquadAddressAndBump(payer, randomId);
  const [mintOwner] = await getMintOwnerAddressAndBump(squad);

  const keys = [
    {
      pubkey: payer,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: squad,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: mintOwner,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SYSTEM_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId,
      data,
    })
  );

  return { squad, mintOwner };
};
