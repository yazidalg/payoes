import { getHorizonUrl, type StellarEnvironment } from "@/lib/stellar/network";

export async function stellarAccountExists(
  address: string,
  environment: StellarEnvironment
) {
  const response = await fetch(
    `${getHorizonUrl(environment)}/accounts/${address}`,
    { next: { revalidate: 0 } }
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error("Unable to verify Stellar account on Horizon");
  }

  return true;
}
