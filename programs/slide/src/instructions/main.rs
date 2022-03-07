use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(init, seeds = [b"user_data", user.key().as_ref()], bump, payer = user, space = UserData::MAX_SIZE + 8)]
    pub user_data: Account<'info, UserData>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateExpenseManager<'info> {
    #[account(init, seeds = [b"expense_manager", name.as_bytes()], bump, payer = payer, space = ExpenseManager::MAX_SIZE + 8)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// #[instruction(expense_manager_address: Pubkey, nonce: u8, bump: u8)]
// pub struct WithdrawFromExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     #[account(mut)]
//     pub owner: Signer<'info>,
// }
