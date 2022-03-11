import { PublicKey } from "@solana/web3.js";
import { SQUADS_PROGRAM_ID } from "../utils";

export async function getSquadAddressWithSeed(
  admin: PublicKey,
  randomId: string
) {
  return await PublicKey.findProgramAddress(
    [admin.toBuffer(), Buffer.from(randomId), Buffer.from("!squad")],
    SQUADS_PROGRAM_ID
  );
}

export async function getMintOwnerAddressWithSeed(squad: PublicKey) {
  return await PublicKey.findProgramAddress(
    [squad.toBuffer(), Buffer.from("!squadmint")],
    SQUADS_PROGRAM_ID
  );
}
