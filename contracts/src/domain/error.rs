use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    Paused = 4,
    InvalidAmount = 5,
    PaymentExpired = 6,
    PaymentNotRegistered = 7,
    PaymentAlreadyFinalized = 8,
    PaymentAlreadySettled = 9,
}
