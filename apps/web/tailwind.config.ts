import sharedConfig from "@dub/tailwind-config/tailwind.config";
import type { Config } from "tailwindcss";

const config: Pick<Config, "presets" | "safelist"> = {
  safelist: [
    "bg-sandbox-banner",
    "text-sandbox-banner-foreground",
    "border-sandbox-banner-border",
    "bg-checkout-error-banner",
    "text-checkout-error-banner-foreground",
    "border-checkout-error-banner-border",
    "bg-checkout-info-banner",
    "text-checkout-info-banner-foreground",
    "border-checkout-info-banner-border",
    "bg-primary",
    "text-primary",
    "text-primary-foreground",
    "border-primary",
    "hover:bg-primary/90",
    "hover:ring-primary/20",
    "ring-primary/50",
    "focus-visible:ring-primary/50",
    "focus-visible:border-primary",
    "bg-primary/10",
    "bg-primary/15",
    "text-primary",
    "shadow-[0_0_0_1px_var(--primary)_inset]",
  ],
  presets: [
    {
      ...sharedConfig,
      content: [
        "./src/**/*.{js,ts,jsx,tsx}",
        "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
        "../../packages/ui/dist/**/*.{js,mjs}",
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
            sandbox: {
              banner: "var(--sandbox-banner)",
              "banner-foreground": "var(--sandbox-banner-foreground)",
              "banner-border": "var(--sandbox-banner-border)",
            },
            checkout: {
              "error-banner": "var(--checkout-error-banner)",
              "error-banner-foreground": "var(--checkout-error-banner-foreground)",
              "error-banner-border": "var(--checkout-error-banner-border)",
              "info-banner": "var(--checkout-info-banner)",
              "info-banner-foreground": "var(--checkout-info-banner-foreground)",
              "info-banner-border": "var(--checkout-info-banner-border)",
            },
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
            "grid-border": "#e5e5e5",
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)",
          },
          maxWidth: {
            "grid-width": "1080px",
          },
          width: {
            "grid-width": "1080px",
          },
        },
      },
    },
  ],
};

export default config;
