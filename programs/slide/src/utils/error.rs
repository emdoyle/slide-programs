use anchor_lang::prelude::*;

#[error_code]
pub enum SlideError {
    #[msg("User does not hold the appropriate membership token")]
    UserIsNotDAOMember,
    #[msg("ExpensePackage is not owned by signer, or not related to provided expense manager")]
    PackageOwnershipMismatch,
    #[msg("ExpensePackage has already been submitted or is otherwise locked")]
    PackageFrozen,
    #[msg("ExpensePackage has not been manually approved")]
    PackageNotApproved,
    #[msg("Token operations are not implemented yet!")]
    TokensNotImplemented,
    #[msg("Insufficient funds exist in the manager to approve this expense")]
    ManagerInsufficientFunds,
    DataTooLarge,
}
