use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(realm: Pubkey)]
pub struct SPLGovInitializeExpenseManager<'info> {
    #[account(mut, seeds = [b"expense-manager", expense_manager.name.as_bytes()], bump = expense_manager.bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"token-governance", realm.as_ref(), governance_authority.governed_account.as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID
    )]
    pub governance_authority: Account<'info, Governance>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), member.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(mut)]
    pub member: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey, user: Pubkey, role: Role)]
pub struct SPLGovCreateAccessRecord<'info> {
    #[account(
        init,
        seeds = [b"access-record", expense_manager.key().as_ref(), user.as_ref()],
        bump,
        payer = native_treasury,
        space = AccessRecord::MAX_SIZE + 8
    )]
    pub access_record: Account<'info, AccessRecord>,
    #[account(
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        signer,
        seeds = [b"token-governance", realm.as_ref(), governance_authority.governed_account.as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID
    )]
    pub governance_authority: Account<'info, Governance>,
    #[account(
        mut,
        seeds = [b"native-treasury", governance_authority.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID
    )]
    pub native_treasury: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey)]
pub struct SPLGovWithdrawFromExpenseManager<'info> {
    #[account(
        mut,
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        signer,
        seeds = [b"token-governance", realm.as_ref(), governance_authority.governed_account.as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID
    )]
    pub governance_authority: Account<'info, Governance>,
    /// CHECK: The seeds constraint is sufficient here, and the treasury does not need to sign
    #[account(
        mut,
        seeds = [b"native-treasury", governance_authority.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID
    )]
    pub native_treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey, nonce: u32, name: String, description: String, quantity: u64)]
pub struct SPLGovCreateExpensePackage<'info> {
    #[account(
        init,
        seeds = [b"expense-package", expense_manager.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump,
        payer = owner,
        space = ExpensePackage::MAX_SIZE + 8
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        mut,
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = nonce == expense_manager.expense_package_nonce @ SlideError::IncorrectNonce,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), owner.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey, nonce: u32, name: String, description: String, quantity: u64)]
pub struct SPLGovUpdateExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_package.expense_manager.as_ref(), expense_package.owner.as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump,
        constraint = expense_package.state == ExpensePackageState::Created @ SlideError::PackageFrozen,
        has_one = owner,
        has_one = expense_manager
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), owner.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey, nonce: u32)]
pub struct SPLGovSubmitExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_package.expense_manager.as_ref(), expense_package.owner.as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump,
        constraint = expense_package.state == ExpensePackageState::Created @ SlideError::PackageFrozen,
        constraint = expense_package.quantity > 0 && !expense_package.name.is_empty() @ SlideError::PackageMissingInfo,
        has_one = owner,
        has_one = expense_manager
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), owner.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey, nonce: u32)]
pub struct SPLGovApproveExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_package.expense_manager.as_ref(), expense_package.owner.as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        mut,
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), authority.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(
        seeds = [b"access-record", expense_manager.key().as_ref(), authority.key().as_ref()],
        bump = access_record.bump,
        constraint = access_record.role.can_approve_and_deny() @ SlideError::UserCannotApproveOrDenyExpenses
    )]
    pub access_record: Account<'info, AccessRecord>,
    #[account(
        mut,
        constraint = authority.key() != expense_package.owner @ SlideError::UserCannotApproveOrDenyOwnExpense
    )]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(realm: Pubkey, nonce: u32)]
pub struct SPLGovDenyExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_package.expense_manager.as_ref(), expense_package.owner.as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), authority.key().as_ref()],
        bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(
        seeds = [b"access-record", expense_manager.key().as_ref(), authority.key().as_ref()],
        bump = access_record.bump,
        constraint = access_record.role.can_approve_and_deny() @ SlideError::UserCannotApproveOrDenyExpenses
    )]
    pub access_record: Account<'info, AccessRecord>,
    #[account(
        mut,
        constraint = authority.key() != expense_package.owner @ SlideError::UserCannotApproveOrDenyOwnExpense
    )]
    pub authority: Signer<'info>,
}

// #[derive(Accounts)]
// #[instruction()]
// pub struct SPLGovCreateAccessProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SPLGovCreateFundingProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SPLGovCreateWithdrawalProposal<'info> {}
