import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { CastVoteArgs, SquadsInstruction, SquadsSchema } from "./instruction";
import {
  getMemberEquityAddressAndBump,
  getSquadMintAddressAndBump,
  getVoteAccountAddressAndBump,
} from "./address";
import { SYSTEM_PROGRAM_ID } from "@solana/spl-governance";
import { SQUADS_PROGRAM_ID } from "../utils";

export const withCastVote = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  payer: PublicKey,
  squad: PublicKey,
  proposal: PublicKey,
  vote: number
) => {
  const args = new CastVoteArgs({
    vote,
  });
  const data = Buffer.alloc(2);
  SquadsSchema.get(SquadsInstruction.CastVote).encode(args, data);

  const [squadMint] = await getSquadMintAddressAndBump(squad);
  const [memberEquityRecord] = await getMemberEquityAddressAndBump(
    payer,
    squad
  );
  const [voteAccount] = await getVoteAccountAddressAndBump(proposal, payer);

  const keys = [
    { pubkey: payer, isWritable: true, isSigner: true },
    { pubkey: squad, isWritable: true, isSigner: false },
    { pubkey: squadMint, isWritable: false, isSigner: false },
    { pubkey: proposal, isWritable: true, isSigner: false },
    { pubkey: memberEquityRecord, isWritable: false, isSigner: false },
    { pubkey: voteAccount, isWritable: true, isSigner: false },
    { pubkey: SYSTEM_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
    { pubkey: SQUADS_PROGRAM_ID, isWritable: false, isSigner: false },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId,
      data,
    })
  );

  return { voteAccount };
};
