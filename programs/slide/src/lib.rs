pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;
use instructions::*;
use state::*;

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
        _governance_bump: u8,
    ) -> Result<()> {
        let expense_manager = &mut ctx.accounts.expense_manager;
        expense_manager.realm = Some(realm);
        expense_manager.governance_authority = Some(governance_authority);
        Ok(())
    }
    pub fn spl_gov_create_access_record(
        ctx: Context<SPLGovCreateAccessRecord>,
        _manager_name: String,
        _realm: Pubkey,
        _user: Pubkey,
        role: Role,
        _governance_bump: u8,
    ) -> Result<()> {
        let access_record = &mut ctx.accounts.access_record;

        access_record.role = role;

        Ok(())
    }
    pub fn spl_gov_create_expense_package(
        ctx: Context<SPLGovCreateExpensePackage>,
        _manager_name: String,
        _realm: Pubkey,
        _nonce: u32, // assuming constraint has already verified nonce value
        _token_owner_bump: u8,
    ) -> Result<()> {
        let expense_manager = &mut ctx.accounts.expense_manager;
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.bump = *ctx.bumps.get("expense_package").unwrap();

        expense_manager.expense_package_nonce = expense_manager
            .expense_package_nonce
            .checked_add(1)
            .unwrap();

        Ok(())
    }
    pub fn spl_gov_update_expense_package(
        ctx: Context<SPLGovUpdateExpensePackage>,
        _manager_name: String,
        _realm: Pubkey,
        package_name: String,
        description: String,
        quantity: u64,
        _nonce: u32,
        _token_owner_bump: u8,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.name = package_name;
        expense_package.description = description;
        expense_package.quantity = quantity;

        Ok(())
    }
    pub fn spl_gov_submit_expense_package(
        ctx: Context<SPLGovSubmitExpensePackage>,
        _manager_name: String,
        _realm: Pubkey,
        _nonce: u32,
        _token_owner_bump: u8,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        // TODO: auto-approve logic
        expense_package.state = ExpensePackageState::Pending;

        Ok(())
    }
    pub fn spl_gov_approve_expense_package(
        ctx: Context<SPLGovApproveExpensePackage>,
        _manager_name: String,
        _realm: Pubkey,
        _owner_pubkey: Pubkey,
        _nonce: u32,
        _token_owner_bump: u8,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;
        let expense_manager = &mut ctx.accounts.expense_manager;

        expense_package.state = ExpensePackageState::Approved;
        let package_info = expense_package.to_account_info();
        let mut package_balance = package_info.try_borrow_mut_lamports()?;
        let manager_info = expense_manager.to_account_info();
        let mut manager_balance = manager_info.try_borrow_mut_lamports()?;
        **package_balance += expense_package.quantity;
        **manager_balance -= expense_package.quantity;

        Ok(())
    }
    pub fn spl_gov_deny_expense_package(
        ctx: Context<SPLGovApproveExpensePackage>,
        _manager_name: String,
        _realm: Pubkey,
        _owner_pubkey: Pubkey,
        _nonce: u32,
        _token_owner_bump: u8,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.state = ExpensePackageState::Denied;

        Ok(())
    }
    pub fn withdraw_from_expense_package(
        ctx: Context<WithdrawFromExpensePackage>,
        _expense_manager_address: Pubkey,
        _nonce: u32,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;
        let owner = &mut ctx.accounts.owner;

        let expense_package_info = expense_package.to_account_info();
        let mut expense_package_balance = expense_package_info.try_borrow_mut_lamports()?;
        let owner_info = owner.to_account_info();
        let mut owner_balance = owner_info.try_borrow_mut_lamports()?;
        let reimbursement_amount = expense_package.quantity;

        **expense_package_balance -= reimbursement_amount;
        **owner_balance += reimbursement_amount;

        Ok(())
    }
}
