import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { SYSTEM_PROGRAM_ID } from "@solana/spl-governance";
import {
  CreateProposalAccountArgs,
  SquadsInstruction,
  SquadsSchema,
} from "./instruction";
import { getProposalAccountAddressAndBump } from "./address";
import { SQUADS_PROGRAM_ID, toBN } from "../utils";
import { BN } from "@project-serum/anchor";

const DEFAULT_PROPOSAL_START_DELTA = 24 * 60 * 60 * 1_000; // 1 day before now
const DEFAULT_PROPOSAL_LIFETIME = 30 * 60 * 1_000; // 30 minutes

// TODO: probably want a more specific function for text proposals?
//   at least enum the proposal types tbh
export const withCreateProposalAccount = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  payer: PublicKey,
  squad: PublicKey,
  proposalNonce: number,
  proposalType: number,
  title: string,
  description: string,
  votesNum: number,
  votesLabels: string[],
  link: string = "",
  startTime?: Date,
  closeTime?: Date,
  amount?: BN,
  minimumOut?: BN
) => {
  const startTimestamp = startTime
    ? startTime.getTime()
    : Date.now() - DEFAULT_PROPOSAL_START_DELTA;
  const closeTimestamp = closeTime
    ? closeTime.getTime()
    : Date.now() + DEFAULT_PROPOSAL_LIFETIME;
  const args = new CreateProposalAccountArgs({
    proposalType,
    title,
    description,
    link,
    votesNum,
    votesLabels,
    startTimestamp: toBN(startTimestamp),
    closeTimestamp: toBN(closeTimestamp),
    amount,
    minimumOut,
  });

  let dataSize = 819;
  if (amount !== undefined) {
    dataSize += 8;
    if (minimumOut !== undefined) {
      dataSize += 8;
    }
  }
  const data = Buffer.alloc(dataSize);
  SquadsSchema.get(SquadsInstruction.CreateProposalAccount).encode(args, data);

  const [proposal] = await getProposalAccountAddressAndBump(
    squad,
    proposalNonce
  );

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
      pubkey: proposal,
      isWritable: true,
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
    {
      pubkey: SQUADS_PROGRAM_ID,
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

  return { proposal };
};
