use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct UserData {
    pub name: String,
    pub expense_managers: Vec<Pubkey>,
}

impl UserData {
    // name: 64
    // expense_managers: 32 * 10 = 320
    pub const MAX_SIZE: usize = 394;
}

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct ExpenseManager {
    pub name: String,
    pub authority: Pubkey,
}

impl ExpenseManager {
    // name: 64
    // authority: 32
    pub const MAX_SIZE: usize = 96;
}

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct UserExpenseData {
    pub expense_packages: Vec<Pubkey>,
}

impl UserExpenseData {
    // expense_packages: 32 * 10 = 320
    pub const MAX_SIZE: usize = 320;
}

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct ExpensePackage {
    pub name: String,
    pub description: String,
    pub transaction_hashes: Vec<String>,
    pub owner: Pubkey,
    pub expense_manager: Pubkey,
    pub state: ExpensePackageState,
}

// TODO: once rent-refunds are implemented (receipts)
//   might be able to stop storing the hashes on-chain?
//   also storing hashes as individual accounts would allow better pay-as-you-go mechanics
impl ExpensePackage {
    // name: 64
    // description: 256
    // transaction_hashes: 32 * 32 = 1024
    // owner: 32
    // expense_manager: 32
    // state: 1
    pub const MAX_SIZE: usize = 1409;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExpensePackageState {
    CREATED,
    PENDING,
    DENIED,
    ACCEPTED,
    PAID,
}

impl Default for ExpensePackageState {
    fn default() -> Self {
        Self::CREATED
    }
}
