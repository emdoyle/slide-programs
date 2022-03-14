import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import {
  AddMembersToSquadArgs,
  SquadsInstruction,
  SquadsSchema,
} from "./instruction";
import { getMintOwnerAddressAndBump } from "./address";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@solana/spl-governance";
import { getMemberEquityAddressAndBump } from "../utils";

export const withAddMembersToSquad = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  initializer: PublicKey,
  squad: PublicKey,
  allocations: [PublicKey, BN][]
) => {
  const args = new AddMembersToSquadArgs({
    allocationTable: allocations.map(([, amount]) => amount),
  });
  // TODO: get safer about allocating this buffer
  const numAllocationBytes = 8 * allocations.length;
  const data = Buffer.alloc(10 + numAllocationBytes);
  SquadsSchema.get(SquadsInstruction.AddMembersToSquad).encode(args, data);

  const [mintOwner] = await getMintOwnerAddressAndBump(squad);

  const keys = [
    {
      pubkey: initializer,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: squad,
      isWritable: false,
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
  allocations.forEach(([member]) => {
    const [memberEquityRecord] = getMemberEquityAddressAndBump(member, squad);
    keys.push({
      pubkey: member,
      isWritable: false,
      isSigner: false,
    });
    keys.push({
      pubkey: memberEquityRecord,
      isWritable: true,
      isSigner: false,
    });
  });

  instructions.push(
    new TransactionInstruction({
      keys,
      programId,
      data,
    })
  );
};
