import { pretty, render } from "@react-email/render";
import type { ReactElement } from "react";

export async function renderEmail(react: ReactElement) {
  const html = await pretty(await render(react));
  const text = await render(react, { plainText: true });
  return { html, text };
}
