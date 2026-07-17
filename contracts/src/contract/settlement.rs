use soroban_sdk::{
    contractimpl, panic_with_error, token, Address, BytesN, Env, MuxedAddress,
};

use crate::domain::error::Error;
use crate::domain::events::{PaymentRefunded, PaymentSettled};
use crate::domain::types::PaymentStatus;
use crate::storage::{load_config, load_payment, save_payment, DataKey};
use crate::validation::{ensure_deposit_received, ensure_refundable, ensure_settleable};

use super::{Payoes, PayoesArgs, PayoesClient};

#[contractimpl]
impl Payoes {
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
        save_payment(&env, &payment_key, &record);

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
        save_payment(&env, &payment_key, &record);

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

        if gross_amount <= 0
            || merchant_amount < 0
            || merchant_amount > gross_amount
            || gross_amount - merchant_amount != record.platform_fee
        {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        record.status = PaymentStatus::Settled;
        record.held_amount = 0;
        save_payment(&env, &payment_key, &record);

        PaymentSettled {
            payment_id,
            payer,
            merchant: record.merchant,
            token: record.settlement_token,
            gross_amount,
            platform_fee_amount: record.platform_fee,
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
        save_payment(&env, &payment_key, &record);

        PaymentRefunded {
            payment_id,
            payer,
            token: record.paid_token,
            amount,
            reason,
        }
        .publish(&env);
    }
}
