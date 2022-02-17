use anchor_lang::prelude::*;

#[error]
pub enum SlideError {
    #[msg("UserData for given name already exists")]
    UserDataAlreadyExists,
    #[msg("ExpensePackage must be in initial state to modify")]
    PackageFrozen,
    #[msg("ExpenseManager for given name already exists")]
    ManagerAlreadyExists,
    #[msg("ExpensePackage already exists for given ExpenseManager and signer")]
    PackageAlreadyExists,
    #[msg("Cannot create ExpensePackage under non-existent ExpenseManager")]
    ManagerUninitialized,
    DataTooLarge,
}
