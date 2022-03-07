pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;
use utils::*;

// devnet
// declare_id!("AgS7BpciUWV7bC7nL8KzSaNof4mvcycTUY9QQbPQ65Pt");
// localnet
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// TODO: out-of-space errors (on dynamic stuff like strings)
//   does this need to be handled explicitly?

#[program]
pub mod slide {
    use super::*;
    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        username: String,
        real_name: String,
    ) -> Result<()> {
        let user_data = &mut ctx.accounts.user_data;
        let user = &ctx.accounts.user;
        user_data.username = username;
        user_data.real_name = real_name;
        user_data.user = user.key();
        user_data.bump = *ctx.bumps.get("user_data").unwrap();
        Ok(())
    }
    pub fn create_expense_manager(
        ctx: Context<CreateExpenseManager>,
        name: String,
        membership_token_mint: Pubkey,
    ) -> Result<()> {
        let expense_manager = &mut ctx.accounts.expense_manager;
        expense_manager.name = name;
        expense_manager.membership_token_mint = membership_token_mint;
        expense_manager.bump = *ctx.bumps.get("expense_manager").unwrap();
        Ok(())
    }
    pub fn spl_gov_initialize_expense_manager(
        ctx: Context<SPLGovInitializeExpenseManager>,
        _name: String,
        realm: Pubkey,
        governance_authority: Pubkey,
        _token_owner_bump: u8,
    ) -> Result<()> {
        let token_owner_record = &ctx.accounts.token_owner_record;
        // TODO: should tokens need to be deposited in governance for this membership check?
        require!(
            token_owner_record.governing_token_deposit_amount > 0,
            SlideError::UserIsNotDAOMember
        );
        let expense_manager = &mut ctx.accounts.expense_manager;
        expense_manager.realm = Some(realm);
        expense_manager.governance_authority = Some(governance_authority);
        Ok(())
    }
    // pub fn create_expense_package(
    //     ctx: Context<CreateExpensePackage>,
    //     _nonce: u8,
    //     _manager_name: String,
    //     _manager_bump: u8,
    //     _package_bump: u8,
    // ) -> Result<()> {
    //     // TODO: how to authorize a user to create an expense package? --> mint authority on Manager
    //     let expense_package = &mut ctx.accounts.expense_package;
    //     require!(
    //         AsRef::<ExpensePackage>::as_ref(expense_package) == &ExpensePackage::default(),
    //         SlideError::PackageAlreadyExists
    //     );
    //     let owner = &ctx.accounts.owner;
    //     let expense_manager = &ctx.accounts.expense_manager;
    //     expense_package.owner = owner.key();
    //     expense_package.expense_manager = expense_manager.key();
    //     Ok(())
    // }
    // pub fn update_expense_package(
    //     ctx: Context<UpdateExpensePackage>,
    //     name: String,
    //     description: String,
    //     quantity: u64,
    //     token_authority: Option<Pubkey>,
    //     expense_manager_address: Pubkey,
    //     _nonce: u8,
    //     _bump: u8,
    // ) -> Result<()> {
    //     let expense_package = &mut ctx.accounts.expense_package;
    //     let owner = &ctx.accounts.owner;
    //     // TODO: not sure if this check is necessary
    //     require!(
    //         expense_package.owner == owner.key()
    //             && expense_package.expense_manager == expense_manager_address,
    //         SlideError::PackageOwnershipMismatch
    //     );
    //     expense_package.name = name;
    //     expense_package.description = description;
    //     expense_package.quantity = quantity;
    //     expense_package.token_authority = token_authority;
    //     Ok(())
    // }
    // pub fn submit_expense_package(
    //     ctx: Context<SubmitExpensePackage>,
    //     _expense_manager_address: Pubkey,
    //     _nonce: u8,
    //     _bump: u8,
    // ) -> Result<()> {
    //     let expense_package = &mut ctx.accounts.expense_package;
    //     require!(
    //         expense_package.state == ExpensePackageState::Created,
    //         SlideError::PackageFrozen
    //     );
    //     // TODO: consider blocking if certain other fields (name, quantity) are still default
    //     expense_package.state = ExpensePackageState::Pending;
    //     Ok(())
    // }
    // pub fn approve_expense_package(
    //     ctx: Context<ApproveExpensePackage>,
    //     _owner_pubkey: Pubkey,
    //     _nonce: u8,
    //     _manager_name: String,
    //     _manager_bump: u8,
    //     _package_bump: u8,
    // ) -> Result<()> {
    //     let expense_package = &mut ctx.accounts.expense_package;
    //     let expense_manager = &mut ctx.accounts.expense_manager;
    //     require!(
    //         expense_package.expense_manager == expense_manager.key(),
    //         SlideError::PackageOwnershipMismatch
    //     );
    //     expense_package.state = ExpensePackageState::Approved;
    //     let package_info = expense_package.to_account_info();
    //     let mut package_balance = package_info.try_borrow_mut_lamports()?;
    //     let manager_info = expense_manager.to_account_info();
    //     let mut manager_balance = manager_info.try_borrow_mut_lamports()?;
    //     **package_balance += expense_package.quantity;
    //     **manager_balance -= expense_package.quantity;
    //     Ok(())
    // }
    // pub fn deny_expense_package(
    //     ctx: Context<DenyExpensePackage>,
    //     _owner_pubkey: Pubkey,
    //     _nonce: u8,
    //     _manager_name: String,
    //     _manager_bump: u8,
    //     _package_bump: u8,
    // ) -> Result<()> {
    //     let expense_package = &mut ctx.accounts.expense_package;
    //     let expense_manager = &ctx.accounts.expense_manager;
    //     require!(
    //         expense_package.expense_manager == expense_manager.key(),
    //         SlideError::PackageOwnershipMismatch
    //     );
    //     expense_package.state = ExpensePackageState::Denied;
    //     Ok(())
    // }
    // pub fn withdraw_from_expense_package(
    //     ctx: Context<WithdrawFromExpensePackage>,
    //     _expense_manager_address: Pubkey,
    //     _nonce: u8,
    //     _bump: u8,
    // ) -> Result<()> {
    //     let expense_package = &mut ctx.accounts.expense_package;
    //     require!(
    //         expense_package.token_authority == None,
    //         SlideError::TokensNotImplemented
    //     );
    //     require!(
    //         expense_package.state == ExpensePackageState::Approved,
    //         SlideError::PackageNotApproved
    //     );
    //     let owner = &mut ctx.accounts.owner;
    //     let expense_package_info = expense_package.to_account_info();
    //     let mut expense_package_balance = expense_package_info.try_borrow_mut_lamports()?;
    //     let owner_info = owner.to_account_info();
    //     let mut owner_balance = owner_info.try_borrow_mut_lamports()?;
    //     let reimbursement_amount = expense_package.quantity;
    //     **expense_package_balance -= reimbursement_amount;
    //     **owner_balance += reimbursement_amount;
    //     Ok(())
    // }
}
