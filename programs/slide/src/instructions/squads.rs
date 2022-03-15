use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
#[instruction(name: String)]
pub struct SquadsInitializeExpenseManager<'info> {
    #[account(mut, seeds = [b"expense-manager", name.as_bytes()], bump = expense_manager.bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [member.key().as_ref(), squad.key().as_ref(), b"!memberequity"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID,
        constraint = member_equity.mint == squad.mint_address @ SlideError::SquadMintMismatch,
        constraint = member_equity.amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub member_equity: Account<'info, TokenAccount>,
    #[account(
        seeds = [squad.admin.as_ref(), squad.random_id.as_bytes(), b"!squad"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID
    )]
    pub squad: Box<Account<'info, Squad>>,
    #[account(mut)]
    pub member: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(nonce: u32, manager_name: String)]
pub struct SquadsCreateExpensePackage<'info> {
    #[account(
        init,
        seeds = [b"expense-package", expense_manager.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump,
        payer = owner,
        space = ExpensePackage::MAX_SIZE + 8
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        mut,
        seeds = [b"expense-manager", manager_name.as_bytes()],
        bump = expense_manager.bump,
        constraint = nonce == expense_manager.expense_package_nonce @ SlideError::IncorrectNonce,
        constraint = Some(squad.key()) == expense_manager.squad @ SlideError::SquadMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [owner.key().as_ref(), squad.key().as_ref(), b"!memberequity"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID,
        constraint = member_equity.mint == squad.mint_address @ SlideError::SquadMintMismatch,
        constraint = member_equity.amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub member_equity: Account<'info, TokenAccount>,
    #[account(
        seeds = [squad.admin.as_ref(), squad.random_id.as_bytes(), b"!squad"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID
    )]
    pub squad: Box<Account<'info, Squad>>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u32, manager_name: String, name: String, description: String, quantity: u64)]
pub struct SquadsUpdateExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_manager.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        seeds = [b"expense-manager", manager_name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(squad.key()) == expense_manager.squad @ SlideError::SquadMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [owner.key().as_ref(), squad.key().as_ref(), b"!memberequity"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID,
        constraint = member_equity.mint == squad.mint_address @ SlideError::SquadMintMismatch,
        constraint = member_equity.amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub member_equity: Account<'info, TokenAccount>,
    #[account(
        seeds = [squad.admin.as_ref(), squad.random_id.as_bytes(), b"!squad"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID
    )]
    pub squad: Box<Account<'info, Squad>>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(manager_name: String, nonce: u32)]
pub struct SquadsSubmitExpensePackage<'info> {
    #[account(
        mut,
        seeds = [b"expense-package", expense_manager.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump = expense_package.bump,
        constraint = expense_package.state == ExpensePackageState::Created @ SlideError::PackageFrozen,
        constraint = expense_package.quantity > 0 && !expense_package.name.is_empty() @ SlideError::PackageMissingInfo,
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        seeds = [b"expense-manager", manager_name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(squad.key()) == expense_manager.squad @ SlideError::SquadMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [owner.key().as_ref(), squad.key().as_ref(), b"!memberequity"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID,
        constraint = member_equity.mint == squad.mint_address @ SlideError::SquadMintMismatch,
        constraint = member_equity.amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub member_equity: Account<'info, TokenAccount>,
    #[account(
        seeds = [squad.admin.as_ref(), squad.random_id.as_bytes(), b"!squad"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID
    )]
    pub squad: Box<Account<'info, Squad>>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct SquadsExecuteAccessProposal<'info> {
    #[account(
        seeds = [squad.key().as_ref(), &proposal.proposal_index.to_le_bytes(), b"!proposal"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID,
        constraint = proposal.proposal_type == 0 @ SlideError::WrongProposalType,
        constraint = proposal.executed == false @ SlideError::ProposalAlreadyExecuted
    )]
    pub proposal: Box<Account<'info, Proposal>>,
    #[account(
        init,
        seeds = [b"access-record", expense_manager.key().as_ref(), member.key().as_ref()],
        bump,
        payer = signer,
        space = AccessRecord::MAX_SIZE + 8
    )]
    pub access_record: Account<'info, AccessRecord>,
    #[account(
        seeds = [b"expense-manager", expense_manager.name.as_bytes()],
        bump = expense_manager.bump,
        constraint = Some(squad.key()) == expense_manager.squad @ SlideError::SquadMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [squad.admin.as_ref(), squad.random_id.as_bytes(), b"!squad"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID
    )]
    pub squad: Box<Account<'info, Squad>>,
    #[account(
        seeds = [squad.key().as_ref(), b"!squadmint"],
        bump,
        seeds::program = SQUADS_PROGRAM_ID
    )]
    pub squad_mint: Account<'info, Mint>,
    /// CHECK: Any address can be a member of a Squad
    pub member: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

//
// #[derive(Accounts)]
// #[instruction(owner_pubkey: Pubkey, nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
// pub struct SquadsApproveExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner_pubkey.as_ref(), &[nonce]], bump = package_bump)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     #[account(mut, seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump, has_one = authority)]
//     pub expense_manager: Account<'info, ExpenseManager>,
//     pub authority: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction(owner_pubkey: Pubkey, nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
// pub struct SquadsDenyExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner_pubkey.as_ref(), &[nonce]], bump = package_bump)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     #[account(mut, seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump, has_one = authority)]
//     pub expense_manager: Account<'info, ExpenseManager>,
//     pub authority: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SquadsCreateAccessProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SquadsCreateFundingProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SquadsCreateWithdrawalProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct ExecuteWithdrawalProposal<'info> {}
