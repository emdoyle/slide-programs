use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(name: String, bump: u8)]
pub struct InitializeUser<'info> {
    #[account(init, seeds = [b"user_data", user.key().as_ref()], bump = bump, payer = user, space = UserData::MAX_SIZE + 8)]
    pub user_data: Account<'info, UserData>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, bump: u8)]
pub struct CreateExpenseManager<'info> {
    #[account(init, seeds = [b"expense_manager", name.as_bytes()], bump = bump, payer = authority, space = ExpenseManager::MAX_SIZE + 8)]
    pub expense_manager: Account<'info, ExpenseManager>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, manager_bump: u8, user_bump: u8, user_expense_bump: u8)]
pub struct JoinExpenseManager<'info> {
    #[account(mut, seeds = [b"user_data", user.key().as_ref()], bump = user_bump)]
    pub user_data: Account<'info, UserData>,
    #[account(seeds = [b"expense_manager", name.as_bytes()], bump = manager_bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(init, seeds = [b"user_expense_data", expense_manager.key().as_ref(), user.key().as_ref()], bump = user_expense_bump, payer = user, space = UserExpenseData::MAX_SIZE + 8)]
    pub user_expense_data: Account<'info, UserExpenseData>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, nonce: u8, manager_name: String, package_bump: u8, manager_bump: u8, user_expense_bump: u8)]
pub struct CreateExpensePackage<'info> {
    #[account(init, seeds = [b"expense_package", expense_manager.key().as_ref(), owner.key().as_ref(), &[nonce]], bump = package_bump, payer = owner, space = ExpensePackage::MAX_SIZE + 8)]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(mut, seeds = [b"user_expense_data", expense_manager.key().as_ref(), owner.key().as_ref()], bump = user_expense_bump)]
    pub user_expense_data: Account<'info, UserExpenseData>,
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(transaction_hash: String, expense_manager_address: Pubkey, bump: u8)]
pub struct AddTransactionHash<'info> {
    #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref()], bump = bump, has_one = owner)]
    pub expense_package: Account<'info, ExpensePackage>,
    pub owner: Signer<'info>,
}
