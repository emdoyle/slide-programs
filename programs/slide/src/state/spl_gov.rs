// need:
//  - Proposal
//  - TokenOwnerRecord

use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSchema, BorshSerialize};
use spl_governance::state::enums::GovernanceAccountType;
use spl_governance::state::token_owner_record::TokenOwnerRecordV2;
use std::ops::Deref;
use std::str::FromStr;

// TODO: why do I need to 'use' FromStr if Pubkey already implements FromStr?
pub const SPL_GOV_PROGRAM_ID: &str = "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw";

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
