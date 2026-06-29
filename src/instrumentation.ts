// Next.js instrumentation hook — runs once when the server process starts.
// This is where we apply any pending DB migrations before the app takes requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./db/migrate')
    runMigrations()
  }
}
