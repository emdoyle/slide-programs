// need:
//  - Proposal
//    create instruction needs proposal address
//    execute instruction needs proposal address as well
//  - Squad
//    probably just check mint address matches token account
use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use solana_program::clock::UnixTimestamp;
use std::collections::BTreeMap;

pub const SQUADS_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("SQDSm7ifFqwmgxY5aL59BtHcBGHEgbg5thh4Y9ytdn3");

// TODO: these structs are copy-pasted from Squads rather than imported
//   because the squads_program crate doesn't derive Clone
//   which is required for anchor's Account

#[derive(Clone, BorshDeserialize)]
pub struct Member {
    pub equity_token_account: Pubkey, // contributions_account: [u8; 32], // need to expand for each mint
}

#[derive(Clone, BorshDeserialize)]
pub struct Squad {
    pub is_initialized: bool,

    /// whether or not the owner can still make changes (draft mode)
    pub open: bool,
    pub emergency_lock: bool,

    /// typical settings
    pub allocation_type: u8,
    pub vote_support: u8,
    pub vote_quorum: u8,
    pub core_threshold: u8,
    pub squad_name: String,
    pub description: String,
    pub token: String,

    // future settings placeholders
    pub future_setting_1: u8,
    pub future_setting_2: u8,
    pub future_setting_3: u8,
    pub future_setting_4: u8,
    pub future_setting_5: u8,

    /// misc address for squad specific settings
    // admin address for draft mode (open=true) only
    pub admin: Pubkey,
    pub sol_account: Pubkey,
    pub mint_address: Pubkey,

    pub future_address1: Pubkey,
    pub future_address2: Pubkey,
    pub future_address3: Pubkey,
    pub future_address4: Pubkey,
    pub future_address5: Pubkey,

    pub proposal_nonce: u32,
    pub created_on: i64,
    /// the squad member list
    pub members: BTreeMap<Pubkey, Member>,

    pub random_id: String,

    pub child_index: u32,
    pub member_lock_index: u32,
    // reserved for future updates
    pub reserved: [u64; 32],
}

impl anchor_lang::Owner for Squad {
    fn owner() -> Pubkey {
        SQUADS_PROGRAM_ID
    }
}

impl anchor_lang::AccountDeserialize for Squad {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        Ok(BorshDeserialize::deserialize(buf).unwrap())
    }
}

impl anchor_lang::AccountSerialize for Squad {}

#[derive(Clone, BorshDeserialize)]
pub struct SquadsProposal {
    pub is_initialized: bool,
    // 0 - text proposal
    // 1 - change support
    // 2 - change quorum
    // 3 - emergency quorum
    // 4 - withdraw SOL
    // 5 - withdraw token
    // 6 - add member
    // 7 - remove member
    // 8 - mint more tokens to a member
    pub proposal_type: u8,
    pub execution_amount: u64,
    pub execution_amount_out: u64,
    pub execution_source: Pubkey,
    pub execution_destination: Pubkey,
    pub creator: Pubkey,
    pub squad_address: Pubkey,
    pub title: String,
    pub description: String,
    pub link: String,
    // number of vote options
    pub votes_num: u8,
    pub has_voted_num: u8,
    pub has_voted: Vec<Pubkey>,
    pub votes: Vec<u64>,
    // labels of the vote options
    pub votes_labels: Vec<String>,
    pub start_timestamp: UnixTimestamp,
    pub close_timestamp: UnixTimestamp,
    pub created_timestamp: UnixTimestamp,
    pub supply_at_execute: u64,
    pub members_at_execute: u8,
    pub threshold_at_execute: u8,
    pub executed: bool,
    pub execute_ready: bool,
    pub execution_date: UnixTimestamp,

    pub instruction_index: u8,
    pub multiple_choice: bool,

    pub executed_by: Pubkey,
    pub proposal_index: u32,
    // reserved for future updates
    pub reserved: [u64; 16],
}

impl anchor_lang::Owner for SquadsProposal {
    fn owner() -> Pubkey {
        SQUADS_PROGRAM_ID
    }
}

impl anchor_lang::AccountDeserialize for SquadsProposal {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        Ok(BorshDeserialize::deserialize(buf).unwrap())
    }
}

impl anchor_lang::AccountSerialize for SquadsProposal {}
