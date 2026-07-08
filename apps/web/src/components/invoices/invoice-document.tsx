"use client";

import { OrganizationMark } from "@/components/organizations/organization-mark";
import { formatInvoiceAmount } from "@/lib/invoices/amount";
import type { InvoicePresentation } from "@/lib/invoices/presentation";
import { cn } from "@/lib/utils";

function formatDate(date: Date | null) {
  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoiceDocument({
  presentation,
  className,
  compact = false,
}: {
  presentation: InvoicePresentation;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white text-slate-900 shadow-sm",
        compact ? "rounded-lg border p-6" : "min-h-[720px] rounded-xl border p-10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <p className="text-3xl font-semibold tracking-tight">Invoice</p>
          <p className="mt-2 text-sm text-slate-500">
            {presentation.invoiceNumber}
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="font-medium">{presentation.organization.name}</p>
            <p className="text-sm text-slate-500">
              {presentation.environmentLabel ?? "Payoes merchant"}
            </p>
          </div>
          <OrganizationMark
            organization={presentation.organization}
            className="size-10"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bill to
          </p>
          <p className="mt-2 font-medium">
            {presentation.customer.name ?? "Customer"}
          </p>
          {presentation.customer.email ? (
            <p className="text-sm text-slate-600">{presentation.customer.email}</p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-slate-500">Date of issue</span>
              <p className="font-medium">{formatDate(presentation.createdAt)}</p>
            </div>
            <div>
              <span className="text-slate-500">Date due</span>
              <p className="font-medium">{formatDate(presentation.dueAt)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-2xl font-semibold">
          {formatInvoiceAmount(presentation.amount, presentation.asset)} due{" "}
          {formatDate(presentation.dueAt)}
        </p>
        {presentation.description ? (
          <p className="mt-2 text-sm text-slate-600">{presentation.description}</p>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium text-right">Qty</th>
              <th className="px-4 py-3 font-medium text-right">Unit price</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {presentation.items.map((item) => (
              <tr key={`${item.description}-${item.quantity}-${item.unitAmount}`} className="border-t border-slate-200">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">
                  {formatInvoiceAmount(item.unitAmount, presentation.asset)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatInvoiceAmount(item.lineAmount, presentation.asset)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatInvoiceAmount(presentation.amount, presentation.asset)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <span>Amount due</span>
            <span>{formatInvoiceAmount(presentation.amount, presentation.asset)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
