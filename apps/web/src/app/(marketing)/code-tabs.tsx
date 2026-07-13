"use client";

import { useState } from "react";

const TABS = [
  {
    label: "cURL",
    code: `curl -X POST https://payoes.com/api/v1/payments \\
  -H "Authorization: Bearer pk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "49.99",
    "settlement_asset": "USDC",
    "metadata": { "order_id": "1042" }
  }'`,
  },
  {
    label: "JavaScript",
    code: `const res = await fetch(
  "https://payoes.com/api/v1/payments",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.PAYOES_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: "49.99",
      settlement_asset: "USDC",
      metadata: { order_id: "1042" },
    }),
  }
);

const payment = await res.json();
// payment.checkout_url → send your customer here`,
  },
  {
    label: "Python",
    code: `import os
import requests

res = requests.post(
    "https://payoes.com/api/v1/payments",
    headers={
        "Authorization": f"Bearer {os.environ['PAYOES_API_KEY']}",
    },
    json={
        "amount": "49.99",
        "settlement_asset": "USDC",
        "metadata": {"order_id": "1042"},
    },
)

payment = res.json()
# payment["checkout_url"] → send your customer here`,
  },
];

export function CodeTabs() {
  const [active, setActive] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-xl">
      <div className="flex items-center gap-1 border-b border-neutral-800 px-3 pt-3">
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-t-lg px-4 py-2 font-mono text-xs transition-colors ${
              active === i
                ? "border border-b-0 border-neutral-800 bg-neutral-900 text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6 text-neutral-200">
        {TABS[active].code}
      </pre>
    </div>
  );
}
