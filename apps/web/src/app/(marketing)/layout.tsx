import Link from "next/link";
import "./marketing.css";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing-theme min-h-screen">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-zinc-900"
          >
            Payoes
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-600">
            <a
              href="#sdk"
              className="transition-colors hover:text-zinc-900"
            >
              SDK
            </a>
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-zinc-50 transition-colors hover:bg-zinc-700"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
