use soroban_sdk::{panic_with_error, Env};

use crate::domain::error::Error;
use crate::domain::types::{PaymentRecord, PaymentStatus};

pub fn ensure_registered(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::Registered {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

pub fn ensure_deposit_received(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::DepositReceived {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

pub fn ensure_settleable(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::Registered && record.status != PaymentStatus::DepositReceived
    {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

pub fn ensure_refundable(env: &Env, record: &PaymentRecord) {
    if record.status != PaymentStatus::Registered && record.status != PaymentStatus::DepositReceived
    {
        panic_with_error!(env, Error::PaymentAlreadyFinalized);
    }
}

pub fn ensure_not_expired(env: &Env, record: &PaymentRecord) {
    if record.expires_at < env.ledger().timestamp() {
        panic_with_error!(env, Error::PaymentExpired);
    }
}
