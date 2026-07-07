export function getInitials(name: string, maxParts = 2) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxParts)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, maxParts);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
