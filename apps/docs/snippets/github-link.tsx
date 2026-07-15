const DEFAULT_GITHUB_REPO_URL = "https://github.com/payoesteam/payoes";

function getGithubUrl() {
  return process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || DEFAULT_GITHUB_REPO_URL;
}

function getGithubRepoPath(path = "") {
  const base = getGithubUrl().replace(/\/$/, "");
  if (!path) {
    return base;
  }

  return `${base}/${path.replace(/^\//, "")}`;
}

export function GithubRepoLink({
  path,
  children,
}: {
  path?: string;
  children: React.ReactNode;
}) {
  return <a href={getGithubRepoPath(path)}>{children}</a>;
}
