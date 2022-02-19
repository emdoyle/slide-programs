use anchor_lang::prelude::*;

// TODO: do the AlreadyExists checks need to exist?
//   init constraint likely handles case already
#[error]
pub enum SlideError {
    #[msg("ExpensePackage is not owned by signer, or not related to provided expense manager")]
    PackageOwnershipMismatch,
    #[msg("UserData for given name already exists")]
    UserDataAlreadyExists,
    #[msg("ExpenseManager for given name already exists")]
    ManagerAlreadyExists,
    #[msg("ExpensePackage already exists for given ExpenseManager, signer and nonce")]
    PackageAlreadyExists,
    #[msg("ExpensePackage has already been submitted or is otherwise locked")]
    PackageFrozen,
    DataTooLarge,
}
