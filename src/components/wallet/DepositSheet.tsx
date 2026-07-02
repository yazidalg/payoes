"use client";

import { useEffect, useState } from "react";
import BottomSheet from "./BottomSheet";
import SheetOption from "./SheetOption";
import {
  AddressIcon,
  CopyIcon,
  EurcIcon,
  LocalPaymentIcon,
  StellarIcon,
  UsdcIcon,
  WalletIcon,
} from "./icons";

type DepositAsset = "USDC" | "EURC";

type DepositSheetProps = {
  open: boolean;
  onClose: () => void;
  depositAddress: string;
};

type Step = "menu" | "asset" | "network" | "amount" | "address";

const MIN_DEPOSIT_AMOUNT = 5;

const depositOptions = [
  {
    id: "local",
    title: "Using local payment method",
    description: "Bank transfer, e-wallet, or QRIS",
    icon: LocalPaymentIcon,
  },
  {
    id: "wallet",
    title: "Wallet or exchange",
    description: "Deposit from crypto wallet or exchange",
    icon: WalletIcon,
  },
  {
    id: "address",
    title: "Deposit to address",
    description: "Send USDC or EURC directly to your deposit address",
    icon: AddressIcon,
  },
];

const stepTitles: Record<Step, string> = {
  menu: "Deposit from",
  asset: "Select asset",
  network: "Select network",
  amount: "Enter amount",
  address: "Deposit address",
};

export default function DepositSheet({
  open,
  onClose,
  depositAddress,
}: DepositSheetProps) {
  const [step, setStep] = useState<Step>("menu");
  const [selectedAsset, setSelectedAsset] = useState<DepositAsset>("USDC");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isAmountValid =
    !Number.isNaN(parsedAmount) && parsedAmount >= MIN_DEPOSIT_AMOUNT;

  useEffect(() => {
    if (!open) {
      setStep("menu");
      setSelectedAsset("USDC");
      setAmount("");
      setCopied(false);
    }
  }, [open]);

  const handleClose = () => {
    onClose();
  };

  const handleBack = () => {
    if (step === "asset") setStep("menu");
    else if (step === "network") setStep("asset");
    else if (step === "amount") setStep("network");
    else if (step === "address") setStep("amount");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      title={stepTitles[step]}
      onBack={step !== "menu" ? handleBack : undefined}
    >
      {step === "menu" && (
        <ul className="space-y-3">
          {depositOptions.map((option) => (
            <li key={option.id}>
              <SheetOption
                title={option.title}
                description={option.description}
                icon={option.icon}
                onClick={() => {
                  if (option.id === "address") setStep("asset");
                  else handleClose();
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {step === "asset" && (
        <ul className="space-y-3">
          <li>
            <SheetOption
              title="USDC"
              description="USD Coin"
              icon={UsdcIcon}
              onClick={() => {
                setSelectedAsset("USDC");
                setStep("network");
              }}
            />
          </li>
          <li>
            <SheetOption
              title="EURC"
              description="Euro Coin"
              icon={EurcIcon}
              onClick={() => {
                setSelectedAsset("EURC");
                setStep("network");
              }}
            />
          </li>
        </ul>
      )}

      {step === "network" && (
        <ul className="space-y-3">
          <li>
            <SheetOption
              title="Stellar"
              description="Fast & low-cost network"
              icon={StellarIcon}
              onClick={() => setStep("amount")}
            />
          </li>
        </ul>
      )}

      {step === "amount" && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="deposit-amount"
              className="mb-2 block text-sm font-medium text-[#6b7280]"
            >
              Amount
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4">
              <input
                id="deposit-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-2xl font-semibold text-[#111827] outline-none placeholder:text-[#d1d5db]"
              />
              <span className="shrink-0 text-sm font-semibold text-[#6b7280]">
                {selectedAsset}
              </span>
            </div>
            <p className="mt-2 text-xs text-[#9ca3af]">
              Minimum amount: $5
            </p>
          </div>

          <button
            type="button"
            disabled={!isAmountValid}
            onClick={() => setStep("address")}
            className="w-full rounded-2xl bg-[#1a56db] py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === "address" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#f9fafb] px-4 py-5 text-center">
            <p className="text-sm text-[#6b7280]">Amount to deposit</p>
            <p className="mt-1 text-3xl font-bold text-[#111827]">
              {parsedAmount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-lg font-semibold text-[#6b7280]">
                {selectedAsset}
              </span>
            </p>
            <p className="mt-1 text-xs text-[#9ca3af]">Network: Stellar</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#6b7280]">
              Deposit address
            </p>
            <div className="flex items-start gap-2 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
              <p className="flex-1 break-all text-sm font-medium leading-relaxed text-[#111827]">
                {depositAddress}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1a56db] shadow-sm transition active:scale-95"
                aria-label="Salin alamat"
              >
                <CopyIcon />
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-xs font-medium text-[#059669]">
                Address copied!
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-[#9ca3af]">
            Send only {selectedAsset} on the Stellar network to this address.
            Sending other assets may result in permanent loss.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
