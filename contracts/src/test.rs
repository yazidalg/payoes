#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token, Address, BytesN, Env};

#[test]
fn legacy_pay_settles_merchant_and_platform_fee() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorization_signer = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let asset = env.register_stellar_asset_contract_v2(admin.clone());
    let token = asset.address();
    let token_admin = token::StellarAssetClient::new(&env, &token);
    token_admin.mint(&payer, &1_000);

    let contract_id = env.register(Payoes, ());
    let client = PayoesClient::new(&env, &contract_id);
    client.initialize(&admin, &authorization_signer, &fee_recipient);

    let net_amount = client.pay(
        &payer,
        &BytesN::from_array(&env, &[7; 32]),
        &token,
        &1_000,
        &30,
        &merchant,
        &(env.ledger().timestamp() + 60),
    );

    let token_client = token::TokenClient::new(&env, &token);
    assert_eq!(net_amount, 970);
    assert_eq!(token_client.balance(&payer), 0);
    assert_eq!(token_client.balance(&merchant), 970);
    assert_eq!(token_client.balance(&fee_recipient), 30);
}

#[test]
fn refunds_underpayment_on_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorization_signer = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let asset = env.register_stellar_asset_contract_v2(admin.clone());
    let token = asset.address();
    let token_admin = token::StellarAssetClient::new(&env, &token);
    token_admin.mint(&payer, &1_000);

    let contract_id = env.register(Payoes, ());
    let client = PayoesClient::new(&env, &contract_id);
    client.initialize(&admin, &authorization_signer, &fee_recipient);

    let payment_id = BytesN::from_array(&env, &[9; 32]);
    client.register_payment(
        &payment_id,
        &merchant,
        &token,
        &1_000,
        &token,
        &1_000,
        &30,
        &(env.ledger().timestamp() + 60),
    );

    let merchant_amount = client.deposit(&payer, &payment_id, &500);
    let token_client = token::TokenClient::new(&env, &token);

    assert_eq!(merchant_amount, 0);
    assert_eq!(token_client.balance(&payer), 1_000);
    assert_eq!(token_client.balance(&merchant), 0);
    assert_eq!(client.get_payment(&payment_id).status, PaymentStatus::Refunded);
}

#[test]
fn settles_same_asset_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorization_signer = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let asset = env.register_stellar_asset_contract_v2(admin.clone());
    let token = asset.address();
    let token_admin = token::StellarAssetClient::new(&env, &token);
    token_admin.mint(&payer, &1_000);

    let contract_id = env.register(Payoes, ());
    let client = PayoesClient::new(&env, &contract_id);
    client.initialize(&admin, &authorization_signer, &fee_recipient);

    let payment_id = BytesN::from_array(&env, &[3; 32]);
    client.register_payment(
        &payment_id,
        &merchant,
        &token,
        &1_000,
        &token,
        &1_000,
        &30,
        &(env.ledger().timestamp() + 60),
    );

    let merchant_amount = client.deposit(&payer, &payment_id, &1_000);
    let token_client = token::TokenClient::new(&env, &token);
    let contract_address = contract_id.clone();

    assert_eq!(merchant_amount, 0);
    assert_eq!(token_client.balance(&payer), 0);
    assert_eq!(token_client.balance(&contract_address), 1_000);
    assert_eq!(
        client.get_payment(&payment_id).status,
        PaymentStatus::DepositReceived
    );

    let settled_amount = client.settle_same_asset_deposit(&payment_id, &payer);
    assert_eq!(settled_amount, 970);
    assert_eq!(token_client.balance(&merchant), 970);
    assert_eq!(token_client.balance(&fee_recipient), 30);
    assert_eq!(token_client.balance(&contract_address), 0);
    assert_eq!(client.get_payment(&payment_id).status, PaymentStatus::Settled);
}

#[test]
fn holds_cross_asset_deposit_until_settlement() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let authorization_signer = Address::generate(&env);
    let fee_recipient = Address::generate(&env);
    let payer = Address::generate(&env);
    let merchant = Address::generate(&env);

    let paid_asset = env.register_stellar_asset_contract_v2(admin.clone());
    let paid_token = paid_asset.address();
    let settlement_asset = env.register_stellar_asset_contract_v2(admin.clone());
    let settlement_token = settlement_asset.address();

    let paid_token_admin = token::StellarAssetClient::new(&env, &paid_token);
    paid_token_admin.mint(&payer, &1_000);

    let contract_id = env.register(Payoes, ());
    let client = PayoesClient::new(&env, &contract_id);
    client.initialize(&admin, &authorization_signer, &fee_recipient);

    let payment_id = BytesN::from_array(&env, &[4; 32]);
    client.register_payment(
        &payment_id,
        &merchant,
        &paid_token,
        &1_000,
        &settlement_token,
        &900,
        &30,
        &(env.ledger().timestamp() + 60),
    );

    let merchant_amount = client.deposit(&payer, &payment_id, &1_000);
    let paid_token_client = token::TokenClient::new(&env, &paid_token);
    let contract_address = contract_id.clone();

    assert_eq!(merchant_amount, 0);
    assert_eq!(paid_token_client.balance(&payer), 0);
    assert_eq!(paid_token_client.balance(&contract_address), 1_000);
    assert_eq!(
        client.get_payment(&payment_id).status,
        PaymentStatus::DepositReceived
    );

    let released = client.release_deposit_to_operator(&payment_id);
    assert_eq!(released, 1_000);
    assert_eq!(paid_token_client.balance(&authorization_signer), 1_000);
    assert_eq!(paid_token_client.balance(&contract_address), 0);

    client.record_settlement(&payment_id, &payer, &900, &870);
    assert_eq!(client.get_payment(&payment_id).status, PaymentStatus::Settled);
}
