use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, seeds = [b"user-data", user.key().as_ref()], bump, payer = user, space = UserData::MAX_SIZE + 8)]
    pub user_data: Account<'info, UserData>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// TODO: should this do a membership check?
#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateExpenseManager<'info> {
    #[account(init, seeds = [b"expense-manager", name.as_bytes()], bump, payer = payer, space = ExpenseManager::MAX_SIZE + 8)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(expense_manager_address: Pubkey, nonce: u32)]
pub struct WithdrawFromExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_manager_address.as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump,
        constraint = expense_package.state == ExpensePackageState::Approved @ SlideError::PackageNotApproved
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(mut)]
    pub owner: Signer<'info>,
}
