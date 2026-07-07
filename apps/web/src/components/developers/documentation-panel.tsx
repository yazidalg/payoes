import { BookOpenIcon, ExternalLinkIcon, RocketIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getDocsQuickstartUrl, getDocsUrl } from "@/lib/docs/url";

export function DocumentationPanel() {
  const docsUrl = getDocsUrl();
  const quickstartUrl = getDocsQuickstartUrl();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          API reference, guides, and integration examples for Payoes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/80 p-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <BookOpenIcon className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-medium">Developer docs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hosted on Mintlify with guides, OpenAPI reference, and copy-paste
            examples.
          </p>
          <Button className="mt-4" render={<Link href={docsUrl} target="_blank" />}>
            Open documentation
            <ExternalLinkIcon className="size-4" />
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 p-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <RocketIcon className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 font-medium">Quickstart</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first payment with the REST API and complete checkout on
            Stellar testnet.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            render={<Link href={quickstartUrl} target="_blank" />}
          >
            View quickstart
            <ExternalLinkIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
        Documentation is served at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          {docsUrl}
        </code>
        . Configure{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          NEXT_PUBLIC_DOCS_URL
        </code>{" "}
        in your environment to point to your Mintlify deployment.
      </div>
    </div>
  );
}
