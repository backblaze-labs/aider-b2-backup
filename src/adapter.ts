import fs from "node:fs";
import path from "node:path";
import type { BackupAdapter, BackupRoot } from "@backblaze-labs/agent-backup-core";

/**
 * Aider stores no central state dir: its history/config files are written into
 * each git repo root (e.g. `.aider.chat.history.md`, `.aider.input.history`).
 * So this adapter mirrors a USER-SUPPLIED list of project directories, given via
 * the `AIDER_PROJECTS` env var (OS path-delimiter- or comma-separated). There's
 * nothing to discover automatically — without that list there's nothing to back up.
 *
 * Verified against github.com/Aider-AI/aider (args.py path defaults, repomap.py
 * tags cache, analytics.py) and aider.chat/docs.
 */
export function aiderProjectDirs(env: NodeJS.ProcessEnv): string[] {
  const raw = env.AIDER_PROJECTS;
  if (!raw) return [];
  // Split on comma or the platform path delimiter (`:` on POSIX, `;` on Windows).
  // Using the platform delimiter avoids fracturing a Windows drive path (`C:\…`),
  // which a bare `:` split would break.
  return raw
    .split(new RegExp(`[,${path.delimiter}]`))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Filesystem/regex-safe label from a project dir's basename. */
function labelFor(dir: string): string {
  const trimmedDir = trimTrailingSeparators(dir);
  const base = path.basename(trimmedDir) || "project";
  return trimHyphens(toSafeLabel(base)) || "project";
}

function trimTrailingSeparators(value: string): string {
  let end = value.length;
  while (end > 0 && (value[end - 1] === "/" || value[end - 1] === "\\")) {
    end -= 1;
  }
  return value.slice(0, end);
}

function toSafeLabel(value: string): string {
  const label: string[] = [];
  let lastWasHyphen = false;

  for (const char of value) {
    const isSafe =
      (char >= "A" && char <= "Z") || (char >= "a" && char <= "z") || (char >= "0" && char <= "9");

    if (isSafe) {
      label.push(char);
      lastWasHyphen = false;
    } else if (!lastWasHyphen) {
      label.push("-");
      lastWasHyphen = true;
    }
  }

  return label.join("");
}

function trimHyphens(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === "-") {
    start += 1;
  }

  while (end > start && value[end - 1] === "-") {
    end -= 1;
  }

  return value.slice(start, end);
}

export function aiderCandidateRoots(env: NodeJS.ProcessEnv): BackupRoot[] {
  const counts = new Map<string, number>();
  return aiderProjectDirs(env).map((dir) => {
    const base = labelFor(dir);
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return { label: n === 1 ? base : `${base}-${n}`, dir };
  });
}

export const aiderAdapter: BackupAdapter = {
  id: "aider",

  // Aider has no central dir to discover, so guide the user when the list is empty.
  noRootsHint: "Set AIDER_PROJECTS to your Aider project directories (comma- or path-delimiter-separated).",

  resolveRoots(env) {
    return aiderCandidateRoots(env).filter((r) => {
      try {
        return fs.statSync(r.dir).isDirectory();
      } catch {
        return false;
      }
    });
  },

  // Per-project conversation history and user config (labels are project names).
  include: [
    /(^|\/)\.aider\.chat\.history\.md$/,
    /(^|\/)\.aider\.input\.history$/,
    /(^|\/)\.aider\.llm\.history$/, // opt-in LLM log, if the user enabled it
    /(^|\/)\.aider\.conf\.yml$/,
    /(^|\/)\.aiderignore$/,
    /(^|\/)\.aider\.model\.settings\.yml$/,
    /(^|\/)\.aider\.model\.metadata\.json$/,
  ],

  // Regenerable repo-map cache (can be large).
  exclude: [/(^|\/)\.aider\.tags\.cache\.v\d+(\/|$)/],

  // Aider writes nothing to SQLite.
  sqlite: [],

  // `.env` is the project's general secrets file (not Aider-specific and not
  // needed to restore chat history). Exclude it — don't ship project secrets to B2.
  secretExclude: [/(^|\/)\.env$/],
};
