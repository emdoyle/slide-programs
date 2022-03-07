// need:
//  - Proposal
//  - TokenOwnerRecord

use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use spl_governance::state::token_owner_record::TokenOwnerRecordV2;
use std::ops::Deref;

pub const SPL_GOV_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

#[derive(Clone, Debug, BorshDeserialize)]
pub struct TokenOwnerRecord(TokenOwnerRecordV2);

impl TokenOwnerRecord {
    /// taken from solana-program-library/governance/src/state/token_owner_record.rs
    /// // 1 + 32 + 32 + 32 + 8 + 4 + 4 + 1 + 7 + 33 + 128
    pub const MAX_SIZE: usize = 282;
}

impl anchor_lang::AccountDeserialize for TokenOwnerRecord {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        // the job is slightly more difficult here
        // need to check the account discriminator to determine if the data is v1 or v2
        // if v1:
        //   deserialize everything we have, make sure we don't panic, default reserved_v2 empty
        // if v2:
        //   deserialize normally
        let token_owner_record: TokenOwnerRecord = BorshDeserialize::deserialize(buf).unwrap();
        Ok(token_owner_record)
    }
}

// TODO: can this be 'derived' instead? we just want the default behavior
impl anchor_lang::AccountSerialize for TokenOwnerRecord {}

impl anchor_lang::Owner for TokenOwnerRecord {
    fn owner() -> Pubkey {
        SPL_GOV_PROGRAM_ID
    }
}

impl Deref for TokenOwnerRecord {
    type Target = TokenOwnerRecordV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
