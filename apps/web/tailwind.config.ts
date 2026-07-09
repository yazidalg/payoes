import sharedConfig from "@dub/tailwind-config/tailwind.config";
import type { Config } from "tailwindcss";

const config: Pick<Config, "presets"> = {
  presets: [
    {
      ...sharedConfig,
      content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          ...sharedConfig?.theme?.extend,
          colors: {
            ...sharedConfig?.theme?.extend?.colors,
            background: "var(--background)",
            foreground: "var(--foreground)",
            card: {
              DEFAULT: "var(--card)",
              foreground: "var(--card-foreground)",
            },
            popover: {
              DEFAULT: "var(--popover)",
              foreground: "var(--popover-foreground)",
            },
            primary: {
              DEFAULT: "var(--primary)",
              foreground: "var(--primary-foreground)",
            },
            secondary: {
              DEFAULT: "var(--secondary)",
              foreground: "var(--secondary-foreground)",
            },
            muted: {
              DEFAULT: "var(--muted)",
              foreground: "var(--muted-foreground)",
            },
            accent: {
              DEFAULT: "var(--accent)",
              foreground: "var(--accent-foreground)",
            },
            destructive: "var(--destructive)",
            border: "var(--border)",
            input: "var(--input)",
            ring: "var(--ring)",
            sidebar: {
              DEFAULT: "var(--sidebar)",
              foreground: "var(--sidebar-foreground)",
              primary: "var(--sidebar-primary)",
              "primary-foreground": "var(--sidebar-primary-foreground)",
              accent: "var(--sidebar-accent)",
              "accent-foreground": "var(--sidebar-accent-foreground)",
              border: "var(--sidebar-border)",
              ring: "var(--sidebar-ring)",
            },
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)",
          },
        },
      },
    },
  ],
};

export default config;
