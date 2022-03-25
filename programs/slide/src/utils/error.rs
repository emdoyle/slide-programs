use anchor_lang::prelude::*;

#[error_code]
pub enum SlideError {
    #[msg("User does not hold the appropriate membership token")]
    UserIsNotDAOMember,
    #[msg("User has insufficient permissions to approve or deny expenses")]
    UserCannotApproveOrDenyExpenses,
    #[msg("User cannot approve or deny their own expense package")]
    UserCannotApproveOrDenyOwnExpense,
    #[msg("Client provided incorrect nonce")]
    IncorrectNonce,
    #[msg("Realm does not match ExpenseManager")]
    SPLGovRealmMismatch,
    #[msg("Squad does not match ExpenseManager")]
    SquadMismatch,
    #[msg("Squad mint does not match TokenAccount mint")]
    SquadMintMismatch,
    #[msg("Proposal is not the right type for this instruction")]
    WrongProposalType,
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    #[msg("Proposal has invalid data for execution")]
    InvalidProposal,
    #[msg("ExpensePackage is not owned by signer, or not related to provided expense manager")]
    PackageOwnershipMismatch,
    #[msg("ExpensePackage has already been submitted or is otherwise locked")]
    PackageFrozen,
    #[msg("ExpensePackage is missing required info such as name or quantity")]
    PackageMissingInfo,
    #[msg("ExpensePackage has not been manually approved")]
    PackageNotApproved,
    #[msg("Insufficient funds exist in the manager to approve this expense")]
    ManagerInsufficientFunds,
    DataTooLarge,
}
