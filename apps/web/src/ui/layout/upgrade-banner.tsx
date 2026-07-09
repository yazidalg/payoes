"use client";

export function useUpgradeBannerVisibility() {
  return {
    isVisible: false,
    needsUpgrade: false,
    paymentFailed: false,
    subscriptionCanceled: false,
  };
}

export function UpgradeBanner() {
  return null;
}
