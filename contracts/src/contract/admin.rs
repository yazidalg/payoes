use soroban_sdk::{contractimpl, panic_with_error, Address, Env};

use crate::domain::error::Error;
use crate::domain::types::Config;
use crate::storage::{has_config, load_config, save_config};

use super::{Payoes, PayoesArgs, PayoesClient};

#[contractimpl]
impl Payoes {
    pub fn initialize(
        env: Env,
        admin: Address,
        authorization_signer: Address,
        fee_recipient: Address,
    ) {
        if has_config(&env) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }

        admin.require_auth();

        save_config(
            &env,
            &Config {
                admin,
                authorization_signer,
                fee_recipient,
                paused: false,
            },
        );
    }

    pub fn set_authorization_signer(env: Env, authorization_signer: Address) {
        let mut config = load_config(&env);
        config.admin.require_auth();
        config.authorization_signer = authorization_signer;
        save_config(&env, &config);
    }

    pub fn set_fee_recipient(env: Env, fee_recipient: Address) {
        let mut config = load_config(&env);
        config.admin.require_auth();
        config.fee_recipient = fee_recipient;
        save_config(&env, &config);
    }

    pub fn set_paused(env: Env, paused: bool) {
        let mut config = load_config(&env);
        config.admin.require_auth();
        config.paused = paused;
        save_config(&env, &config);
    }
}
