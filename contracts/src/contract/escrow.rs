use soroban_sdk::{
    contractimpl, panic_with_error, token, Address, BytesN, Env, MuxedAddress,
};

use crate::domain::error::Error;
use crate::domain::events::{PaymentDepositReceived, PaymentRefunded, PaymentRegistered};
use crate::domain::types::{PaymentRecord, PaymentStatus};
use crate::storage::{get_payment, load_config, load_payment, save_payment, DataKey};
use crate::validation::{ensure_not_expired, ensure_registered};

use super::{Payoes, PayoesArgs, PayoesClient};

#[contractimpl]
impl Payoes {
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
            || platform_fee > settlement_amount
        {
            panic_with_error!(&env, Error::InvalidAmount);
        }

        let payment_key = DataKey::Payment(payment_id.clone());
        if let Some(existing) = get_payment(&env, &payment_key) {
            if existing.status != PaymentStatus::Registered
                && existing.status != PaymentStatus::Refunded
            {
                panic_with_error!(&env, Error::PaymentAlreadyFinalized);
            }
        }

        save_payment(
            &env,
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
            save_payment(&env, &payment_key, &record);

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
        save_payment(&env, &payment_key, &record);

        PaymentDepositReceived {
            payment_id: payment_id.clone(),
            payer: payer.clone(),
            paid_token: record.paid_token.clone(),
            amount,
        }
        .publish(&env);

        0
    }

    pub fn get_payment(env: Env, payment_id: BytesN<32>) -> PaymentRecord {
        load_payment(&env, &DataKey::Payment(payment_id))
    }
}
