import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-5xl px-6 py-24">
        <p className="mb-4 text-sm font-medium text-zinc-500">
          Stellar payment infrastructure
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Build payment apps with the Payoes SDK
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
          This monorepo separates the core SDK in{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">
            packages/sdk
          </code>{" "}
          from the web app (landing + dashboard) in{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm">
            apps/web
          </code>
          .
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700"
          >
            Sign in
          </Link>
          <a
            href="#sdk"
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            View SDK
          </a>
        </div>
      </section>

      <section
        id="sdk"
        className="border-t border-zinc-200 bg-zinc-50"
      >
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Payoes SDK
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-600">
            The SDK package will provide a TypeScript client for wallet,
            stablecoin, and payment flows on the Stellar network. It is
            currently a placeholder — implementation will live in the monorepo
            root.
          </p>
          <pre className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 font-mono text-sm text-zinc-800">
            {`import { SDK_VERSION } from "@payoes/sdk";

console.log(SDK_VERSION); // "0.0.0"`}
          </pre>
        </div>
      </section>
    </main>
  );
}
