import { DEFAULT_GITHUB_REPO_URL } from "@/constants/app";

export function getGithubUrl() {
  return process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || DEFAULT_GITHUB_REPO_URL;
}

export function getGithubRepoPath(path = "") {
  const base = getGithubUrl().replace(/\/$/, "");
  if (!path) {
    return base;
  }

  return `${base}/${path.replace(/^\//, "")}`;
}
