use anchor_lang::prelude::*;

#[account]
pub struct ProposalExecution {
    pub proposal: Pubkey,
    pub executed_at: i64, // UnixTimestamp
}

impl ProposalExecution {
    // proposal: 32
    // executed_at: 8
    pub const MAX_SIZE: usize = 32 + 8;
}
