use soroban_sdk::{contracttype, panic_with_error, BytesN, Env};

use crate::domain::error::Error;
use crate::domain::types::{Config, PaymentRecord};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    Payment(BytesN<32>),
    LegacyPayment(BytesN<32>),
}

pub fn has_config(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Config)
}

pub fn load_config(env: &Env) -> Config {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

pub fn save_config(env: &Env, config: &Config) {
    env.storage().instance().set(&DataKey::Config, config);
}

pub fn load_payment(env: &Env, payment_key: &DataKey) -> PaymentRecord {
    env.storage()
        .persistent()
        .get(payment_key)
        .unwrap_or_else(|| panic_with_error!(env, Error::PaymentNotRegistered))
}

pub fn get_payment(env: &Env, payment_key: &DataKey) -> Option<PaymentRecord> {
    env.storage().persistent().get(payment_key)
}

pub fn save_payment(env: &Env, payment_key: &DataKey, record: &PaymentRecord) {
    env.storage().persistent().set(payment_key, record);
}

pub fn has_legacy_payment(env: &Env, payment_key: &DataKey) -> bool {
    env.storage().persistent().has(payment_key)
}

pub fn mark_legacy_payment(env: &Env, payment_key: &DataKey) {
    env.storage().persistent().set(payment_key, &true);
}
