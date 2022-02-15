use anchor_lang::prelude::*;
use num_derive::*;
use num_traits::*;

// devnet
// declare_id!("5RtVwCB9KW1ajWEtavRGF8wLLD6WZ8QiSGPFruePovtC");
// localnet
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod riptide_q1 {
    use super::*;
    pub fn create_expense_manager(
        ctx: Context<CreateExpenseManager>,
        name: String,
        _bump: u8,
    ) -> ProgramResult {
        // TODO: do we need to check that the account starts empty here? most likely yes
        let expense_manager = &mut ctx.accounts.expense_manager;
        let authority = &ctx.accounts.authority;
        // TODO: check if name is too large and send meaningful error code
        expense_manager.name = name;
        expense_manager.authority = authority.key();
        Ok(())
    }
    pub fn create_expense_package(
        ctx: Context<CreateExpensePackage>,
        name: String,
        description: String,
        expense_manager_address: Pubkey,
        _bump: u8,
    ) -> ProgramResult {
        // TODO: how to authorize a user to create an expense package?
        // TODO: check expense package starts empty here
        let expense_package = &mut ctx.accounts.expense_package;
        let user = &ctx.accounts.user;
        // TODO: check string field lengths
        expense_package.name = name;
        expense_package.description = description;
        expense_package.owner = user.key();
        // TODO: check expense manager is initialized
        expense_package.expense_manager = expense_manager_address;
        Ok(())
    }
}

#[account]
#[derive(Default)]
pub struct ExpenseManager {
    pub name: String,
    pub authority: Pubkey,
}

impl ExpenseManager {
    // name: 64
    // authority: 32
    const MAX_SIZE: usize = 96;
}

#[account]
#[derive(Default)]
pub struct ExpensePackage {
    pub name: String,
    pub description: String,
    pub owner: Pubkey,
    pub expense_manager: Pubkey,
    pub state: ExpensePackageState,
}

impl ExpensePackage {
    // name: 64
    // description: 256
    // owner: 32
    // expense_manager: 32
    // state: 1
    const MAX_SIZE: usize = 385;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ExpensePackageState {
    CREATED,
    PENDING,
    DENIED,
    ACCEPTED,
    PAID,
}

impl Default for ExpensePackageState {
    fn default() -> Self {
        Self::CREATED
    }
}

#[account]
#[derive(Default)]
pub struct TransactionExpense {
    pub signature: String,
}

impl TransactionExpense {
    const MAX_SIZE: usize = 100;
}

#[derive(Accounts)]
#[instruction(name: String, bump: u8)]
pub struct CreateExpenseManager<'info> {
    #[account(init, seeds = [b"expense_manager", name.as_bytes()], bump = bump, payer = authority, space = ExpenseManager::MAX_SIZE + 8)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, expense_manager_address: Pubkey, bump: u8)]
pub struct CreateExpensePackage<'info> {
    #[account(init, seeds = [b"expense_package", expense_manager_address.as_ref(), user.key().as_ref()], bump = bump, payer = user, space = ExpensePackage::MAX_SIZE + 8)]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
