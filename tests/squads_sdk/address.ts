import { PublicKey } from "@solana/web3.js";
import { SQUADS_PROGRAM_ID } from "../utils";
import * as anchor from "@project-serum/anchor";

export async function getSquadAddressAndBump(
  admin: PublicKey,
  randomId: string
) {
  return await PublicKey.findProgramAddress(
    [admin.toBuffer(), Buffer.from(randomId), Buffer.from("!squad")],
    SQUADS_PROGRAM_ID
  );
}

export function getMemberEquityAddressAndBumpSync(
  member: PublicKey,
  squad: PublicKey
) {
  return anchor.utils.publicKey.findProgramAddressSync(
    [member.toBuffer(), squad.toBuffer(), Buffer.from("!memberequity")],
    SQUADS_PROGRAM_ID
  );
}

export async function getMemberEquityAddressAndBump(
  member: PublicKey,
  squad: PublicKey
) {
  return await PublicKey.findProgramAddress(
    [member.toBuffer(), squad.toBuffer(), Buffer.from("!memberequity")],
    SQUADS_PROGRAM_ID
  );
}

export async function getSquadMintAddressAndBump(squad: PublicKey) {
  return await PublicKey.findProgramAddress(
    [squad.toBuffer(), Buffer.from("!squadmint")],
    SQUADS_PROGRAM_ID
  );
}

export async function getProposalAccountAddressAndBump(
  squad: PublicKey,
  nonce: number
) {
  let nonceBuf = Buffer.alloc(4);
  nonceBuf.writeInt32LE(nonce);
  return await PublicKey.findProgramAddress(
    [squad.toBuffer(), nonceBuf, Buffer.from("!proposal")],
    SQUADS_PROGRAM_ID
  );
}

export async function getVoteAccountAddressAndBump(
  proposal: PublicKey,
  member: PublicKey
) {
  return await PublicKey.findProgramAddress(
    [proposal.toBuffer(), member.toBuffer(), Buffer.from("!vote")],
    SQUADS_PROGRAM_ID
  );
}

export async function getSquadTreasuryAddressAndBump(squad: PublicKey) {
  return await PublicKey.findProgramAddress(
    [squad.toBuffer(), Buffer.from("!squadsol")],
    SQUADS_PROGRAM_ID
  );
}
