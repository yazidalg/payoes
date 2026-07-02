import "server-only";

import { DEFAULT_XLM_ACCOUNTS, Turnkey } from "@turnkey/sdk-server";

function getTurnkeyClient() {
  const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
  const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;
  const organizationId = process.env.TURNKEY_ORGANIZATION_ID;

  if (!apiPublicKey || !apiPrivateKey || !organizationId) {
    throw new Error(
      "Turnkey is not configured. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, and TURNKEY_ORGANIZATION_ID.",
    );
  }

  return new Turnkey({
    apiBaseUrl: "https://api.turnkey.com",
    apiPublicKey,
    apiPrivateKey,
    defaultOrganizationId: organizationId,
  });
}

export type TurnkeyWalletResult = {
  publicKey: string;
  turnkeyWalletId: string;
  turnkeyOrganizationId: string;
};

export async function createTurnkeyStellarWallet(
  userId: string,
  userEmail: string,
): Promise<TurnkeyWalletResult> {
  const turnkey = getTurnkeyClient();
  const organizationId = process.env.TURNKEY_ORGANIZATION_ID!;
  const apiClient = turnkey.apiClient();

  const walletName = `payoes-${userEmail.split("@")[0]}-${userId.slice(0, 8)}`;

  const response = await apiClient.createWallet({
    walletName,
    accounts: DEFAULT_XLM_ACCOUNTS,
  });

  const publicKey = response.addresses?.[0];

  if (!publicKey || !response.walletId) {
    throw new Error("Turnkey did not return a Stellar wallet address.");
  }

  return {
    publicKey,
    turnkeyWalletId: response.walletId,
    turnkeyOrganizationId: organizationId,
  };
}
