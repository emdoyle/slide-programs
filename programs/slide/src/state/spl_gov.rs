// need:
//  - Proposal
//  - TokenOwnerRecord

use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use std::ops::Deref;
use std::str::FromStr;

// TODO: why do I need to 'use' FromStr if Pubkey already implements FromStr?
pub const SPL_GOV_PROGRAM_ID: &str = "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw";

/// Defines all Governance accounts types
#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub enum GovernanceAccountType {
    /// Default uninitialized account state
    Uninitialized,

    /// Top level aggregation for governances with Community Token (and optional Council Token)
    RealmV1,

    /// Token Owner Record for given governing token owner within a Realm
    TokenOwnerRecordV1,

    /// Governance account
    GovernanceV1,

    /// Program Governance account
    ProgramGovernanceV1,

    /// Proposal account for Governance account. A single Governance account can have multiple Proposal accounts
    ProposalV1,

    /// Proposal Signatory account
    SignatoryRecordV1,

    /// Vote record account for a given Proposal.  Proposal can have 0..n voting records
    VoteRecordV1,

    /// ProposalInstruction account which holds an instruction to execute for Proposal
    ProposalInstructionV1,

    /// Mint Governance account
    MintGovernanceV1,

    /// Token Governance account
    TokenGovernanceV1,

    /// Realm config account (introduced in V2)
    RealmConfig,

    /// Vote record account for a given Proposal.  Proposal can have 0..n voting records
    /// V2 adds support for multi option votes
    VoteRecordV2,

    /// ProposalTransaction account which holds instructions to execute for Proposal within a single Transaction
    /// V2 replaces ProposalInstruction and adds index for proposal option and multiple instructions
    ProposalTransactionV2,

    /// Proposal account for Governance account. A single Governance account can have multiple Proposal accounts
    /// V2 adds support for multiple vote options
    ProposalV2,

    /// Program metadata account (introduced in V2)
    /// It stores information about the particular SPL-Governance program instance
    ProgramMetadata,

    /// Top level aggregation for governances with Community Token (and optional Council Token)
    /// V2 adds the following fields:
    /// 1) use_community_voter_weight_addin and use_max_community_voter_weight_addin to RealmConfig
    /// 2) voting_proposal_count
    /// 3) extra reserved space reserved_v2
    RealmV2,

    /// Token Owner Record for given governing token owner within a Realm
    /// V2 adds extra reserved space reserved_v2
    TokenOwnerRecordV2,

    /// Governance account
    /// V2 adds extra reserved space reserved_v2
    GovernanceV2,

    /// Program Governance account
    /// V2 adds extra reserved space reserved_v2
    ProgramGovernanceV2,

    /// Mint Governance account
    /// V2 adds extra reserved space reserved_v2
    MintGovernanceV2,

    /// Token Governance account
    /// V2 adds extra reserved space reserved_v2
    TokenGovernanceV2,

    /// Proposal Signatory account
    /// V2 adds extra reserved space reserved_v2
    SignatoryRecordV2,
}

impl Default for GovernanceAccountType {
    fn default() -> Self {
        GovernanceAccountType::Uninitialized
    }
}

/// copied from solana-program-library/governance/src/state/token_owner_record.rs
/// Governance Token Owner Record
/// Account PDA seeds: ['governance', realm, token_mint, token_owner ]
#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshDeserialize, BorshSerialize, BorshSchema)]
pub struct TokenOwnerRecordV2 {
    /// Governance account type
    pub account_type: GovernanceAccountType,

    /// The Realm the TokenOwnerRecord belongs to
    pub realm: Pubkey,

    /// Governing Token Mint the TokenOwnerRecord holds deposit for
    pub governing_token_mint: Pubkey,

    /// The owner (either single or multisig) of the deposited governing SPL Tokens
    /// This is who can authorize a withdrawal of the tokens
    pub governing_token_owner: Pubkey,

    /// The amount of governing tokens deposited into the Realm
    /// This amount is the voter weight used when voting on proposals
    pub governing_token_deposit_amount: u64,

    /// The number of votes cast by TokenOwner but not relinquished yet
    /// Every time a vote is cast this number is increased and it's always decreased when relinquishing a vote regardless of the vote state
    pub unrelinquished_votes_count: u32,

    /// The total number of votes cast by the TokenOwner
    /// If TokenOwner withdraws vote while voting is still in progress total_votes_count is decreased  and the vote doesn't count towards the total
    pub total_votes_count: u32,

    /// The number of outstanding proposals the TokenOwner currently owns
    /// The count is increased when TokenOwner creates a proposal
    /// and decreased  once it's either voted on (Succeeded or Defeated) or Cancelled
    /// By default it's restricted to 1 outstanding Proposal per token owner
    pub outstanding_proposal_count: u8,

    /// Reserved space for future versions
    pub reserved: [u8; 7],

    /// A single account that is allowed to operate governance with the deposited governing tokens
    /// It can be delegated to by the governing_token_owner or current governance_delegate
    pub governance_delegate: Option<Pubkey>,

    /// Reserved space for versions v2 and onwards
    /// Note: This space won't be available to v1 accounts until runtime supports resizing
    pub reserved_v2: [u8; 128],
}

#[derive(Clone)]
pub struct TokenOwnerRecord(TokenOwnerRecordV2);

impl TokenOwnerRecord {
    /// taken from solana-program-library/governance/src/state/token_owner_record.rs
    /// // 1 + 32 + 32 + 32 + 8 + 4 + 4 + 1 + 7 + 33 + 128
    pub const MAX_SIZE: usize = 282;
}

impl anchor_lang::AccountDeserialize for TokenOwnerRecord {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self, ProgramError> {
        // the job is slightly more difficult here
        // need to check the account discriminator to determine if the data is v1 or v2
        // if v1:
        //   deserialize everything we have, make sure we don't panic, default reserved_v2 empty
        // if v2:
        //   deserialize normally
        todo!()
    }
}

// TODO: can this be 'derived' instead? we just want the default behavior
impl anchor_lang::AccountSerialize for TokenOwnerRecord {}

impl anchor_lang::Owner for TokenOwnerRecord {
    fn owner() -> Pubkey {
        Pubkey::from_str(SPL_GOV_PROGRAM_ID).unwrap()
    }
}

impl Deref for TokenOwnerRecord {
    type Target = TokenOwnerRecordV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
