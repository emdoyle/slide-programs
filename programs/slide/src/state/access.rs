use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct AccessRecord {
    pub bump: u8,
    pub user: Pubkey,
    pub expense_manager: Pubkey,
    pub role: Role,
}

// TODO: reserve more space for future changes (also applies to other structs tbh)
impl AccessRecord {
    // bump: 1
    // user: 32
    // expense_manager: 32
    // role: 1
    pub const MAX_SIZE: usize = 1 + 32 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Role {
    Reviewer,
    Admin,
}

impl Role {
    pub fn can_approve_and_deny(&self) -> bool {
        // currently all Roles can approve and deny
        true
    }
}

impl Default for Role {
    fn default() -> Self {
        Self::Reviewer
    }
}
