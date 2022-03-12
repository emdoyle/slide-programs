use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

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
        seeds = [b"expense_package", expense_manager.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()],
        bump,
        payer = owner,
        space = ExpensePackage::MAX_SIZE + 8
    )]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        mut,
        seeds = [b"expense_manager", manager_name.as_bytes()],
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
//
// #[derive(Accounts)]
// #[instruction(name: String, description: String, quantity: u64, token_authority: Option<Pubkey>, expense_manager_address: Pubkey, nonce: u8, bump: u8)]
// pub struct SquadsUpdateExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     pub owner: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction(expense_manager_address: Pubkey, nonce: u8, bump: u8)]
// pub struct SquadsSubmitExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     pub owner: Signer<'info>,
// }
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
// pub struct ExecuteAccessProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct ExecuteWithdrawalProposal<'info> {}
