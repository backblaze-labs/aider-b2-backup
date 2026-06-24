# aider-b2-backup

**Encrypted, incremental, off-site backups for your AI coding agent — powered by [Backblaze B2 cloud storage](https://blze.ai/storage).**

Incremental, **encrypted** backup of your [Aider](https://aider.chat) per-project chat history and config to [Backblaze B2](https://www.backblaze.com/cloud-storage).

Built on [`@backblaze-labs/agent-backup-core`](https://github.com/backblaze-labs/agent-backup-core).

## Why

Aider writes its chat transcript and input history into **each git repo** it runs in (`.aider.chat.history.md`, `.aider.input.history`) — there's no central store and no built-in backup/sync. This mirrors those per-project files to B2 on a schedule.

## How it differs from the other tools

Aider's state is **scattered across your projects**, so you tell it which projects to back up via `AIDER_PROJECTS` — there's nothing to auto-discover.

## Install & configure

```bash
npm install -g @backblaze-labs/aider-b2-backup
export AIDER_PROJECTS="$HOME/code/app1:$HOME/code/app2"   # path-delimiter or comma separated
export B2_KEY_ID=004... B2_APPLICATION_KEY=K004... B2_BUCKET=my-aider-backups
export B2_ENCRYPTION_KEY="a long random passphrase"
```

Or put the B2 settings in `~/.config/aider-b2-backup/config.json`. Optional: `B2_REGION`, `B2_PREFIX`, `B2_SCHEDULE`, `B2_KEEP_SNAPSHOTS`.

## Run

```bash
aider-b2-backup            # daemon: back up now, then on schedule
aider-b2-backup --once     # single backup then exit
aider-b2-backup --install  # install an OS service (launchd / systemd / Task Scheduler)
aider-b2-backup --help     # usage
```

## What gets backed up (per listed project)

- **Included:** `.aider.chat.history.md`, `.aider.input.history`, `.aider.llm.history` (if enabled), `.aider.conf.yml`, `.aiderignore`, model-settings files.
- **Excluded:** `.aider.tags.cache.v*/` (regenerable repo-map cache) and **`.env`** — that's your project's general secrets file, not Aider-specific, and isn't needed to restore chat history, so it's never shipped to B2.

## Security

Set `B2_ENCRYPTION_KEY` (separate from your B2 credentials) so the mirror is encrypted at rest. If your `.aider.conf.yml` contains API keys, note it is included (encrypted); keep keys in `.env` (excluded) if you'd rather they never leave the machine.

## FAQ

**How do I get Backblaze B2 credentials?**

Create a free [Backblaze B2](https://blze.ai/storage) account, make a bucket, then create an Application Key. Use the keyID and applicationKey as `B2_KEY_ID` and `B2_APPLICATION_KEY`, and the bucket name as `B2_BUCKET`.

**Is my data encrypted?**

Yes — AES-256-GCM at rest. Set `B2_ENCRYPTION_KEY` to a long random passphrase. If you don't, it falls back to deriving a key from your B2 application key and prints a warning; setting a dedicated key means a leaked bucket credential can't decrypt your backups.

**How often does it back up, and can I change the schedule?**

By default it backs up immediately on start and then daily. Set `B2_SCHEDULE` to `daily`, `weekly`, or any cron expression.

**Does it re-upload everything each time?**

No. Backups are incremental — only files that changed since the last run are uploaded (SHA-256 diffing); unchanged files are carried forward server-side, so each snapshot still restores on its own.

**How do I restore Aider on a new machine?**

Install and run `aider-b2-backup` on the new machine. If local state is empty and snapshots exist in your bucket, it auto-restores the latest snapshot on first run. (You can also point it at a fresh bucket prefix to keep machines separate.)

**How many snapshots are kept?**

The 10 most recent by default; older ones are pruned. Change with `B2_KEEP_SNAPSHOTS`.

**How do I run it automatically in the background?**

`aider-b2-backup --install` writes an OS service (launchd on macOS, systemd user unit on Linux, Task Scheduler on Windows). Because a background service can't see your shell's exported variables, put your credentials in `~/.config/aider-b2-backup/config.json` (chmod 600) before activating it.

**Can I back up several machines to one bucket?**

Yes — give each machine a distinct `B2_PREFIX` so their snapshots don't mix.

**How do I check it's actually working?**

Run `aider-b2-backup --once` and watch the output; it logs what it uploaded and the snapshot id. You can also browse the bucket in the B2 web UI.

**How much does this cost?**

Only your Backblaze B2 storage, which is priced per GB-month — see [blze.ai/storage](https://blze.ai/storage). The tool itself is free and open source (MIT).

**Why do I have to set `AIDER_PROJECTS`?**

Aider has no central data directory — it writes `.aider.chat.history.md` and friends into each git repo. So you tell the tool which project directories to back up via `AIDER_PROJECTS` (comma- or path-delimiter-separated). Without it there's nothing to back up.

**Is my project `.env` backed up?**

No. `.env` is your project's general secrets file (not Aider-specific and not needed to restore chat history), so it's excluded and never shipped to B2.

**What about the repo-map tags cache?**

Excluded — `.aider.tags.cache.v*` is a regenerable cache, not user data.

## Learn more

- [Backblaze B2 Cloud Storage](https://blze.ai/storage) — affordable, S3-compatible object storage
- [agent-backup-core](https://github.com/backblaze-labs/agent-backup-core) — the shared backup engine powering this tool

## License

MIT
