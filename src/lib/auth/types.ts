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

export type PortfolioBalance = {
  totalUsd: number;
  stablecoins: {
    code: string;
    balance: string;
    usdValue: number;
  }[];
};

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "provisioning"
  | "authenticated";
