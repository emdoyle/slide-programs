use super::account_type::AccountType;
use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct UserData {
    pub account_type: AccountType,
    pub user: Pubkey,
    pub username: String,
    pub real_name: String,
}

impl UserData {
    // account_type: 1
    // user: 32
    // username: 64
    // real_name: 128
    pub const MAX_SIZE: usize = 1 + 32 + 64 + 128;
}
