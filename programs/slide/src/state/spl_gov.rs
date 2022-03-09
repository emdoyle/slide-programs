// need:
//  - Proposal
//  - Governance
//  - TokenOwnerRecord

use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use spl_governance::state::governance::GovernanceV2;
use spl_governance::state::token_owner_record::TokenOwnerRecordV2;
use std::mem::size_of;
use std::ops::Deref;

pub const SPL_GOV_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw");

// TODO:
//   when deserializing,
//   need to check the account discriminator to determine if the data is v1 or v2
//   if v1:
//     deserialize everything we have, make sure we don't panic, default reserved_v2 empty
//   if v2:
//     deserialize normally

#[derive(Clone, Debug, BorshDeserialize)]
pub struct TokenOwnerRecord(TokenOwnerRecordV2);

impl TokenOwnerRecord {
    /// taken from solana-program-library/governance/src/state/token_owner_record.rs
    /// 1 + 32 + 32 + 32 + 8 + 4 + 4 + 1 + 7 + 33 + 128
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
        Ok(BorshDeserialize::deserialize(buf).unwrap())
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

#[derive(Clone, BorshDeserialize)]
pub struct Governance(GovernanceV2);

impl Governance {
    /// using default implementation as done in solana-program-library/governance/src/state/governance.rs
    pub const MAX_SIZE: usize = size_of::<Governance>();
}

impl anchor_lang::AccountDeserialize for Governance {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        Ok(BorshDeserialize::deserialize(buf).unwrap())
    }
}

// TODO: can this be 'derived' instead? we just want the default behavior
impl anchor_lang::AccountSerialize for Governance {}

impl anchor_lang::Owner for Governance {
    fn owner() -> Pubkey {
        SPL_GOV_PROGRAM_ID
    }
}

impl Deref for Governance {
    type Target = GovernanceV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
