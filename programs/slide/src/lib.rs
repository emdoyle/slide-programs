pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;
use utils::*;

// devnet
// declare_id!("5RtVwCB9KW1ajWEtavRGF8wLLD6WZ8QiSGPFruePovtC");
// localnet
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod slide {
    use super::*;
    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        username: String,
        real_name: String,
        _bump: u8,
    ) -> ProgramResult {
        let user_data = &mut ctx.accounts.user_data;
        require!(
            AsRef::<UserData>::as_ref(user_data) == &UserData::default(),
            SlideError::UserDataAlreadyExists
        );
        user_data.account_type = AccountType::UserData;
        let user = &ctx.accounts.user;
        user_data.username = username;
        user_data.real_name = real_name;
        user_data.user = user.key();
        Ok(())
    }
    pub fn create_expense_manager(
        ctx: Context<CreateExpenseManager>,
        name: String,
        _bump: u8,
    ) -> ProgramResult {
        let expense_manager = &mut ctx.accounts.expense_manager;
        require!(
            AsRef::<ExpenseManager>::as_ref(expense_manager) == &ExpenseManager::default(),
            SlideError::ManagerAlreadyExists
        );
        expense_manager.account_type = AccountType::ExpenseManager;
        let authority = &ctx.accounts.authority;
        // TODO: check if name is too large and send meaningful error code
        expense_manager.name = name;
        expense_manager.authority = authority.key();
        expense_manager.native_payout = true;
        Ok(())
    }
    pub fn create_expense_package(
        ctx: Context<CreateExpensePackage>,
        name: String,
        description: String,
        _nonce: u8,
        _manager_name: String,
        _manager_bump: u8,
        _package_bump: u8,
    ) -> ProgramResult {
        // TODO: how to authorize a user to create an expense package? --> mint authority on Manager
        let expense_package = &mut ctx.accounts.expense_package;
        require!(
            AsRef::<ExpensePackage>::as_ref(expense_package) == &ExpensePackage::default(),
            SlideError::PackageAlreadyExists
        );
        expense_package.account_type = AccountType::ExpensePackage;
        let owner = &ctx.accounts.owner;
        let expense_manager = &ctx.accounts.expense_manager;
        // TODO: check string field lengths
        expense_package.name = name;
        expense_package.description = description;
        expense_package.owner = owner.key();
        expense_package.expense_manager = expense_manager.key();
        Ok(())
    }
}
