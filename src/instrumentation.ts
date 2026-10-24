// Runs once when the server starts: create and seed the demo database if empty.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureSeeded } = await import("./lib/seed");
    await ensureSeeded();
  }
}
