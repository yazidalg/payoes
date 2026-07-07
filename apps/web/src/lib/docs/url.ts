const DEFAULT_DOCS_URL = "http://localhost:3001";

export function getDocsUrl() {
  return process.env.NEXT_PUBLIC_DOCS_URL?.trim() || DEFAULT_DOCS_URL;
}

export function getDocsQuickstartUrl() {
  return `${getDocsUrl()}/quickstart`;
}
