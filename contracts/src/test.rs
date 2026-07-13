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

    assert_eq!(merchant_amount, 970);
    assert_eq!(token_client.balance(&payer), 0);
    assert_eq!(token_client.balance(&merchant), 970);
    assert_eq!(token_client.balance(&fee_recipient), 30);
    assert_eq!(client.get_payment(&payment_id).status, PaymentStatus::Settled);
}
