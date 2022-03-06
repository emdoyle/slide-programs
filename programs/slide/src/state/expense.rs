use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct ExpenseManager {
    pub name: String,
    pub membership_token_mint: Pubkey,
    pub expense_package_nonce: u16,
    pub squad: Option<Pubkey>,
    pub realm: Option<Pubkey>,
    pub governance_authority: Option<Pubkey>,
}

impl ExpenseManager {
    // name: 64
    // membership_token_mint: 32
    // expense_package_nonce: 2
    // squad: 33
    // realm: 33
    // governance_authority: 33
    pub const MAX_SIZE: usize = 64 + 32 + 2 + 33 + 33 + 33;
}

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct ExpensePackage {
    pub name: String,
    pub description: String,
    pub state: ExpensePackageState,
    pub quantity: u64,
}

impl ExpensePackage {
    // name: 64
    // description: 256
    // state: 1
    // quantity: 8
    pub const MAX_SIZE: usize = 64 + 256 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
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
