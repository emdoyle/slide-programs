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
    pub fn initialize_user(ctx: Context<InitializeUser>, name: String, _bump: u8) -> ProgramResult {
        let user_data = &mut ctx.accounts.user_data;
        require!(
            AsRef::<UserData>::as_ref(user_data) == &UserData::default(),
            SlideError::UserDataAlreadyExists
        );
        user_data.name = name;
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
        let authority = &ctx.accounts.authority;
        // TODO: check if name is too large and send meaningful error code
        expense_manager.name = name;
        expense_manager.authority = authority.key();
        Ok(())
    }
    pub fn join_expense_manager(
        ctx: Context<JoinExpenseManager>,
        _name: String,
        _manager_bump: u8,
        _user_bump: u8,
        _user_expense_bump: u8,
    ) -> ProgramResult {
        let user_data = &mut ctx.accounts.user_data;
        require!(
            AsRef::<UserData>::as_ref(user_data) != &UserData::default(),
            SlideError::UserUninitialized
        );
        let expense_manager = &ctx.accounts.expense_manager;
        require!(
            !user_data.expense_managers.contains(&expense_manager.key()),
            SlideError::AlreadyJoinedExpenseManager
        );
        user_data.expense_managers.push(expense_manager.key());
        // is it necessary to do this check if already using the 'init' constraint?
        let user_expense_data = &ctx.accounts.user_expense_data;
        require!(
            AsRef::<UserExpenseData>::as_ref(user_expense_data) == &UserExpenseData::default(),
            SlideError::UserExpenseDataAlreadyInitialized
        );
        Ok(())
    }
    pub fn create_expense_package(
        ctx: Context<CreateExpensePackage>,
        name: String,
        description: String,
        nonce: u8,
        _manager_name: String,
        _package_bump: u8,
        _manager_bump: u8,
        _user_expense_bump: u8,
    ) -> ProgramResult {
        // TODO: how to authorize a user to create an expense package? --> mint authority on Manager
        let expense_package = &mut ctx.accounts.expense_package;
        require!(
            AsRef::<ExpensePackage>::as_ref(expense_package) == &ExpensePackage::default(),
            SlideError::PackageAlreadyExists
        );
        let owner = &ctx.accounts.owner;
        let user_expense_data = &mut ctx.accounts.user_expense_data;
        // TODO: check string field lengths
        expense_package.name = name;
        expense_package.description = description;
        expense_package.owner = owner.key();
        let remote_pda_info_for_package = RemotePDAInfo {
            nonce,
            address: expense_package.key(),
        };
        require!(
            !user_expense_data
                .expense_packages
                .contains(&remote_pda_info_for_package),
            SlideError::PackageAlreadyRecorded
        );
        user_expense_data
            .expense_packages
            .push(remote_pda_info_for_package);
        Ok(())
    }
    pub fn add_transaction_hashes(
        ctx: Context<AddTransactionHashes>,
        transaction_hashes: Vec<String>,
        _nonce: u8,
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
        // TODO: filter out duplicates
        expense_package
            .transaction_hashes
            .extend_from_slice(&transaction_hashes);
        Ok(())
    }
}
