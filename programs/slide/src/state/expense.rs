use anchor_lang::prelude::*;

#[account]
#[derive(Debug, Default, Eq, PartialEq)]
pub struct ExpenseManager {
    pub bump: u8,
    pub name: String,
    pub membership_token_mint: Pubkey,
    pub expense_package_nonce: u32,
    pub squad: Option<Pubkey>,
    pub realm: Option<Pubkey>,
    pub governance_authority: Option<Pubkey>,
}

impl ExpenseManager {
    // bump: 1
    // name: 64
    // membership_token_mint: 32
    // expense_package_nonce: 4
    // squad: 33
    // realm: 33
    // governance_authority: 33
    pub const MAX_SIZE: usize = 1 + 64 + 32 + 4 + 33 + 33 + 33;
}

#[account]
#[derive(Debug, Default, Eq, PartialEq)]
pub struct ExpensePackage {
    pub bump: u8,
    pub owner: Pubkey,
    pub expense_manager: Pubkey,
    pub name: String,
    pub description: String,
    pub state: ExpensePackageState,
    pub quantity: u64,
    pub nonce: u32,
}

impl ExpensePackage {
    // bump: 1
    // owner: 32
    // expense_manager: 32
    // name: 64
    // description: 256
    // state: 1
    // quantity: 8
    // nonce: 4
    pub const MAX_SIZE: usize = 1 + 32 + 32 + 64 + 256 + 1 + 8 + 4;
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExpensePackageState {
    Created,
    Pending,
    Denied,
    Approved,
    AutoApproved,
    Paid,
}

impl Default for ExpensePackageState {
    fn default() -> Self {
        Self::Created
    }
}
