import { CustomerPaymentsTableSkeleton } from "@/ui/customers/customer-payments-table-skeleton";
import { SmoothSkeleton } from "@/ui/shared/smooth-skeleton";

export function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6 pb-10" aria-busy="true" aria-label="Loading customer">
      <div className="@container/stats">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 @xs/stats:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col bg-white p-3">
              <SmoothSkeleton className="h-3 w-20" />
              <SmoothSkeleton className="mt-2 h-5 w-14" />
            </div>
          ))}
        </div>
      </div>

      <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] grid grid-cols-1 gap-6">
        <div className="@3xl/page:order-2">
          <div className="border-border-subtle flex flex-col divide-y divide-neutral-200 rounded-xl border bg-white">
            <div className="p-4">
              <SmoothSkeleton className="size-10 rounded-full" />
              <div className="mt-3 space-y-2">
                <SmoothSkeleton className="h-5 w-32" />
                <SmoothSkeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <SmoothSkeleton className="h-4 w-40" />
              <SmoothSkeleton className="h-4 w-52" />
              <SmoothSkeleton className="h-4 w-28" />
            </div>
            <div className="p-4">
              <SmoothSkeleton className="h-3 w-12" />
              <SmoothSkeleton className="mt-3 h-16 w-full rounded-lg" />
            </div>
          </div>
        </div>

        <div className="@3xl/page:order-1">
          <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
            <div className="border-border-subtle border-b px-4 py-3">
              <SmoothSkeleton className="h-4 w-20" />
            </div>
            <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white">
              <CustomerPaymentsTableSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
