#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token, Address, BytesN, Env};

#[test]
fn settles_merchant_and_platform_fee_atomically() {
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

    let contract_id = env.register(PayoesPaymentRouter, ());
    let client = PayoesPaymentRouterClient::new(&env, &contract_id);
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
