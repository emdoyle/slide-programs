import { PublicKey } from "@solana/web3.js";
import { SQUADS_PROGRAM_ID } from "../utils";

export async function getSquadAddressAndBump(
  admin: PublicKey,
  randomId: string
) {
  return await PublicKey.findProgramAddress(
    [admin.toBuffer(), Buffer.from(randomId), Buffer.from("!squad")],
    SQUADS_PROGRAM_ID
  );
}

export async function getMintOwnerAddressAndBump(squad: PublicKey) {
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
