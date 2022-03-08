use crate::state::*;
use crate::utils::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(name: String, realm: Pubkey, governance_authority: Pubkey, token_owner_bump: u8)]
pub struct SPLGovInitializeExpenseManager<'info> {
    #[account(mut, seeds = [b"expense_manager", name.as_bytes()], bump = expense_manager.bump)]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), member.key().as_ref()],
        bump = token_owner_bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(mut)]
    pub member: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(manager_name: String, realm: Pubkey, nonce: u32, token_owner_bump: u8)]
pub struct SPLGovCreateExpensePackage<'info> {
    #[account(init, seeds = [b"expense_package", expense_manager.key().as_ref(), owner.key().as_ref(), &nonce.to_le_bytes()], bump, payer = owner, space = ExpensePackage::MAX_SIZE + 8)]
    pub expense_package: Account<'info, ExpensePackage>,
    #[account(
        mut,
        seeds = [b"expense_manager", manager_name.as_bytes()],
        bump = expense_manager.bump,
        constraint = nonce == expense_manager.expense_package_nonce @ SlideError::IncorrectNonce,
        constraint = Some(realm) == expense_manager.realm @ SlideError::SPLGovRealmMismatch
    )]
    pub expense_manager: Account<'info, ExpenseManager>,
    #[account(
        seeds = [b"governance", realm.as_ref(), expense_manager.membership_token_mint.as_ref(), owner.key().as_ref()],
        bump = token_owner_bump,
        seeds::program = SPL_GOV_PROGRAM_ID,
        constraint = token_owner_record.governing_token_deposit_amount > 0 @ SlideError::UserIsNotDAOMember
    )]
    pub token_owner_record: Account<'info, TokenOwnerRecord>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// #[derive(Accounts)]
// #[instruction(name: String, description: String, quantity: u64, token_authority: Option<Pubkey>, expense_manager_address: Pubkey, nonce: u8, bump: u8)]
// pub struct SPLGovUpdateExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     pub owner: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction(expense_manager_address: Pubkey, nonce: u8, bump: u8)]
// pub struct SPLGovSubmitExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager_address.as_ref(), owner.key().as_ref(), &[nonce]], bump = bump, has_one = owner)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     pub owner: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction(owner_pubkey: Pubkey, nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
// pub struct SPLGovApproveExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner_pubkey.as_ref(), &[nonce]], bump = package_bump)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     #[account(mut, seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump, has_one = authority)]
//     pub expense_manager: Account<'info, ExpenseManager>,
//     pub authority: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction(owner_pubkey: Pubkey, nonce: u8, manager_name: String, manager_bump: u8, package_bump: u8)]
// pub struct SPLGovDenyExpensePackage<'info> {
//     #[account(mut, seeds = [b"expense_package", expense_manager.key().as_ref(), owner_pubkey.as_ref(), &[nonce]], bump = package_bump)]
//     pub expense_package: Account<'info, ExpensePackage>,
//     #[account(mut, seeds = [b"expense_manager", manager_name.as_bytes()], bump = manager_bump, has_one = authority)]
//     pub expense_manager: Account<'info, ExpenseManager>,
//     pub authority: Signer<'info>,
// }
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SPLGovCreateAccessProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SPLGovCreateFundingProposal<'info> {}
//
// #[derive(Accounts)]
// #[instruction()]
// pub struct SPLGovCreateWithdrawalProposal<'info> {}
