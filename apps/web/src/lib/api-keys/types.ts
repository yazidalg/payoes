export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};
