use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AccountType {
    Uninitialized,
    UserData,
    ExpenseManager,
    ExpensePackage,
    OnChainTransaction,
    ReimbursementPreference,
    KnownVendor,
}

impl Default for AccountType {
    fn default() -> Self {
        Self::Uninitialized
    }
}
