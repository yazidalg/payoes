export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new Error(`Empty response from server (${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Invalid JSON response from server (${response.status}): ${text.slice(0, 200)}`
    );
  }
}
