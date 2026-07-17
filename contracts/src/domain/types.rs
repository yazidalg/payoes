use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PaymentStatus {
    Registered = 0,
    Settled = 1,
    Refunded = 2,
    DepositReceived = 3,
}

#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    pub authorization_signer: Address,
    pub fee_recipient: Address,
    pub paused: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct PaymentRecord {
    pub merchant: Address,
    pub paid_token: Address,
    pub required_amount: i128,
    pub settlement_token: Address,
    pub settlement_amount: i128,
    pub platform_fee: i128,
    pub expires_at: u64,
    pub held_amount: i128,
    pub status: PaymentStatus,
}
