#!/usr/bin/env node
// Thin entry point: all logic lives in @backblaze-labs/agent-backup-core.
// Usage:
//   aider-b2-backup            run as a daemon (back up now + on schedule)
//   aider-b2-backup --once     run a single backup and exit (for cron/CI)
//   aider-b2-backup --install  install an OS service that runs the daemon at login
//   aider-b2-backup --help     show usage
// Set AIDER_PROJECTS to the project dirs to back up (path-delimiter or comma separated).
// B2 credentials come from env vars or ~/.config/aider-b2-backup/config.json.
import { runCli } from "@backblaze-labs/agent-backup-core";
import { aiderAdapter } from "../dist/index.mjs";

runCli(aiderAdapter).catch((err) => {
  console.error(`aider-b2-backup: ${err?.message ?? err}`);
  process.exit(1);
});
