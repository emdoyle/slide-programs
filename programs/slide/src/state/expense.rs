use super::account_type::AccountType;
use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct ExpenseManager {
    pub account_type: AccountType,
    pub name: String,
    pub authority: Pubkey,
    pub native_payout: bool,
    pub token_payout: Option<Pubkey>,
    // pub payout_lockup_period -- look into time types
}

impl ExpenseManager {
    // account_type: 1
    // name: 64
    // authority: 32
    // native_payout: 1
    // token_payout: 32
    pub const MAX_SIZE: usize = 1 + 64 + 32 + 1 + 32;
}

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct ExpensePackage {
    pub account_type: AccountType,
    pub name: String,
    pub description: String,
    pub owner: Pubkey,
    pub expense_manager: Pubkey,
    pub state: ExpensePackageState,
    pub quantity: u64,
    pub token_authority: Option<Pubkey>,
}

impl ExpensePackage {
    // account_type: 1
    // name: 64
    // description: 256
    // owner: 32
    // expense_manager: 32
    // state: 1
    // quantity: 64
    // token_authority: 32
    pub const MAX_SIZE: usize = 1 + 64 + 256 + 32 + 32 + 1 + 64 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExpensePackageState {
    CREATED,
    PENDING,
    DENIED,
    APPROVED,
    PAID,
}

impl Default for ExpensePackageState {
    fn default() -> Self {
        Self::CREATED
    }
}
