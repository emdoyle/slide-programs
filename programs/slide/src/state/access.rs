use anchor_lang::prelude::*;

#[account]
#[derive(Default, Eq, PartialEq)]
pub struct AccessRecord {
    pub role: Role,
}

// TODO: reserve more space for future changes (also applies to other structs tbh)
impl AccessRecord {
    // role: 1
    pub const MAX_SIZE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Role {
    Admin,
    Reviewer,
}

impl Default for Role {
    fn default() -> Self {
        Self::Reviewer
    }
}