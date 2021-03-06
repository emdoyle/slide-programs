use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct UserData {
    pub bump: u8,
    pub user: Pubkey,
    pub username: String,
    pub real_name: String,
}

impl UserData {
    // bump: 1
    // user: 32
    // username: 64
    // real_name: 128
    pub const MAX_SIZE: usize = 1 + 32 + 64 + 128;
}
