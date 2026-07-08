function getAppUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export function getHostedInvoiceUrl(publicId: string) {
  return `${getAppUrl()}/i/${publicId}`;
}
