import { closeCheckout, openCheckout } from "./checkout";
import { SDK_VERSION } from "./constants";

export { SDK_VERSION } from "./constants";
export { closeCheckout, openCheckout } from "./checkout";
export type {
  CheckoutCompleteResult,
  CheckoutDisplayMode,
  OpenCheckoutOptions,
  PayoesCheckoutGlobal,
} from "./types";

export const Payoes = {
  SDK_VERSION,
  openCheckout,
  closeCheckout,
};
