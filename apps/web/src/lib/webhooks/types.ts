export type WebhookEndpointRow = {
  id: string;
  url: string;
  events: string[];
  enabled: number;
  createdAt: string;
  secretPreview?: string;
};

export type WebhookDeliveryRow = {
  id: string;
  event: string;
  status: string;
  responseStatus: number | null;
  responseBody: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
};
