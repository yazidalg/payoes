export function IntegrationPlaceholder() {
  return (
    <div className="relative rounded-xl border border-neutral-200 bg-white px-5 py-4">
      <div className="flex items-center gap-x-3">
        <div className="size-11 shrink-0 rounded-md bg-neutral-100" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 rounded-full bg-neutral-100" />
            <div className="h-5 w-20 rounded-full bg-neutral-100" />
          </div>
          <div className="h-3 w-full max-w-xs rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
