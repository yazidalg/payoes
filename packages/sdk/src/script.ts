import { Payoes, SDK_VERSION } from "./index";

if (typeof window !== "undefined") {
  window.Payoes = {
    SDK_VERSION,
    openCheckout: Payoes.openCheckout,
    closeCheckout: Payoes.closeCheckout,
  };
}
