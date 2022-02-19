use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(username: String, real_name: String, bump: u8)]
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
#[instruction(nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
pub struct CreateExpensePackage<'info> {
    #[account(init, seeds = [b"expense_package", expense_manager.key().as_ref(), owner.key().as_ref(), &[nonce]], bump = package_bump, payer = owner, space = ExpensePackage::MAX_SIZE + 8)]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, quantity: u64, token_authority: Option<Pubkey>, expense_manager_address: Pubkey, nonce: u8, bump: u8)]
pub struct UpdateExpensePackage<'info> {
    #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
    pub expense_package: Account<'info, ExpensePackage>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(expense_manager_address: Pubkey, nonce: u8, bump: u8)]
pub struct SubmitExpensePackage<'info> {
    #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
    pub expense_package: Account<'info, ExpensePackage>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(owner_pubkey: Pubkey, nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
pub struct ApproveExpensePackage<'info> {
    #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner_pubkey.as_ref(), &[nonce]], bump = package_bump)]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump, has_one = authority)]
    pub expense_manager: Account<'info, ExpenseManager>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(owner_pubkey: Pubkey, nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
pub struct DenyExpensePackage<'info> {
    #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner_pubkey.as_ref(), &[nonce]], bump = package_bump)]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump, has_one = authority)]
    pub expense_manager: Account<'info, ExpenseManager>,
    pub authority: Signer<'info>,
}
