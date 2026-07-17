use soroban_sdk::{contractevent, Address, BytesN};

#[contractevent(topics = ["payoes", "payment_registered"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRegistered {
    #[topic]
    pub payment_id: BytesN<32>,
    pub merchant: Address,
    pub paid_token: Address,
    pub required_amount: i128,
}

#[contractevent(topics = ["payoes", "payment_settled"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentSettled {
    #[topic]
    pub payment_id: BytesN<32>,
    #[topic]
    pub payer: Address,
    pub merchant: Address,
    pub token: Address,
    pub gross_amount: i128,
    pub platform_fee_amount: i128,
}

#[contractevent(topics = ["payoes", "payment_deposit_received"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentDepositReceived {
    #[topic]
    pub payment_id: BytesN<32>,
    #[topic]
    pub payer: Address,
    pub paid_token: Address,
    pub amount: i128,
}

#[contractevent(topics = ["payoes", "payment_refunded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRefunded {
    #[topic]
    pub payment_id: BytesN<32>,
    #[topic]
    pub payer: Address,
    pub token: Address,
    pub amount: i128,
    pub reason: u32,
}
