export const API_KEY_SCOPES = [
  "payments.read",
  "payments.write",
  "customers.read",
  "customers.write",
  "invoices.read",
  "invoices.write",
  "payment_links.read",
  "payment_links.write",
  "checkout_sessions.read",
  "checkout_sessions.write",
  "apis.all",
  "apis.read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export type ApiKeyResourceKey =
  | "payments"
  | "customers"
  | "invoices"
  | "payment_links"
  | "checkout_sessions";

export const API_KEY_RESOURCES: {
  key: ApiKeyResourceKey;
  name: string;
  description: string;
}[] = [
  {
    key: "payments",
    name: "Payments",
    description: "Create and manage payment intents.",
  },
  {
    key: "customers",
    name: "Customers",
    description: "Create and manage customer profiles.",
  },
  {
    key: "invoices",
    name: "Invoices",
    description: "Create and manage invoices.",
  },
  {
    key: "payment_links",
    name: "Payment links",
    description: "Create and manage payment links.",
  },
  {
    key: "checkout_sessions",
    name: "Checkout sessions",
    description: "Create and manage checkout sessions.",
  },
];

export const RESOURCE_SCOPES: {
  scope: ApiKeyScope;
  type: "read" | "write";
  resource: ApiKeyResourceKey;
}[] = [
  {
    scope: "payments.read",
    type: "read",
    resource: "payments",
  },
  {
    scope: "payments.write",
    type: "write",
    resource: "payments",
  },
  {
    scope: "customers.read",
    type: "read",
    resource: "customers",
  },
  {
    scope: "customers.write",
    type: "write",
    resource: "customers",
  },
  {
    scope: "invoices.read",
    type: "read",
    resource: "invoices",
  },
  {
    scope: "invoices.write",
    type: "write",
    resource: "invoices",
  },
  {
    scope: "payment_links.read",
    type: "read",
    resource: "payment_links",
  },
  {
    scope: "payment_links.write",
    type: "write",
    resource: "payment_links",
  },
  {
    scope: "checkout_sessions.read",
    type: "read",
    resource: "checkout_sessions",
  },
  {
    scope: "checkout_sessions.write",
    type: "write",
    resource: "checkout_sessions",
  },
];

export const SCOPES_BY_RESOURCE = API_KEY_RESOURCES.map((resource) => ({
  ...resource,
  scopes: RESOURCE_SCOPES.filter((scope) => scope.resource === resource.key),
}));

export const scopePresets = [
  {
    value: "all_access" as const,
    label: "All",
    description: "full access to all resources",
  },
  {
    value: "read_only" as const,
    label: "Read Only",
    description: "read-only access to all resources",
  },
  {
    value: "restricted" as const,
    label: "Restricted",
    description: "restricted access to some resources",
  },
];

export type ScopePreset = (typeof scopePresets)[number]["value"];

export function scopesToName(scopes: string[]) {
  if (scopes.includes("apis.all")) {
    return {
      name: "All access",
      description: "full access to all resources",
    };
  }

  if (scopes.includes("apis.read")) {
    return {
      name: "Read-only",
      description: "read-only access to all resources",
    };
  }

  return {
    name: "Restricted",
    description: "restricted access to some resources",
  };
}

export function validateScopes(scopes: string[]) {
  if (scopes.length === 0) {
    return false;
  }

  return scopes.every((scope) =>
    API_KEY_SCOPES.includes(scope as ApiKeyScope),
  );
}

export function apiKeyHasScope(
  scopes: string[],
  resource: ApiKeyResourceKey,
  action: "read" | "write",
) {
  if (scopes.includes("apis.all")) {
    return true;
  }

  if (action === "read" && scopes.includes("apis.read")) {
    return true;
  }

  const writeScope = `${resource}.write`;
  const readScope = `${resource}.read`;

  if (scopes.includes(writeScope)) {
    return true;
  }

  if (action === "read" && scopes.includes(readScope)) {
    return true;
  }

  return false;
}

export function mapScopesToResource(scopes: string[]) {
  const result = scopes.map((scope) => {
    const [resource] = scope.split(".");

    return {
      [resource]: scope,
    };
  });

  return Object.assign({}, ...result) as Record<string, ApiKeyScope | "">;
}

export function scopesObjectToArray(
  scopes: Record<string, ApiKeyScope | "">,
) {
  return Object.values(scopes).filter(Boolean) as ApiKeyScope[];
}
