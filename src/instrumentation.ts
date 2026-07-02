// Next.js instrumentation hook — runs once when the server process starts.
// This is where we apply any pending DB migrations before the app takes requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./db/migrate')
    runMigrations()
    const { bootstrapAdmin, seedFounders } = await import('./db/bootstrap')
    await bootstrapAdmin()
    // Catch-all: promote any founding-trio members who signed up while the
    // server was down. Signup also promotes them in real time.
    await seedFounders()
  }
}
