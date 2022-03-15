import { BN } from "@project-serum/anchor";
import {
  Layout as AbstractLayout,
  OffsetLayout,
  Structure,
  uint8ArrayToBuffer,
} from "@solana/buffer-layout";
const Layout = require("@solana/buffer-layout");

/*
 * NOTES:
 * - strings MUST be padded to their max length due to use of Pack in on-chain program
 */

class FixedLengthUTF8 extends AbstractLayout<string> {
  constructor(length: number, property?: string) {
    super(length, property);
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
      throw new RangeError(
        `encoding overruns Buffer (${
          this.property ?? "(unnamed)"
        }: FixedLengthUTF8)`
      );
    }

    srcb.copy(uint8ArrayToBuffer(b), offset);
    return span;
  }
}

Layout.fixedUtf8 = (length, property?) => new FixedLengthUTF8(length, property);

class U64 extends AbstractLayout<BN> {
  constructor(property?: string) {
    super(8, property);
  }
  /** @override */
  decode(b: Uint8Array, offset: number = 0): BN {
    const buffer = uint8ArrayToBuffer(b);
    return new BN(buffer.slice(offset, offset + 8), "le");
  }
  /** @override */
  encode(src: BN, b: Uint8Array, offset: number = 0): number {
    if (src.isNeg()) {
      throw new RangeError(
        `BN with negative value ${src.toString()} cannot be encoded as u64`
      );
    }
    if (this.span + offset > b.length) {
      throw new RangeError(
        `encoding overruns Buffer (${this.property ?? "(unnamed)"}: U64)`
      );
    }
    const srcb = src.toBuffer("le", 8);
    srcb.copy(uint8ArrayToBuffer(b), offset);
    return 8;
  }
}

Layout.u64 = (property?) => new U64(property);

class I64 extends AbstractLayout<BN> {
  constructor(property?: string) {
    super(8, property);
  }
  /** @override */
  decode(b: Uint8Array, offset: number = 0): BN {
    const buffer = uint8ArrayToBuffer(b);
    return new BN(buffer.slice(offset, offset + 8), "le").fromTwos(64);
  }
  /** @override */
  encode(src: BN, b: Uint8Array, offset: number = 0): number {
    if (this.span + offset > b.length) {
      throw new RangeError(
        `encoding overruns Buffer (${this.property ?? "(unnamed)"}: I64)`
      );
    }
    const srcb = src.toTwos(64).toBuffer("le", 8);
    srcb.copy(uint8ArrayToBuffer(b), offset);
    return 8;
  }
}

Layout.i64 = (property?) => new I64(property);

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

export class AddMembersToSquadArgs {
  instruction: SquadsInstruction = SquadsInstruction.AddMembersToSquad;
  membersNum: number; // 1 byte
  allocationTable: BN[]; // u64[]
  constructor(args: { allocationTable: BN[] }) {
    this.membersNum = args.allocationTable.length;
    this.allocationTable = args.allocationTable;
  }
}

export class CreateProposalAccountArgs {
  instruction: SquadsInstruction = SquadsInstruction.CreateProposalAccount;
  proposalType: number; // 1 byte
  title: string; // 36 chars
  description: string; // 496 chars
  link: string; // 48 chars
  votesNum: number; // 1 byte
  votesLabels: string[]; // 220 total bytes (5 * 44)
  startTimestamp: BN; // i64
  closeTimestamp: BN; // i64
  amount: BN; // OPTIONAL u64 (only needed for certain proposal types)
  minimumOut: BN; // OPTIONAL u64 (only needed for certain proposal types)
  constructor(args: {
    proposalType: number;
    title: string;
    description: string;
    link: string;
    votesNum: number;
    votesLabels: string[];
    startTimestamp: BN;
    closeTimestamp: BN;
    amount?: BN;
    minimumOut?: BN;
  }) {
    // TODO: more validation
    if (args.votesLabels.length > 5) {
      throw new RangeError("Cannot set more than 5 votesLabels");
    }
    this.proposalType = args.proposalType;
    this.title = ensureLength(args.title, 36);
    this.description = ensureLength(args.description, 496);
    this.link = ensureLength(args.link, 48);
    this.votesNum = args.votesNum;
    this.votesLabels = args.votesLabels.map((label) => ensureLength(label, 44));
    // JS timestamps are in milliseconds, Solana cluster timestamp is in seconds
    this.startTimestamp = args.startTimestamp.div(new BN(1_000));
    this.closeTimestamp = args.closeTimestamp.div(new BN(1_000));
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
    this.randomId = ensureLength(args.randomId, 10);
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
  [
    SquadsInstruction.AddMembersToSquad,
    Layout.struct([
      Layout.u8("instruction"),
      Layout.u8("membersNum"),
      Layout.u64(), // ignored
      Layout.seq(
        Layout.u64(),
        new OffsetLayout(Layout.u8(), -9),
        "allocationTable"
      ),
    ]),
  ],
  [
    SquadsInstruction.CreateProposalAccount,
    Layout.struct(
      [
        Layout.u8("instruction"),
        Layout.u8("proposalType"),
        Layout.fixedUtf8(36, "title"),
        Layout.fixedUtf8(496, "description"),
        Layout.fixedUtf8(48, "link"),
        Layout.u8("votesNum"),
        Layout.seq(Layout.fixedUtf8(44), 5, "votesLabels"),
        Layout.i64("startTimestamp"),
        Layout.i64("closeTimestamp"),
        Layout.u64("amount"), // optional
        Layout.u64("minimumOut"), // optional
      ],
      undefined,
      true
    ),
  ],
  [
    SquadsInstruction.CastVote,
    Layout.struct([Layout.u8("instruction"), Layout.u8("vote")]),
  ],
  [
    SquadsInstruction.ExecuteProposal,
    Layout.struct([Layout.u8("instruction"), Layout.fixedUtf8(10, "randomId")]),
  ],
]);
