export type CheckoutCompleteResult = {
  paymentId: string;
  status: string;
  txHash?: string | null;
};

export type OpenCheckoutOptions = {
  paymentId?: string;
  checkoutUrl?: string;
  baseUrl?: string;
  onComplete?: (result: CheckoutCompleteResult) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
};

export type PayoesCheckoutGlobal = {
  SDK_VERSION: string;
  openCheckout: (options: OpenCheckoutOptions) => void;
  closeCheckout: () => void;
};

declare global {
  interface Window {
    Payoes?: PayoesCheckoutGlobal;
  }
}
