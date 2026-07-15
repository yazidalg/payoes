import { Avatar } from "@dub/ui";
import { cn } from "@dub/utils";

const DEMO_TEAM = [
  { name: "Sarah Chen", email: "sarah@acme.co", role: "Owner" },
  { name: "Marcus Johnson", email: "marcus@acme.co", role: "Admin" },
  { name: "Priya Patel", email: "priya@acme.co", role: "Member" },
  { name: "Alex Rivera", email: "alex@acme.co", role: "Member" },
  { name: "Jamie Kim", email: "jamie@acme.co", role: "Member" },
  { name: "Taylor Brooks", email: "taylor@acme.co", role: "Member" },
] as const;

const VISIBLE_COUNT = 4;

export function Collaboration() {
  return (
    <div
      className="size-full overflow-clip [mask-image:linear-gradient(black_70%,transparent)]"
      aria-hidden
    >
      <div className="mx-3.5 flex h-full flex-col rounded-t-xl border-x border-t border-neutral-200 bg-white shadow-[0_20px_20px_0_#00000017]">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h3 className="text-base font-medium text-neutral-900">Team members</h3>
          <p className="mt-0.5 text-sm text-neutral-500">Acme Payments</p>
          <div className="mt-3 flex items-center">
            {DEMO_TEAM.map((member, idx) => (
              <Avatar
                key={member.email}
                identifier={member.name}
                className={cn(
                  "size-8 ring-2 ring-white transition-transform hover:scale-110",
                  idx > 0 && "-ml-2",
                )}
              />
            ))}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden px-3 py-2">
          <div
            className={cn(
              "flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200",
              DEMO_TEAM.length > VISIBLE_COUNT &&
                "[mask-image:linear-gradient(0deg,transparent,black_45px)]",
            )}
          >
            {DEMO_TEAM.slice(0, VISIBLE_COUNT).map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between gap-2 px-2.5 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar identifier={member.name} className="size-7" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {member.email}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {member.role}
                </span>
              </div>
            ))}
          </div>

          {DEMO_TEAM.length > VISIBLE_COUNT ? (
            <div className="absolute inset-x-3 bottom-2 flex items-center justify-center">
              <span className="select-none text-xs font-medium text-neutral-400">
                +{DEMO_TEAM.length - VISIBLE_COUNT} more
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
