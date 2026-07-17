use soroban_sdk::{
    contractimpl, panic_with_error, token, Address, BytesN, Env, MuxedAddress,
};

use crate::domain::error::Error;
use crate::domain::events::PaymentSettled;
use crate::storage::{has_legacy_payment, load_config, mark_legacy_payment, DataKey};

use super::{Payoes, PayoesArgs, PayoesClient};

#[contractimpl]
impl Payoes {
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
        if has_legacy_payment(&env, &payment_key) {
            panic_with_error!(&env, Error::PaymentAlreadySettled);
        }

        config.authorization_signer.require_auth();
        payer.require_auth();

        mark_legacy_payment(&env, &payment_key);

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
}
