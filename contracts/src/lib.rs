#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, BytesN, Env, MuxedAddress,
};

#[contract]
pub struct Payoes;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    Paused = 4,
    InvalidAmount = 5,
    PaymentExpired = 6,
    PaymentNotRegistered = 7,
    PaymentAlreadyFinalized = 8,
    PaymentAlreadySettled = 9,
}

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
enum DataKey {
    Config,
    Payment(BytesN<32>),
    LegacyPayment(BytesN<32>),
}

#[contracttype]
#[derive(Clone)]
struct Config {
    admin: Address,
    authorization_signer: Address,
    fee_recipient: Address,
    paused: bool,
}

#[contracttype]
#[derive(Clone)]
struct PaymentRecord {
    merchant: Address,
    paid_token: Address,
    required_amount: i128,
    settlement_token: Address,
    settlement_amount: i128,
    platform_fee: i128,
    expires_at: u64,
    held_amount: i128,
    status: PaymentStatus,
}

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

#[contractimpl]
impl Payoes {
    pub fn initialize(
        env: Env,
        admin: Address,
        authorization_signer: Address,
        fee_recipient: Address,
    ) {
        if env.storage().instance().has(&DataKey::Config) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(
            &DataKey::Config,
            &Config {
                admin,
                authorization_signer,
                fee_recipient,
                paused: false,
            },
        );
    }

    /// Legacy direct wallet payment (same settlement asset only).
    pub fn pay(
        env: Env,
        payer: Address,
        payment_id: BytesN<32>,
        token: Address,
        gross_amount: i128,
        platform_fee_amount: i128,
        merchant: Address,
        expires_at: u64,
    ) -> i128 {
        let config = load_config(&env);

        if config.paused {
            panic_with_error!(&env, Error::Paused);
        }

        if expires_at < env.ledger().timestamp() {
            panic_with_error!(&env, Error::PaymentExpired);
        }

        if gross_amount <= 0 || platform_fee_amount < 0 || platform_fee_amount > gross_amount {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let payment_key = DataKey::LegacyPayment(payment_id.clone());
        if env.storage().persistent().has(&payment_key) {
            panic_with_error!(&env, Error::PaymentAlreadySettled);
        }

        config.authorization_signer.require_auth();
        payer.require_auth();

        env.storage().persistent().set(&payment_key, &true);

        let merchant_amount = gross_amount - platform_fee_amount;
        let token_client = token::TokenClient::new(&env, &token);
        token_client.transfer(
            &payer,
            &MuxedAddress::from(merchant.clone()),
            &merchant_amount,
        );

        if platform_fee_amount > 0 {
            token_client.transfer(
                &payer,
                &MuxedAddress::from(config.fee_recipient.clone()),
                &platform_fee_amount,
            );
        }

        PaymentSettled {
            payment_id,
            payer,
            merchant,
            token,
            gross_amount,
            platform_fee_amount,
        }
        .publish(&env);

        merchant_amount
    }

    pub fn register_payment(
        env: Env,
        payment_id: BytesN<32>,
        merchant: Address,
        paid_token: Address,
        required_amount: i128,
        settlement_token: Address,
        settlement_amount: i128,
        platform_fee: i128,
        expires_at: u64,
    ) {
        let config = load_config(&env);
        if config.paused {
            panic_with_error!(&env, Error::Paused);
        }

        config.authorization_signer.require_auth();

        if required_amount <= 0
            || settlement_amount <= 0
            || platform_fee < 0
            || platform_fee > required_amount
        {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let payment_key = DataKey::Payment(payment_id.clone());
        if let Some(existing) = env
            .storage()
            .persistent()
            .get::<DataKey, PaymentRecord>(&payment_key)
        {
            if existing.status != PaymentStatus::Registered
                && existing.status != PaymentStatus::Refunded
            {
                panic_with_error!(&env, Error::PaymentAlreadyFinalized);
            }
        }

        env.storage().persistent().set(
            &payment_key,
            &PaymentRecord {
                merchant: merchant.clone(),
                paid_token: paid_token.clone(),
                required_amount,
                settlement_token: settlement_token.clone(),
                settlement_amount,
                platform_fee,
                expires_at,
                held_amount: 0,
                status: PaymentStatus::Registered,
            },
        );

        PaymentRegistered {
            payment_id,
            merchant,
            paid_token,
            required_amount,
        }
        .publish(&env);
    }

    pub fn deposit(env: Env, payer: Address, payment_id: BytesN<32>, amount: i128) -> i128 {
        let config = load_config(&env);
        if config.paused {
            panic_with_error!(&env, Error::Paused);
        }

        config.authorization_signer.require_auth();
        payer.require_auth();

        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let payment_key = DataKey::Payment(payment_id.clone());
        let mut record = load_payment(&env, &payment_key);

        ensure_registered(&env, &record);
        ensure_not_expired(&env, &record);

        let contract = env.current_contract_address();
        let token_client = token::TokenClient::new(&env, &record.paid_token);
        token_client.transfer(&payer, &MuxedAddress::from(contract.clone()), &amount);

        if amount < record.required_amount {
            token_client.transfer(
                &contract,
                &MuxedAddress::from(payer.clone()),
                &amount,
            );

            record.status = PaymentStatus::Refunded;
            record.held_amount = 0;
            env.storage().persistent().set(&payment_key, &record);

            PaymentRefunded {
                payment_id: payment_id.clone(),
                payer: payer.clone(),
                token: record.paid_token.clone(),
                amount,
                reason: 1,
            }
            .publish(&env);

            return 0;
        }

        record.status = PaymentStatus::DepositReceived;
        record.held_amount = amount;
        env.storage().persistent().set(&payment_key, &record);

        PaymentDepositReceived {
            payment_id: payment_id.clone(),
            payer: payer.clone(),
            paid_token: record.paid_token.clone(),
            amount,
        }
        .publish(&env);

        0
    }

    pub fn settle_same_asset_deposit(
        env: Env,
        payment_id: BytesN<32>,
        payer: Address,
    ) -> i128 {
        let config = load_config(&env);
        if config.paused {
            panic_with_error!(&env, Error::Paused);
        }

        config.authorization_signer.require_auth();

        let payment_key = DataKey::Payment(payment_id.clone());
        let mut record = load_payment(&env, &payment_key);
        ensure_deposit_received(&env, &record);

        if record.paid_token != record.settlement_token {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let gross_amount = record.held_amount;
        let merchant_amount = record.settlement_amount - record.platform_fee;
        let contract = env.current_contract_address();
        let token_client = token::TokenClient::new(&env, &record.paid_token);

        token_client.transfer(
            &contract,
            &MuxedAddress::from(record.merchant.clone()),
            &merchant_amount,
        );

        if record.platform_fee > 0 {
            token_client.transfer(
                &contract,
                &MuxedAddress::from(config.fee_recipient.clone()),
                &record.platform_fee,
            );
        }

        record.status = PaymentStatus::Settled;
        record.held_amount = 0;
        env.storage().persistent().set(&payment_key, &record);

        PaymentSettled {
            payment_id,
            payer,
            merchant: record.merchant.clone(),
            token: record.paid_token.clone(),
            gross_amount,
            platform_fee_amount: record.platform_fee,
        }
        .publish(&env);

        merchant_amount
    }

    pub fn release_deposit_to_operator(env: Env, payment_id: BytesN<32>) -> i128 {
        let config = load_config(&env);
        if config.paused {
            panic_with_error!(&env, Error::Paused);
        }

        config.authorization_signer.require_auth();

        let payment_key = DataKey::Payment(payment_id.clone());
        let record = load_payment(&env, &payment_key);
        ensure_deposit_received(&env, &record);

        if record.held_amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let contract = env.current_contract_address();
        let token_client = token::TokenClient::new(&env, &record.paid_token);
        token_client.transfer(
            &contract,
            &MuxedAddress::from(config.authorization_signer.clone()),
            &record.held_amount,
        );

        record.held_amount
    }

    pub fn refund_held_deposit(
        env: Env,
        payment_id: BytesN<32>,
        payer: Address,
        reason: u32,
    ) {
        let config = load_config(&env);
        if config.paused {
            panic_with_error!(&env, Error::Paused);
        }

        config.authorization_signer.require_auth();

        let payment_key = DataKey::Payment(payment_id.clone());
        let mut record = load_payment(&env, &payment_key);
        ensure_deposit_received(&env, &record);

        if record.held_amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let contract = env.current_contract_address();
        let token_client = token::TokenClient::new(&env, &record.paid_token);
        let amount = record.held_amount;

        token_client.transfer(
            &contract,
            &MuxedAddress::from(payer.clone()),
            &amount,
        );

        record.status = PaymentStatus::Refunded;
        record.held_amount = 0;
        env.storage().persistent().set(&payment_key, &record);

        PaymentRefunded {
            payment_id,
            payer,
            token: record.paid_token,
            amount,
            reason,
        }
        .publish(&env);
    }

    pub fn record_settlement(
        env: Env,
        payment_id: BytesN<32>,
        payer: Address,
        gross_amount: i128,
        merchant_amount: i128,
    ) {
        let config = load_config(&env);
        config.authorization_signer.require_auth();

        let payment_key = DataKey::Payment(payment_id.clone());
        let mut record = load_payment(&env, &payment_key);
        ensure_settleable(&env, &record);

        record.status = PaymentStatus::Settled;
        record.held_amount = 0;
        env.storage().persistent().set(&payment_key, &record);

        let platform_fee = gross_amount - merchant_amount;

        PaymentSettled {
            payment_id,
            payer,
            merchant: record.merchant,
            token: record.settlement_token,
            gross_amount,
            platform_fee_amount: platform_fee,
        }
        .publish(&env);
    }

    pub fn record_refund(
        env: Env,
        payment_id: BytesN<32>,
        payer: Address,
        amount: i128,
        reason: u32,
    ) {
        let config = load_config(&env);
        config.authorization_signer.require_auth();

        let payment_key = DataKey::Payment(payment_id.clone());
        let mut record = load_payment(&env, &payment_key);
        ensure_refundable(&env, &record);

        record.status = PaymentStatus::Refunded;
        record.held_amount = 0;
        env.storage().persistent().set(&payment_key, &record);

        PaymentRefunded {
            payment_id,
            payer,
            token: record.paid_token,
            amount,
            reason,
        }
        .publish(&env);
    }

    pub fn get_payment(env: Env, payment_id: BytesN<32>) -> PaymentRecord {
        load_payment(&env, &DataKey::Payment(payment_id))
    }

    pub fn set_authorization_signer(env: Env, authorization_signer: Address) {
        let mut config = load_config(&env);
        config.admin.require_auth();
        config.authorization_signer = authorization_signer;
        env.storage().instance().set(&DataKey::Config, &config);
    }

    pub fn set_fee_recipient(env: Env, fee_recipient: Address) {
        let mut config = load_config(&env);
        config.admin.require_auth();
        config.fee_recipient = fee_recipient;
        env.storage().instance().set(&DataKey::Config, &config);
    }

    pub fn set_paused(env: Env, paused: bool) {
        let mut config = load_config(&env);
        config.admin.require_auth();
        config.paused = paused;
        env.storage().instance().set(&DataKey::Config, &config);
    }
}

fn load_config(env: &Env) -> Config {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn load_payment(env: &Env, payment_key: &DataKey) -> PaymentRecord {
    env.storage()
        .persistent()
        .get(payment_key)
        .unwrap_or_else(|| panic_with_error!(env, Error::PaymentNotRegistered))
}

fn ensure_registered(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::Registered {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

fn ensure_deposit_received(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::DepositReceived {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

fn ensure_settleable(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::Registered && record.status != PaymentStatus::DepositReceived
    {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

fn ensure_refundable(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::Registered && record.status != PaymentStatus::DepositReceived
    {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

fn ensure_not_expired(env: &Env, record: &PaymentRecord) {
    if record.expires_at < env.ledger().timestamp() {
        panic_with_error!(env, Error::PaymentExpired);
    }
}

mod test;
