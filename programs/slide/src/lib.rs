pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use num_derive::*;
use num_traits::*;
use state::*;
use utils::*;

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
        let expense_manager = &mut ctx.accounts.expense_manager;
        require!(
            expense_manager.name == "" && expense_manager.authority == Pubkey::default(),
            SlideError::ManagerAlreadyExists
        );
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
        _manager_name: String,
        _manager_bump: u8,
        _package_bump: u8,
    ) -> ProgramResult {
        // TODO: how to authorize a user to create an expense package?
        let expense_package = &mut ctx.accounts.expense_package;
        require!(
            expense_package.to_account_info().data_is_empty(),
            SlideError::PackageAlreadyExists
        );
        let owner = &ctx.accounts.owner;
        // TODO: check string field lengths
        expense_package.name = name;
        expense_package.description = description;
        expense_package.owner = owner.key();
        let expense_manager = &ctx.accounts.expense_manager;
        require!(
            !expense_manager.to_account_info().data_is_empty(),
            SlideError::ManagerUninitialized
        );
        expense_package.expense_manager = expense_manager.key();
        Ok(())
    }
    // TODO: this probably needs to accept a Vec of hashes
    pub fn add_transaction_hash(
        ctx: Context<AddTransactionHash>,
        transaction_hash: String,
        _expense_manager_address: Pubkey,
        _bump: u8,
    ) -> ProgramResult {
        let expense_package = &mut ctx.accounts.expense_package;
        require!(
            expense_package.state == ExpensePackageState::CREATED,
            SlideError::PackageFrozen
        );
        // TODO: check hash length
        // TODO: check vec length
        expense_package.transaction_hashes.push(transaction_hash);
        Ok(())
    }
}
