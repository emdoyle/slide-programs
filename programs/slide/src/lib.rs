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
        realm: Pubkey,
        governance_authority: Pubkey,
    ) -> Result<()> {
        let expense_manager = &mut ctx.accounts.expense_manager;

        expense_manager.realm = Some(realm);
        expense_manager.governance_authority = Some(governance_authority);
        Ok(())
    }
    pub fn spl_gov_create_access_record(
        ctx: Context<SPLGovCreateAccessRecord>,
        _realm: Pubkey,
        _user: Pubkey,
        role: Role,
    ) -> Result<()> {
        let access_record = &mut ctx.accounts.access_record;

        access_record.role = role;

        Ok(())
    }
    pub fn spl_gov_withdraw_from_expense_manager(
        ctx: Context<SPLGovWithdrawFromExpenseManager>,
        _realm: Pubkey,
    ) -> Result<()> {
        let expense_manager = &mut ctx.accounts.expense_manager;
        let native_treasury = &mut ctx.accounts.native_treasury;

        let manager_info = expense_manager.to_account_info();
        let native_treasury_info = native_treasury.to_account_info();

        let mut manager_balance = manager_info.try_borrow_mut_lamports()?;
        let mut native_treasury_balance = native_treasury_info.try_borrow_mut_lamports()?;

        // need to determine manager balance aside from rent-exemption
        let rent = Rent::get()?;
        let rent_exempt_lamports = rent.minimum_balance(manager_info.data_len()).max(1);

        let withdrawal_amount = **manager_balance - rent_exempt_lamports;

        **manager_balance -= withdrawal_amount;
        **native_treasury_balance += withdrawal_amount;

        Ok(())
    }
    pub fn spl_gov_create_expense_package(
        ctx: Context<SPLGovCreateExpensePackage>,
        _realm: Pubkey,
        _nonce: u32, // assuming constraint has already verified nonce value,
        name: String,
        description: String,
        quantity: u64,
    ) -> Result<()> {
        let owner = &ctx.accounts.owner;
        let expense_manager = &mut ctx.accounts.expense_manager;
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.bump = *ctx.bumps.get("expense_package").unwrap();
        expense_package.expense_manager = expense_manager.key();
        expense_package.owner = owner.key();
        expense_package.name = name;
        expense_package.description = description;
        expense_package.quantity = quantity;

        expense_manager.expense_package_nonce = expense_manager
            .expense_package_nonce
            .checked_add(1)
            .unwrap();

        Ok(())
    }
    pub fn spl_gov_update_expense_package(
        ctx: Context<SPLGovUpdateExpensePackage>,
        _realm: Pubkey,
        _nonce: u32,
        name: String,
        description: String,
        quantity: u64,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.name = name;
        expense_package.description = description;
        expense_package.quantity = quantity;

        Ok(())
    }
    pub fn spl_gov_submit_expense_package(
        ctx: Context<SPLGovSubmitExpensePackage>,
        _realm: Pubkey,
        _nonce: u32,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        // TODO: auto-approve logic
        expense_package.state = ExpensePackageState::Pending;

        Ok(())
    }
    pub fn spl_gov_approve_expense_package(
        ctx: Context<SPLGovApproveExpensePackage>,
        _realm: Pubkey,
        _nonce: u32,
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
        ctx: Context<SPLGovDenyExpensePackage>,
        _realm: Pubkey,
        _nonce: u32,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.state = ExpensePackageState::Denied;

        Ok(())
    }
    pub fn withdraw_from_expense_package(
        ctx: Context<WithdrawFromExpensePackage>,
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
    pub fn squads_initialize_expense_manager(
        ctx: Context<SquadsInitializeExpenseManager>,
    ) -> Result<()> {
        let expense_manager = &mut ctx.accounts.expense_manager;
        let squad = &ctx.accounts.squad;

        expense_manager.squad = Some(squad.key());

        Ok(())
    }
    pub fn squads_create_expense_package(
        ctx: Context<SquadsCreateExpensePackage>,
        _nonce: u32,
        name: String,
        description: String,
        quantity: u64,
    ) -> Result<()> {
        let owner = &ctx.accounts.owner;
        let expense_package = &mut ctx.accounts.expense_package;
        let expense_manager = &mut ctx.accounts.expense_manager;

        expense_package.bump = *ctx.bumps.get("expense_package").unwrap();
        expense_package.expense_manager = expense_manager.key();
        expense_package.owner = owner.key();
        expense_package.name = name;
        expense_package.description = description;
        expense_package.quantity = quantity;

        expense_manager.expense_package_nonce = expense_manager
            .expense_package_nonce
            .checked_add(1)
            .unwrap();

        Ok(())
    }
    pub fn squads_update_expense_package(
        ctx: Context<SquadsUpdateExpensePackage>,
        _nonce: u32,
        name: String,
        description: String,
        quantity: u64,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.name = name;
        expense_package.description = description;
        expense_package.quantity = quantity;

        Ok(())
    }
    pub fn squads_submit_expense_package(
        ctx: Context<SquadsSubmitExpensePackage>,
        _nonce: u32,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.state = ExpensePackageState::Pending;

        Ok(())
    }
    pub fn squads_execute_access_proposal(ctx: Context<SquadsExecuteAccessProposal>) -> Result<()> {
        let proposal = &ctx.accounts.proposal;
        let squad = &ctx.accounts.squad;
        let squad_mint = &ctx.accounts.squad_mint;
        let access_record = &mut ctx.accounts.access_record;

        // TODO: move vote logic, validation logic elsewhere

        if proposal.votes_num != 2 {
            return err!(SlideError::InvalidProposal);
        }

        if proposal.votes_labels.get(0).unwrap().trim_end() != "Approve"
            || proposal.votes_labels.get(1).unwrap().trim_end() != "Deny"
        {
            return err!(SlideError::InvalidProposal);
        }

        // need to do a full parse of the description...
        // could be regex?
        // or strict byte/char offsets
        if !proposal.description.starts_with("[SLIDEPROPOSAL]") {
            return err!(SlideError::InvalidProposal);
        }

        let pass_votes = *proposal.votes.get(0).unwrap();
        let fail_votes = *proposal.votes.get(1).unwrap();
        if pass_votes < fail_votes {
            return err!(SlideError::InvalidProposal);
        }

        // check quorum & support
        let curr_quorum_percent;
        let current_support_percent;
        if proposal.execute_ready {
            curr_quorum_percent =
                (proposal.has_voted.len() as f32 / proposal.members_at_execute as f32) * 100.0;

            current_support_percent =
                (pass_votes as f32 / proposal.supply_at_execute as f32) * 100.0;
        } else {
            curr_quorum_percent =
                (proposal.has_voted.len() as f32 / squad.members.len() as f32) * 100.0;

            current_support_percent = (pass_votes as f32 / squad_mint.supply as f32) * 100.0;
        }

        if curr_quorum_percent < squad.vote_quorum as f32 {
            return err!(SlideError::InvalidProposal);
        }

        if current_support_percent < squad.vote_support as f32 {
            return err!(SlideError::InvalidProposal);
        }

        access_record.bump = *ctx.bumps.get("access_record").unwrap();
        access_record.role = Role::Reviewer;

        Ok(())
    }
    pub fn squads_execute_withdrawal_proposal(
        ctx: Context<SquadsExecuteWithdrawalProposal>,
    ) -> Result<()> {
        let proposal = &ctx.accounts.proposal;
        let squad = &ctx.accounts.squad;
        let squad_mint = &ctx.accounts.squad_mint;
        let squad_treasury = &ctx.accounts.squad_treasury;
        let expense_manager = &ctx.accounts.expense_manager;

        // TODO: move vote logic, validation logic elsewhere

        if proposal.votes_num != 2 {
            return err!(SlideError::InvalidProposal);
        }

        if proposal.votes_labels.get(0).unwrap().trim_end() != "Approve"
            || proposal.votes_labels.get(1).unwrap().trim_end() != "Deny"
        {
            return err!(SlideError::InvalidProposal);
        }

        // need to do a full parse of the description...
        // could be regex?
        // or strict byte/char offsets
        if !proposal.description.starts_with("[SLIDEPROPOSAL]") {
            return err!(SlideError::InvalidProposal);
        }

        let pass_votes = *proposal.votes.get(0).unwrap();
        let fail_votes = *proposal.votes.get(1).unwrap();
        if pass_votes < fail_votes {
            return err!(SlideError::InvalidProposal);
        }

        // check quorum & support
        let curr_quorum_percent;
        let current_support_percent;
        if proposal.execute_ready {
            curr_quorum_percent =
                (proposal.has_voted.len() as f32 / proposal.members_at_execute as f32) * 100.0;

            current_support_percent =
                (pass_votes as f32 / proposal.supply_at_execute as f32) * 100.0;
        } else {
            curr_quorum_percent =
                (proposal.has_voted.len() as f32 / squad.members.len() as f32) * 100.0;

            current_support_percent = (pass_votes as f32 / squad_mint.supply as f32) * 100.0;
        }

        if curr_quorum_percent < squad.vote_quorum as f32 {
            return err!(SlideError::InvalidProposal);
        }

        if current_support_percent < squad.vote_support as f32 {
            return err!(SlideError::InvalidProposal);
        }

        let manager_info = expense_manager.to_account_info();
        let squad_treasury_info = squad_treasury.to_account_info();

        let mut manager_balance = manager_info.try_borrow_mut_lamports()?;
        let mut squad_treasury_balance = squad_treasury_info.try_borrow_mut_lamports()?;

        // need to determine manager balance aside from rent-exemption
        let rent = Rent::get()?;
        let rent_exempt_lamports = rent.minimum_balance(manager_info.data_len()).max(1);

        let withdrawal_amount = **manager_balance - rent_exempt_lamports;

        **manager_balance -= withdrawal_amount;
        **squad_treasury_balance += withdrawal_amount;

        Ok(())
    }
    pub fn squads_approve_expense_package(
        ctx: Context<SquadsApproveExpensePackage>,
        _nonce: u32,
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
    pub fn squads_deny_expense_package(
        ctx: Context<SquadsApproveExpensePackage>,
        _nonce: u32,
    ) -> Result<()> {
        let expense_package = &mut ctx.accounts.expense_package;

        expense_package.state = ExpensePackageState::Denied;

        Ok(())
    }
}
