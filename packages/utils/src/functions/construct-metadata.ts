import { Metadata } from "next";

export function constructMetadata({
  title,
  fullTitle,
  description = "Payoes is the Stellar payment infrastructure and SDK for modern apps.",
  image = "https://payoes.com/thumbnail.jpg",
  video,
  icons = [
    {
      rel: "apple-touch-icon",
      url: "/apple-icon.png",
    },
    {
      rel: "icon",
      type: "image/png",
      url: "/icon.png",
    },
  ],
  url,
  canonicalUrl,
  noIndex = false,
  manifest,
}: {
  title?: string;
  fullTitle?: string;
  description?: string;
  image?: string | null;
  video?: string | null;
  icons?: Metadata["icons"];
  url?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  manifest?: string | URL | null;
} = {}): Metadata {
  return {
    title:
      fullTitle ||
      (title ? `${title} | Payoes` : "Payoes - Stellar payment infrastructure and SDK"),
    description,
    openGraph: {
      title,
      description,
      ...(image && {
        images: image,
      }),
      url,
      ...(video && {
        videos: video,
      }),
    },
    twitter: {
      title,
      description,
      ...(image && {
        card: "summary_large_image",
        images: [image],
      }),
      ...(video && {
        player: video,
      }),
      creator: "@payoes",
    },
    icons,
    metadataBase: new URL("https://payoes.com"),
    ...((url || canonicalUrl) && {
      alternates: {
        canonical: url || canonicalUrl,
      },
    }),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    ...(manifest && {
      manifest,
    }),
  };
}
