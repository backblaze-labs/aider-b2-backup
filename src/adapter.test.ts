import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { shouldInclude } from "@backblaze-labs/agent-backup-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { aiderAdapter, aiderCandidateRoots, aiderProjectDirs } from "./adapter.js";

describe("aiderProjectDirs", () => {
  it("parses comma / colon / semicolon separated lists", () => {
    expect(aiderProjectDirs({ AIDER_PROJECTS: "/a/x, /b/y" } as NodeJS.ProcessEnv)).toEqual(["/a/x", "/b/y"]);
    expect(aiderProjectDirs({ AIDER_PROJECTS: "/a:/b" } as NodeJS.ProcessEnv)).toEqual(["/a", "/b"]);
    expect(aiderProjectDirs({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});

describe("aiderCandidateRoots", () => {
  it("labels by basename and disambiguates collisions", () => {
    const roots = aiderCandidateRoots({ AIDER_PROJECTS: "/work/app,/personal/app" } as NodeJS.ProcessEnv);
    expect(roots.map((r) => r.label)).toEqual(["app", "app-2"]);
    expect(roots.map((r) => r.dir)).toEqual(["/work/app", "/personal/app"]);
  });

  it("normalizes labels without regex-based trimming", () => {
    const roots = aiderCandidateRoots({
      AIDER_PROJECTS: "/work/app///,/work/--my app!!--,/work/---",
    } as NodeJS.ProcessEnv);
    expect(roots.map((r) => r.label)).toEqual(["app", "my-app", "project"]);
  });
});

describe("aiderAdapter.resolveRoots", () => {
  let a: string;
  let b: string;
  beforeEach(async () => {
    const base = await fs.promises.mkdtemp(path.join(os.tmpdir(), "aider-"));
    a = path.join(base, "proj-a");
    b = path.join(base, "proj-b");
    await fs.promises.mkdir(a, { recursive: true });
    // b intentionally not created
  });
  afterEach(async () => {
    await fs.promises.rm(path.dirname(a), { recursive: true, force: true });
  });

  it("returns only existing project dirs", () => {
    const roots = aiderAdapter.resolveRoots({ AIDER_PROJECTS: `${a},${b}` } as NodeJS.ProcessEnv);
    expect(roots.map((r) => r.dir)).toEqual([a]);
  });

  it("returns nothing when AIDER_PROJECTS is unset", () => {
    expect(aiderAdapter.resolveRoots({} as NodeJS.ProcessEnv)).toEqual([]);
  });
});

describe("aiderAdapter include/exclude/secret patterns", () => {
  const patterns = {
    include: aiderAdapter.include,
    exclude: aiderAdapter.exclude,
    secretExclude: aiderAdapter.secretExclude,
  };

  it("includes chat history and user config", () => {
    for (const p of [
      "app/.aider.chat.history.md",
      "app/.aider.input.history",
      "app/.aider.conf.yml",
      "app/.aiderignore",
    ]) {
      expect(shouldInclude(p, patterns)).toBe(true);
    }
  });

  it("excludes the regenerable tags cache and the project .env secret", () => {
    expect(shouldInclude("app/.aider.tags.cache.v3/index", patterns)).toBe(false);
    expect(shouldInclude("app/.aider.tags.cache.v4/x", patterns)).toBe(false);
    expect(shouldInclude("app/.env", patterns)).toBe(false);
  });
});
