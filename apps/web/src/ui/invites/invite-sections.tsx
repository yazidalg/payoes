import { Avatar } from "@dub/ui";
import { Book2, Code, LifeRing, Msgs } from "@dub/ui/icons";
import { cn } from "@dub/utils";

const MAX_TEAM_DISPLAY = 4;

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export function InviteProductsSection({
  organizationName,
}: {
  organizationName: string;
}) {
  const products = [
    {
      icon: (
        <div className="flex size-5 items-center justify-center rounded bg-sky-400">
          <span className="text-[10px] font-bold text-sky-900">$</span>
        </div>
      ),
      title: "Payments",
      href: "/dashboard/payments",
      cta: "Learn more",
    },
    {
      icon: (
        <div className="flex size-5 items-center justify-center rounded bg-violet-400">
          <Code className="size-3 text-violet-900" />
        </div>
      ),
      title: "Developers",
      href: "/dashboard/developers/api-keys",
      cta: "Learn more",
    },
  ];

  return (
    <div
      className={cn(
        "mt-8 flex w-full max-w-[400px] flex-col gap-3",
        "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:150ms] [animation-duration:0.5s] [animation-fill-mode:both]",
      )}
    >
      <h3 className="text-content-default font-semibold">
        Products {organizationName} uses
      </h3>

      <div className="divide-border-subtle border-border-subtle bg-bg-muted flex flex-col divide-y rounded-lg border">
        {products.map(({ icon, title, href, cta }) => (
          <div
            key={href}
            className="flex items-center justify-between gap-2 px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              {icon}
              <div className="text-content-default text-sm font-medium">
                {title}
              </div>
            </div>

            <a
              href={href}
              className="border-subtle bg-bg-inverted hover:bg-bg-inverted/90 flex h-7 items-center rounded-lg border px-2.5 text-sm text-white transition-transform active:scale-[0.98]"
            >
              {cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InviteTeamSection({
  teamMembers,
}: {
  teamMembers: TeamMember[];
}) {
  return (
    <div
      className={cn(
        "mt-8 flex w-full max-w-[400px] flex-col gap-3",
        "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:150ms] [animation-duration:0.5s] [animation-fill-mode:both]",
      )}
    >
      <h3 className="text-content-default font-semibold">The team</h3>

      <div className="relative overflow-hidden">
        <div
          className={cn(
            "border-border-subtle bg-bg-muted divide-border-subtle relative flex flex-col divide-y rounded-lg border",
            teamMembers.length > MAX_TEAM_DISPLAY &&
              "[mask-image:linear-gradient(0deg,transparent,black_45px)]",
          )}
        >
          {teamMembers.slice(0, MAX_TEAM_DISPLAY).map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-2 px-2.5 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  imageUrl={member.image}
                  identifier={member.name ?? member.email ?? member.id}
                  className="size-6"
                />
                <span className="text-content-default min-w-0 truncate text-sm font-medium">
                  {member.name || member.email}
                </span>
              </div>
            </div>
          ))}
        </div>

        {teamMembers.length > MAX_TEAM_DISPLAY ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center">
            <span className="text-content-subtle select-none text-xs font-medium">
              +{teamMembers.length - MAX_TEAM_DISPLAY} more
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function InviteResourcesSection() {
  const resources = [
    {
      icon: LifeRing,
      title: "Help center",
      description: "Answers to your questions",
      href: "/dashboard/developers/documentation",
      cta: "Read",
    },
    {
      icon: Book2,
      title: "Docs",
      description: "Platform documentation",
      href: "/dashboard/developers/documentation",
      cta: "Learn",
    },
    {
      icon: Msgs,
      title: "Support",
      description: "Product support or help requests",
      href: "/dashboard/developers/documentation",
      cta: "Chat",
    },
  ] as const;

  return (
    <div
      className={cn(
        "mt-8 flex w-full max-w-[400px] flex-col gap-3",
        "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:250ms] [animation-duration:0.5s] [animation-fill-mode:both]",
      )}
    >
      <h3 className="text-content-default font-semibold">Additional resources</h3>

      <div className="divide-border-subtle border-border-subtle bg-bg-muted flex flex-col divide-y rounded-lg border">
        {resources.map(({ icon: Icon, title, description, href, cta }) => (
          <div
            key={title}
            className="flex items-center justify-between gap-2 px-2.5 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-black/5">
                <Icon variant="fill" className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-content-default text-sm font-medium">
                  {title}
                </div>
                <p className="text-content-subtle truncate text-xs font-medium">
                  {description}
                </p>
              </div>
            </div>

            <a
              href={href}
              className="border-subtle bg-bg-default hover:bg-bg-muted flex h-7 items-center rounded-lg border px-2.5 text-sm font-medium transition-transform active:scale-[0.98]"
            >
              {cta}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
