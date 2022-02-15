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
        let expense_manager = &mut ctx.accounts.expense_manager;
        let authority = &ctx.accounts.authority;
        // TODO: check if name is too large and send meaningful error code
        expense_manager.name = name;
        expense_manager.authority = authority.key();
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
    pub state: ExpensePackageState,
}

impl ExpensePackage {
    const MAX_SIZE: usize = 321;
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
