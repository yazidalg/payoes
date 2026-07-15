import { MOBILE_BREAKPOINT_PX } from "./constants";
import type { CheckoutDisplayMode } from "./types";

const MODAL_ROOT_ID = "payoes-checkout-modal-root";

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
}

function resolveMobileLayout(displayMode: CheckoutDisplayMode = "auto") {
  if (displayMode === "mobile") {
    return true;
  }

  if (displayMode === "desktop") {
    return false;
  }

  return isMobileViewport();
}

export type CheckoutModal = {
  iframe: HTMLIFrameElement;
  close: () => void;
};

function createCloseButton() {
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close checkout");
  closeButton.textContent = "×";
  closeButton.style.cssText = [
    "position:absolute",
    "top:12px",
    "right:12px",
    "z-index:2",
    "width:32px",
    "height:32px",
    "border:0",
    "border-radius:9999px",
    "background:rgba(15,23,42,0.08)",
    "color:#0f172a",
    "font-size:22px",
    "line-height:1",
    "cursor:pointer",
  ].join(";");
  return closeButton;
}

function createIframe(embedUrl: string) {
  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = "Payoes checkout";
  iframe.allow = "clipboard-write";
  iframe.style.cssText = "width:100%;height:100%;border:0;display:block;";
  return iframe;
}

export function createCheckoutModal(
  embedUrl: string,
  onRequestClose: () => void,
  displayMode: CheckoutDisplayMode = "auto",
): CheckoutModal {
  const existing = document.getElementById(MODAL_ROOT_ID);
  existing?.remove();

  const mobile = resolveMobileLayout(displayMode);

  const root = document.createElement("div");
  root.id = MODAL_ROOT_ID;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");

  const iframe = createIframe(embedUrl);
  const closeButton = createCloseButton();

  function close() {
    root.remove();
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKeyDown);
  }

  function requestClose() {
    close();
    onRequestClose();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      requestClose();
    }
  }

  if (mobile) {
    root.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "width:100%",
      "height:100%",
      "margin:0",
      "padding:0",
      "border:0",
      "overflow:hidden",
      "background:#fff",
    ].join(";");

    iframe.style.cssText = [
      "position:absolute",
      "inset:0",
      "width:100%",
      "height:100%",
      "border:0",
      "display:block",
    ].join(";");

    root.appendChild(iframe);
    root.appendChild(closeButton);
    document.body.appendChild(root);
    document.body.style.overflow = "hidden";

    closeButton.addEventListener("click", requestClose);
    window.addEventListener("keydown", onKeyDown);

    return {
      iframe,
      close,
    };
  }

  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483646",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:16px",
  ].join(";");

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Close checkout");
  backdrop.style.cssText = [
    "position:absolute",
    "inset:0",
    "border:0",
    "background:rgba(15,23,42,0.55)",
    "cursor:pointer",
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "position:relative",
    "z-index:1",
    "width:min(1024px,calc(100vw - 32px))",
    "height:min(90dvh,900px)",
    "max-height:calc(100dvh - 32px)",
    "border-radius:16px",
    "background:#fff",
    "overflow:hidden",
    "box-shadow:0 25px 50px -12px rgba(15,23,42,0.35)",
  ].join(";");

  panel.appendChild(closeButton);
  panel.appendChild(iframe);
  root.appendChild(backdrop);
  root.appendChild(panel);
  document.body.appendChild(root);
  document.body.style.overflow = "hidden";

  window.addEventListener("keydown", onKeyDown);
  backdrop.addEventListener("click", requestClose);
  closeButton.addEventListener("click", requestClose);

  return { iframe, close };
}
