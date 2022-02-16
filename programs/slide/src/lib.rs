use anchor_lang::prelude::*;
use num_derive::*;
use num_traits::*;

// devnet
// declare_id!("5RtVwCB9KW1ajWEtavRGF8wLLD6WZ8QiSGPFruePovtC");
// localnet
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod slide {
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
        let owner = &ctx.accounts.owner;
        // TODO: check string field lengths
        expense_package.name = name;
        expense_package.description = description;
        expense_package.owner = owner.key();
        // TODO: check expense manager is initialized
        expense_package.expense_manager = expense_manager_address;
        Ok(())
    }
    // TODO: this probably needs to accept a Vec of hashes
    pub fn add_transaction_hash(
        ctx: Context<AddTransactionHash>,
        transaction_hash: String,
        _manager_name: String,
        _manager_bump: u8,
        _package_bump: u8,
    ) -> ProgramResult {
        // TODO: check expense manager in correct state
        let expense_package = &mut ctx.accounts.expense_package;
        // TODO: check hash length
        // TODO: check vec length
        expense_package.transaction_hashes.push(transaction_hash);
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
    pub transaction_hashes: Vec<String>,
    pub owner: Pubkey,
    pub expense_manager: Pubkey,
    pub state: ExpensePackageState,
}

// TODO: once rent-refunds are implemented (receipts)
//   might be able to stop storing the hashes on-chain?
impl ExpensePackage {
    // name: 64
    // description: 256
    // transaction_hashes: 32 * 32 = 1024
    // owner: 32
    // expense_manager: 32
    // state: 1
    const MAX_SIZE: usize = 1409;
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

#[derive(Accounts)]
#[instruction(name: String, bump: u8)]
pub struct CreateExpenseManager<'info> {
    #[account(init, seeds = [b"expense_manager", name.as_bytes()], bump = bump, payer = authority, space = ExpenseManager::MAX_SIZE + 8)]
    pub expense_manager: Account<'info, ExpenseManager>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, description: String, expense_manager_address: Pubkey, bump: u8)]
pub struct CreateExpensePackage<'info> {
    #[account(init, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref()], bump = bump, payer = owner, space = ExpensePackage::MAX_SIZE + 8)]
    pub expense_package: Account<'info, ExpensePackage>,
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(transaction_hash: String, manager_name: String, manager_bump: u8, package_bump: u8)]
pub struct AddTransactionHash<'info> {
    #[account(seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner.key().as_ref()], bump = package_bump, has_one = owner)]
    pub expense_package: Account<'info, ExpensePackage>,
    pub owner: Signer<'info>,
}
