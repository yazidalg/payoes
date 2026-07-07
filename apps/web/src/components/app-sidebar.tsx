"use client";

import * as React from "react";
import {
  AudioLinesIcon,
  BookOpenIcon,
  BotIcon,
  FrameIcon,
  GalleryVerticalEndIcon,
  MapIcon,
  PieChartIcon,
  Settings2Icon,
  TerminalIcon,
  WalletIcon,
} from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "John Doe",
    email: "john@example.com",
    avatar: "",
  },
  teams: [
    {
      name: "Payoes",
      logo: <GalleryVerticalEndIcon className="size-4" />,
      plan: "Pro",
    },
    {
      name: "Acme Corp",
      logo: <AudioLinesIcon className="size-4" />,
      plan: "Startup",
    },
    {
      name: "Sandbox",
      logo: <TerminalIcon className="size-4" />,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: <WalletIcon />,
      isActive: true,
      items: [
        { title: "Home", url: "/dashboard" },
        { title: "Transactions", url: "#" },
        { title: "Wallets", url: "#" },
      ],
    },
    {
      title: "Integrations",
      url: "#",
      icon: <BotIcon />,
      items: [
        { title: "SDK", url: "#" },
        { title: "Webhooks", url: "#" },
        { title: "API Keys", url: "#" },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: <BookOpenIcon />,
      items: [
        { title: "Getting Started", url: "#" },
        { title: "Guides", url: "#" },
        { title: "Changelog", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        { title: "General", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Team", url: "#" },
      ],
    },
  ],
  projects: [
    {
      name: "Payments API",
      url: "#",
      icon: <FrameIcon />,
    },
    {
      name: "Merchant Portal",
      url: "#",
      icon: <PieChartIcon />,
    },
    {
      name: "Mobile SDK",
      url: "#",
      icon: <MapIcon />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
