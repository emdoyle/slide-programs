use anchor_lang::prelude::*;

// TODO: do the initialized checks need to exist? init constraint likely handles both cases already
#[error]
pub enum SlideError {
    #[msg("UserData for given name already exists")]
    UserDataAlreadyExists,
    #[msg("UserData is uninitialized")]
    UserUninitialized,
    #[msg("User is already a member of this expense manager")]
    AlreadyJoinedExpenseManager,
    #[msg("User expense data already initialized for this manager")]
    UserExpenseDataAlreadyInitialized,
    #[msg("ExpensePackage must be in initial state to modify")]
    PackageFrozen,
    #[msg("ExpenseManager for given name already exists")]
    ManagerAlreadyExists,
    #[msg("ExpensePackage already exists for given ExpenseManager, signer and nonce")]
    PackageAlreadyExists,
    #[msg("ExpensePackage is already recorded in user's expense data")]
    PackageAlreadyRecorded,
    #[msg("Cannot create ExpensePackage under non-existent ExpenseManager")]
    ManagerUninitialized,
    DataTooLarge,
}
