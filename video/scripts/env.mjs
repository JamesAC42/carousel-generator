// Loads API keys from a .env file (KEY=value lines), for machines where they aren't already in the
// environment: the repo root's .env (the one the carousel generator server reads), then video/.env.
// Variables already set in the environment win.
for (const file of ['../../.env', '../.env']) {
  try {
    process.loadEnvFile(new URL(file, import.meta.url));
  } catch {
    // No such file.
  }
}
