use anchor_lang::prelude::*;
use solana_program::program_pack::Pack;
use squads_program::state::proposal::Proposal as RawProposal;
use squads_program::state::squad::{Member, Squad as RawSquad};
use std::collections::BTreeMap;
use std::ops::Deref;

// devnet
// pub const SQUADS_PROGRAM_ID: Pubkey =
//     solana_program::pubkey!("SQDSm7ifFqwmgxY5aL59BtHcBGHEgbg5thh4Y9ytdn3");

// devnet manual deploy
pub const SQUADS_PROGRAM_ID: Pubkey =
    solana_program::pubkey!("3BgFvAdsYQsX7MfudNcXcLFizyy2XSBL3uuZeUysR2p7");

// mainnet
// pub const SQUADS_PROGRAM_ID: Pubkey =
//     solana_program::pubkey!("SQUADSxWKud1RVxuhJzNcqYqu7F3GLNiktGzjnNtriT");

pub struct Squad(RawSquad);

impl Deref for Squad {
    type Target = RawSquad;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Clone for Squad {
    fn clone(&self) -> Self {
        let cloned_members: BTreeMap<Pubkey, Member> = self
            .0
            .members
            .iter()
            .map(|(pubkey, member)| {
                (
                    pubkey.clone(),
                    Member {
                        equity_token_account: member.equity_token_account.clone(),
                    },
                )
            })
            .collect();
        Self(RawSquad {
            is_initialized: self.0.is_initialized,
            /// whether or not the owner can still make changes (draft mode)
            open: self.0.open,
            emergency_lock: self.0.emergency_lock,
            /// typical settings
            allocation_type: self.0.allocation_type,
            vote_support: self.0.vote_support,
            vote_quorum: self.0.vote_quorum,
            core_threshold: self.0.core_threshold,
            squad_name: self.0.squad_name.clone(),
            description: self.0.description.clone(),
            token: self.0.token.clone(),
            // future settings placeholders
            future_setting_1: self.0.future_setting_1,
            future_setting_2: self.0.future_setting_2,
            future_setting_3: self.0.future_setting_3,
            future_setting_4: self.0.future_setting_4,
            future_setting_5: self.0.future_setting_5,
            /// misc address for squad specific settings
            // admin address for draft mode (open=true) only
            admin: self.0.admin,
            sol_account: self.0.sol_account,
            mint_address: self.0.mint_address,
            future_address1: self.0.future_address1,
            future_address2: self.0.future_address2,
            future_address3: self.0.future_address3,
            future_address4: self.0.future_address4,
            future_address5: self.0.future_address5,
            proposal_nonce: self.0.proposal_nonce,
            created_on: self.0.created_on,
            /// the squad member list
            members: cloned_members,
            random_id: self.0.random_id.clone(),
            child_index: self.0.child_index,
            member_lock_index: self.0.member_lock_index,
            // reserved for future updates
            reserved: self.0.reserved,
        })
    }
}

impl anchor_lang::Owner for Squad {
    fn owner() -> Pubkey {
        SQUADS_PROGRAM_ID
    }
}

impl anchor_lang::AccountDeserialize for Squad {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        let raw_squad_data = RawSquad::unpack_unchecked(&buf)?;
        Ok(Self(raw_squad_data))
    }
}

impl anchor_lang::AccountSerialize for Squad {}

pub struct Proposal(RawProposal);

impl Deref for Proposal {
    type Target = RawProposal;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Clone for Proposal {
    fn clone(&self) -> Self {
        Self(RawProposal {
            is_initialized: self.0.is_initialized,
            // 0 - text proposal
            // 1 - change support
            // 2 - change quorum
            // 3 - emergency quorum
            // 4 - withdraw SOL
            // 5 - withdraw token
            // 6 - add member
            // 7 - remove member
            // 8 - mint more tokens to a member
            proposal_type: self.0.proposal_type,
            execution_amount: self.0.execution_amount,
            execution_amount_out: self.0.execution_amount_out,
            execution_source: self.0.execution_source,
            execution_destination: self.0.execution_destination,
            creator: self.0.creator,
            squad_address: self.0.squad_address,
            title: self.0.title.clone(),
            description: self.0.description.clone(),
            link: self.0.link.clone(),
            // number of vote options
            votes_num: self.0.votes_num,
            has_voted_num: self.0.has_voted_num,
            has_voted: self.0.has_voted.clone(),
            votes: self.0.votes.clone(),
            // labels of the vote options
            votes_labels: self.0.votes_labels.clone(),
            start_timestamp: self.0.start_timestamp,
            close_timestamp: self.0.close_timestamp,
            created_timestamp: self.0.created_timestamp,
            supply_at_execute: self.0.supply_at_execute,
            members_at_execute: self.0.members_at_execute,
            threshold_at_execute: self.0.threshold_at_execute,
            executed: self.0.executed,
            execute_ready: self.0.execute_ready,
            execution_date: self.0.execution_date,
            instruction_index: self.0.instruction_index,
            multiple_choice: self.0.multiple_choice,
            executed_by: self.0.executed_by,
            proposal_index: self.0.proposal_index,
            // reserved for future updates
            reserved: self.0.reserved,
        })
    }
}

impl anchor_lang::Owner for Proposal {
    fn owner() -> Pubkey {
        SQUADS_PROGRAM_ID
    }
}

impl anchor_lang::AccountDeserialize for Proposal {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        let raw_proposal_data = RawProposal::unpack_unchecked(&buf)?;
        Ok(Self(raw_proposal_data))
    }
}

impl anchor_lang::AccountSerialize for Proposal {}
