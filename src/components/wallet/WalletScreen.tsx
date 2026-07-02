"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { usernameFromEmail } from "@/lib/auth/username";
import DepositSheet from "./DepositSheet";

const transactions = [
  {
    id: "1",
    title: "Dari @sari",
    subtitle: "Hari ini, 09:42",
    amount: 50.0,
    type: "in" as const,
  },
  {
    id: "2",
    title: "Ke @budi",
    subtitle: "Kemarin, 18:15",
    amount: -25.0,
    type: "out" as const,
  },
  {
    id: "3",
    title: "Pembayaran QR",
    subtitle: "Kemarin, 12:30",
    amount: -12.5,
    type: "out" as const,
  },
  {
    id: "4",
    title: "Bunga Earn",
    subtitle: "2 Mar 2026",
    amount: 1.25,
    type: "in" as const,
  },
  {
    id: "5",
    title: "Ke @rina",
    subtitle: "1 Mar 2026",
    amount: -100.0,
    type: "out" as const,
  },
];

function formatAmount(amount: number) {
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WalletScreen() {
  const { user, wallet, balances, signOut } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);

  const username = user ? usernameFromEmail(user.email) : "@user";
  const depositAddress = wallet?.publicKey ?? "";

  const hasUsdc = balances?.usdc != null;
  const balanceValue = hasUsdc
    ? parseFloat(balances!.usdc!)
    : parseFloat(balances?.xlm ?? "0");
  const balanceLabel = hasUsdc ? "USDC" : "XLM";
  const formattedBalance = balanceValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: hasUsdc ? 2 : 7,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6f8]">
      {/* Status bar spacer */}
      <div className="h-11 shrink-0" />

      {/* Header */}
      <header className="flex items-start justify-between px-5 pb-2">
        <div>
          <p className="text-sm text-[#6b7280]">Selamat pagi</p>
          <h1 className="text-xl font-semibold text-[#111827]">{username}</h1>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] shadow-sm transition active:scale-95"
        >
          Keluar
        </button>
      </header>

      {/* Balance card */}
      <section className="px-5 pt-4">
        <div className="rounded-3xl bg-[#1a56db] px-6 py-8 text-white shadow-lg shadow-[#1a56db]/20">
          <p className="text-sm font-medium text-white/70">Total Saldo</p>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {hasUsdc ? `$${formattedBalance}` : formattedBalance}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {balanceLabel} · Testnet
          </p>
        </div>
      </section>

      {/* Actions */}
      <section className="grid grid-cols-2 gap-3 px-5 pt-6">
        <button
          type="button"
          onClick={() => setDepositOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white py-4 text-base font-semibold text-[#111827] transition active:scale-[0.98]"
        >
          <DepositIcon />
          Deposit
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#111827] py-4 text-base font-semibold text-white transition active:scale-[0.98]"
        >
          <SendIcon />
          Kirim
        </button>
      </section>

      <DepositSheet
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        depositAddress={depositAddress}
      />

      {/* Transaction history */}
      <section className="flex-1 px-5 pt-8 pb-8">
        <h2 className="mb-4 text-base font-semibold text-[#111827]">
          Riwayat Transaksi
        </h2>
        <ul className="divide-y divide-[#e5e7eb] rounded-2xl bg-white">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between px-4 py-4 first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    tx.type === "in" ? "bg-[#ecfdf5]" : "bg-[#fef2f2]"
                  }`}
                >
                  {tx.type === "in" ? (
                    <ArrowDownIcon className="text-[#059669]" />
                  ) : (
                    <ArrowUpIcon className="text-[#dc2626]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    {tx.title}
                  </p>
                  <p className="text-xs text-[#9ca3af]">{tx.subtitle}</p>
                </div>
              </div>
              <p
                className={`text-sm font-semibold ${
                  tx.type === "in" ? "text-[#059669]" : "text-[#111827]"
                }`}
              >
                {formatAmount(tx.amount)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function DepositIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}
