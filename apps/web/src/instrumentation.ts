export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/stellar/env");
    const { startBackgroundWorkers } = await import("@/lib/background-workers");
    startBackgroundWorkers();
  }
}
