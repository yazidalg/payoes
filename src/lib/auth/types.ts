export type AuthUser = {
  id: string;
  name: string;
  email: string;
  picture?: string | null;
};

export type StellarWallet = {
  publicKey: string;
  network: "testnet";
  provider: "turnkey";
  funded: boolean;
};

export type WalletBalances = {
  xlm: string;
  usdc: string | null;
};

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "provisioning"
  | "authenticated";
