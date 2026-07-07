export type WebhookEndpointRow = {
  id: string;
  url: string;
  events: string[];
  enabled: number;
  createdAt: string;
};

export type WebhookDeliveryRow = {
  id: string;
  event: string;
  status: string;
  responseStatus: number | null;
  attempts: number;
  createdAt: string;
  deliveredAt: string | null;
};
