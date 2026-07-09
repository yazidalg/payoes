"use client";

import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { Icon, Popover } from "@dub/ui";
import { Gear } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  ComponentPropsWithoutRef,
  ElementType,
  useMemo,
  useState,
} from "react";

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return email?.slice(0, 2).toUpperCase() ?? "U";
}

export function UserDropdown() {
  const { user } = useDashboardShell();
  const [openPopover, setOpenPopover] = useState(false);
  const initials = getInitials(user.name, user.email);

  const menuOptions = useMemo(
    () => [
      {
        label: "Organization settings",
        icon: Gear,
        href: "/dashboard/settings/organization",
        onClick: () => setOpenPopover(false),
      },
      {
        type: "button" as const,
        label: "Log out",
        icon: LogOut,
        onClick: () => {
          void signOut({ callbackUrl: "/login" });
        },
      },
    ],
    [],
  );

  return (
    <Popover
      content={
        <div className="flex w-full flex-col space-y-px rounded-md bg-white p-2 sm:min-w-56">
          <div className="px-2 pb-4 sm:pb-2">
            <p className="truncate text-base font-medium text-neutral-900 sm:text-sm">
              {user.name || user.email?.split("@")[0]}
            </p>
            <p className="truncate text-base text-neutral-500 sm:text-sm">
              {user.email}
            </p>
          </div>
          {menuOptions.map((menuOption, idx) => (
            <UserOption
              key={idx}
              as={menuOption.href ? Link : "button"}
              {...menuOption}
            />
          ))}
        </div>
      }
      align="start"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        type="button"
        onClick={() => setOpenPopover(!openPopover)}
        className={cn(
          "group relative flex size-11 items-center justify-center rounded-lg transition-all",
          "hover:bg-bg-inverted/5 active:bg-bg-inverted/10 data-[state=open]:bg-bg-inverted/10",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? "User"}
            className="size-7 rounded-full border-none"
          />
        ) : (
          <div className="flex size-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
            {initials}
          </div>
        )}
      </button>
    </Popover>
  );
}

type UserOptionProps<T extends ElementType> = {
  as?: T;
  label: string;
  icon: Icon;
};

function UserOption<T extends ElementType = "button">({
  as,
  label,
  icon: IconComponent,
  children,
  ...rest
}: UserOptionProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof UserOptionProps<T>>) {
  const Component = as ?? "button";

  return (
    <Component
      className="flex items-center gap-x-4 rounded-md px-2.5 py-1.5 text-base transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80 sm:text-sm"
      {...rest}
    >
      <IconComponent className="size-5 text-neutral-500 sm:size-4" />
      <span className="block truncate text-neutral-600">{label}</span>
      {children}
    </Component>
  );
}
