#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, BytesN, Env, MuxedAddress,
};

#[contract]
pub struct PayoesPaymentRouter;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    Paused = 4,
    InvalidAmount = 5,
    PaymentExpired = 6,
    PaymentAlreadySettled = 7,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Config,
    Payment(BytesN<32>),
}

#[contracttype]
#[derive(Clone)]
struct Config {
    admin: Address,
    authorization_signer: Address,
    fee_recipient: Address,
    paused: bool,
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

#[contractimpl]
impl PayoesPaymentRouter {
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

        let payment_key = DataKey::Payment(payment_id.clone());
        if env.storage().persistent().has(&payment_key) {
            panic_with_error!(&env, Error::PaymentAlreadySettled);
        }

        // The backend authorization binds every payment term to this invocation.
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

mod test;
