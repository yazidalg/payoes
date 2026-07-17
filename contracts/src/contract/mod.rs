use soroban_sdk::contract;

mod admin;
mod escrow;
mod legacy;
mod settlement;

#[contract]
pub struct Payoes;
