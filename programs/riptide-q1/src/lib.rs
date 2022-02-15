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
        // TODO: check too large? or is that automatic?
        expense_manager.name = name;
        Ok(())
    }
}

#[account]
#[derive(Default)]
pub struct ExpenseManager {
    pub name: String,
    pub treasury_account: Option<Pubkey>, // TODO: what is the best way to connect treasury?
}

impl ExpenseManager {
    const MAX_SIZE: usize = 96;
}

#[derive(Accounts)]
#[instruction(name: String, bump: u8)]
pub struct CreateExpenseManager<'info> {
    #[account(init, seeds = [b"expense_manager", name.as_bytes()], bump = bump, payer = dao_member, space = ExpenseManager::MAX_SIZE + 8)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(mut)]
    pub dao_member: Signer<'info>,
    pub system_program: Program<'info, System>,
}
