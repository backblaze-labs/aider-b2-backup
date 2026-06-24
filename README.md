# aider-b2-backup

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

## License

MIT
