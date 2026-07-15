import { Payoes, SDK_VERSION } from "./index";

const checkoutGlobal = {
  SDK_VERSION,
  openCheckout: Payoes.openCheckout,
  closeCheckout: Payoes.closeCheckout,
};

if (typeof globalThis !== "undefined") {
  globalThis.Payoes = checkoutGlobal;
}
