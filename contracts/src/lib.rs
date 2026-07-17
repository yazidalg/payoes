#![no_std]

mod contract;
mod domain;
mod storage;
mod validation;

pub use contract::{Payoes, PayoesArgs, PayoesClient};
pub use domain::error::Error;
pub use domain::events::{
    PaymentDepositReceived, PaymentRefunded, PaymentRegistered, PaymentSettled,
};
pub use domain::types::{PaymentRecord, PaymentStatus};

mod test;
