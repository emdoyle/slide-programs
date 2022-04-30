use anchor_lang::prelude::*;
use borsh::BorshDeserialize;
use spl_governance::state::governance::GovernanceV2;
use spl_governance::state::token_owner_record::TokenOwnerRecordV2;
use std::ops::Deref;

// TODO:
//   when deserializing,
//   need to check the account discriminator to determine if the data is v1 or v2
//   if v1:
//     deserialize everything we have, make sure we don't panic, default reserved_v2 empty
//   if v2:
//     deserialize normally

#[derive(Clone, Debug, BorshDeserialize)]
pub struct TokenOwnerRecord(TokenOwnerRecordV2);

impl anchor_lang::AccountDeserialize for TokenOwnerRecord {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        Ok(BorshDeserialize::deserialize(buf).unwrap())
    }
}

impl anchor_lang::AccountSerialize for TokenOwnerRecord {}

impl Deref for TokenOwnerRecord {
    type Target = TokenOwnerRecordV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[derive(Clone, BorshDeserialize)]
pub struct Governance(GovernanceV2);

impl anchor_lang::AccountDeserialize for Governance {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        Ok(BorshDeserialize::deserialize(buf).unwrap())
    }
}

impl anchor_lang::AccountSerialize for Governance {}

impl Deref for Governance {
    type Target = GovernanceV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
