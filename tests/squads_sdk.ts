import { BN } from "@project-serum/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@solana/spl-governance";
import {
  Layout as AbstractLayout,
  Structure,
  uint8ArrayToBuffer,
} from "@solana/buffer-layout";
const Layout = require("@solana/buffer-layout");
import { SQUADS_PROGRAM_ID } from "./utils";

/*
 * NOTES:
 * - strings MUST be padded to their max length due to use of Pack in on-chain program
 */

class FixedLengthUTF8 extends AbstractLayout<string> {
  constructor(length: number, property?: string) {
    super(length, property);
  }
  /** @override */
  getSpan(b: Uint8Array, offset: number = 0): number {
    return this.span;
  }
  /** @override */
  decode(b: Uint8Array, offset: number = 0): string {
    return uint8ArrayToBuffer(b)
      .slice(offset, offset + this.span)
      .toString("utf-8");
  }
  /** @override */
  encode(src: string, b: Uint8Array, offset: number = 0): number {
    const srcb = Buffer.from(src, "utf8");
    const span = srcb.length;
    if (this.span < span) {
      throw new RangeError("text length exceeds intended span");
    }
    if (this.span + offset > b.length) {
      throw new RangeError("encoding overruns Buffer");
    }

    srcb.copy(uint8ArrayToBuffer(b), offset);
    return span;
  }
}

Layout.fixedUtf8 = (length, property) => new FixedLengthUTF8(length, property);

export enum SquadsInstruction {
  CreateSquad,
  CreateMultiSig,
  CreateProposalAccount,
  CastVote,
  CastMultisigVote,
  ExecuteProposal,
  ExecuteMultisigProposal,
  AddMembersToSquad,
}

// TODO: this most likely does not handle multi-byte ASCII chars
function ensureLength(input: string, length: number) {
  if (input.length > length) {
    return input.slice(0, length);
  }
  return input.padEnd(length);
}

export class CreateSquadArgs {
  instruction: SquadsInstruction = SquadsInstruction.CreateSquad;
  allocationType: number = 1; // TeamCoordination
  voteSupport: number; // 1-100
  voteQuorum: number; // 1-100
  coreThreshold: number = 0; // unused (1 byte)
  squadName: string; // 24 chars
  description: string; // 36 chars
  token: string; // 6 chars
  randomId: string; // 10 random ASCII chars
  constructor(args: {
    voteSupport: number;
    voteQuorum: number;
    squadName: string;
    description: string;
    token: string;
    randomId: string;
  }) {
    this.voteSupport = args.voteSupport;
    this.voteQuorum = args.voteQuorum;
    this.squadName = ensureLength(args.squadName, 24);
    this.description = ensureLength(args.description, 36);
    this.token = ensureLength(args.token, 6);
    this.randomId = ensureLength(args.randomId, 10);
  }
}

export class CreateProposalAccountArgs {
  instruction: SquadsInstruction = SquadsInstruction.CreateProposalAccount;
  proposalType: number; //TODO: proposaltype enum
  votesNum: number; // might be an enum as well?
  title: string;
  description: string;
  link: string;
  voteLabels: string[];
  startTimestamp: BN;
  closeTimestamp: BN;
  amount: BN;
  minimumOut: BN;
  constructor(args: {
    proposalType: number;
    votesNum: number;
    title: string;
    description: string;
    link: string;
    voteLabels: string[];
    startTimestamp: BN;
    closeTimestamp: BN;
    amount: BN;
    minimumOut: BN;
  }) {
    this.proposalType = args.proposalType;
    this.votesNum = args.votesNum;
    this.title = args.title;
    this.description = args.description;
    this.link = args.link;
    this.voteLabels = args.voteLabels;
    this.startTimestamp = args.startTimestamp;
    this.closeTimestamp = args.closeTimestamp;
    this.amount = args.amount;
    this.minimumOut = args.minimumOut;
  }
}

export class CastVoteArgs {
  instruction: SquadsInstruction = SquadsInstruction.CastVote;
  vote: number;
  constructor(args: { vote: number }) {
    this.vote = args.vote;
  }
}

export class ExecuteProposalArgs {
  instruction: SquadsInstruction = SquadsInstruction.ExecuteProposal;
  randomId: string;
  constructor(args: { randomId: string }) {
    this.randomId = args.randomId;
  }
}

export const SquadsSchema: Map<SquadsInstruction, Structure<any>> = new Map([
  [
    SquadsInstruction.CreateSquad,
    Layout.struct([
      Layout.u8("instruction"),
      Layout.u8("allocationType"),
      Layout.u8("voteSupport"),
      Layout.u8("voteQuorum"),
      Layout.u8("coreThreshold"),
      Layout.fixedUtf8(24, "squadName"),
      Layout.fixedUtf8(36, "description"),
      Layout.fixedUtf8(6, "token"),
      Layout.fixedUtf8(10, "randomId"),
    ]),
  ],
]);
//   [
//     CreateSquadArgs,
//     {
//       kind: "struct",
//       fields: [
//         // ["instruction", "u8"],
//         // ["allocationType", "u8"],
//         // ["voteSupport", "u8"],
//         // ["voteQuorum", "u8"],
//         // ["coreThreshold", "u8"],
//         ["squadName", "string"],
//         ["description", "string"],
//         ["token", "string"],
//         ["randomId", "string"],
//       ],
//     },
//   ],
//   [
//     CreateProposalAccountArgs,
//     {
//       kind: "struct",
//       fields: [
//         ["instruction", "u8"],
//         ["proposalType", "u8"],
//         ["votesNum", "u8"],
//         ["title", "string"],
//         ["description", "string"],
//         ["link", "string"],
//         ["voteLabels", ["string"]],
//         ["startTimestamp", "i64"],
//         ["closeTimestamp", "i64"],
//         ["amount", "u64"],
//         ["minimumOut", "u64"],
//       ],
//     },
//   ],
//   [
//     CastVoteArgs,
//     {
//       kind: "struct",
//       fields: [
//         ["instruction", "u8"],
//         ["vote", "u8"],
//       ],
//     },
//   ],
//   [
//     ExecuteProposalArgs,
//     {
//       kind: "struct",
//       fields: [
//         ["instruction", "u8"],
//         ["randomId", "string"],
//       ],
//     },
//   ],
// ]);

function getRandomId() {
  // generate a random number -> convert to alphanumeric (base 36) -> append 10 zeroes
  // slice from past floating point ('0.') until 10 characters later
  // ==> random 10 alphanumeric characters
  // ref: https://stackoverflow.com/a/19964557
  return (Math.random().toString(36) + "0000000000").slice(2, 12);
}

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

  const [squad] = await getSquadAddressWithSeed(payer, randomId);
  const [mintOwner] = await getMintOwnerAddressWithSeed(squad);

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

  return { squad };
};
