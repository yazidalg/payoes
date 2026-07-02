import { FRIENDBOT_URL } from "./network";

export async function fundTestnetAccount(publicKey: string) {
  const url = `${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot funding failed: ${body}`);
  }

  return response.json();
}
