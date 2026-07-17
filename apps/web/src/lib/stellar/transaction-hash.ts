const STELLAR_TRANSACTION_HASH_PATTERN = /^[a-f0-9]{64}$/;

export function isStellarTransactionHash(
  value: string | null | undefined,
): value is string {
  return Boolean(value && STELLAR_TRANSACTION_HASH_PATTERN.test(value));
}

export function resolveStellarTransactionHash(
  value: string | null | undefined,
): string | null {
  if (!isStellarTransactionHash(value)) {
    return null;
  }

  return value;
}
