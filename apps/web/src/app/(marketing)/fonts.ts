import { Inter } from "next/font/google";
import localFont from "next/font/local";

// Display typeface used by the reference design (dub) for headings.
export const satoshi = localFont({
  src: "./Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  weight: "300 900",
  display: "swap",
  style: "normal",
});

// Body typeface used by the reference design for copy.
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
