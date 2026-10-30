import { describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareRelease } from "../../src/prepare-release/prepare-release.ts";
describe("workspace preparation", () => {
  it("leaves private playground dependencies unchanged while updating published package ranges", () => {
    const root = mkdtempSync(join(tmpdir(), "prepare-release-"));
    try {
      for (const dir of [
        "packages/lib",
        "packages/consumer",
        "apps/playground",
      ])
        mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "root",
          version: "0.0.0",
          private: true,
          workspaces: ["packages/*", "apps/*"],
        }),
      );
      writeFileSync(
        join(root, "packages/lib/package.json"),
        JSON.stringify({
          name: "@example/lib",
          version: "0.1.0",
        }),
      );
      writeFileSync(
        join(root, "packages/consumer/package.json"),
        JSON.stringify({
          name: "@example/consumer",
          version: "0.1.0",
          dependencies: { "@example/lib": "^0.1.0" },
        }),
      );
      const playground = join(root, "apps/playground/package.json");
      const original = JSON.stringify({
        name: "@example/playground",
        private: true,
        version: "0.0.0",
        dependencies: {
          "@example/lib": "*",
          "@example/consumer": "workspace:*",
        },
      });
      writeFileSync(playground, original);
      const result = prepareRelease(
        root,
        "all",
        { mode: "bump", bump: "minor" },
        false,
      );
      expect(result.packages).toHaveLength(2);
      expect(result.changedFiles).toHaveLength(2);
      expect(result.changedFiles).not.toContain(playground);
      expect(readFileSync(playground, "utf8")).toBe(original);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("skips tagged unchanged addons and excludes their manifest and lockfile", () => {
    const root = mkdtempSync(join(tmpdir(), "prepare-release-git-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
    try {
      for (const dir of ["packages/changed", "packages/unchanged"])
        mkdirSync(join(root, dir), { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({
        name: "root", version: "0.0.0", private: true, workspaces: ["packages/*"],
      }));
      for (const name of ["changed", "unchanged"]) {
        writeFileSync(join(root, `packages/${name}/package.json`), JSON.stringify({
          name: `@example/${name}`, version: "0.1.0",
        }));
        writeFileSync(join(root, `packages/${name}/index.ts`), "export const value = 1;\\n");
      }
      git("init"); git("config", "user.email", "test@example.com");
      git("config", "user.name", "Release Test");
      git("add", "."); git("commit", "-m", "initial");
      git("tag", "packages/changed@0.1.0");
      git("tag", "packages/unchanged@0.1.0");
      writeFileSync(join(root, "packages/changed/index.ts"), "export const value = 2;\\n");
      git("add", "."); git("commit", "-m", "change only one addon");
      const result = prepareRelease(root, "all", { mode: "bump", bump: "minor" }, false);
      expect(result.packages.map((p) => p.name)).toEqual(["@example/changed"]);
      expect(result.changedFiles).toEqual([join(root, "packages/changed/package.json")]);
      expect(readFileSync(join(root, "packages/unchanged/package.json"), "utf8"))
        .toContain('"version":"0.1.0"');
      // Metadata-only edits do not qualify as a package implementation change.
      git("tag", "-f", "packages/changed@0.1.0");
      writeFileSync(join(root, "packages/changed/CHANGELOG.md"), "release notes\\n");
      git("add", "."); git("commit", "-m", "notes only");
      // A version-only edit stays excluded; dependency range changes qualify.
      const dependencyFile = join(root, "packages/unchanged/package.json");
      writeFileSync(dependencyFile, JSON.stringify({
        name: "@example/unchanged", version: "0.1.0",
        peerDependencies: { "@example/changed": "^1.2.0" },
      }));
      git("add", "."); git("commit", "-m", "update peer range");
      const dependencyChange = prepareRelease(root, "all", { mode: "bump", bump: "minor" }, false);
      expect(dependencyChange.packages.map((p) => p.name)).toEqual(["@example/unchanged"]);
      // Return to the exact tag manifest before testing no-change behavior.
      git("reset", "--hard", "HEAD~1");
      const none = prepareRelease(root, "all", { mode: "bump", bump: "minor" }, true);
      expect(none.packages).toEqual([]);
      expect(none.changedFiles).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("includes incompatible dependents transitively but skips compatible ranges", () => {
    const root = mkdtempSync(join(tmpdir(), "prepare-release-dependents-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
    try {
      for (const name of ["core", "addon", "consumer", "compatible"])
        mkdirSync(join(root, "packages", name), { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({
        name: "root", version: "0.0.0", private: true, workspaces: ["packages/*"],
      }));
      const definitions = {
        core: { name: "@example/core", version: "0.1.0" },
        addon: { name: "@example/addon", version: "0.1.0", peerDependencies: { "@example/core": "^0.1.0" } },
        consumer: { name: "@example/consumer", version: "0.1.0", dependencies: { "@example/addon": "^0.1.0" } },
        compatible: { name: "@example/compatible", version: "0.1.0", peerDependencies: { "@example/core": ">=0.1.0 <1.0.0" } },
      };
      for (const [name, manifest] of Object.entries(definitions)) {
        writeFileSync(join(root, "packages", name, "package.json"), JSON.stringify(manifest));
        writeFileSync(join(root, "packages", name, "index.ts"), "export const value = 1;\n");
      }
      git("init"); git("config", "user.email", "ci@example.com"); git("config", "user.name", "CI");
      git("add", "."); git("commit", "-m", "first release");
      for (const name of Object.keys(definitions)) git("tag", `packages/${name}@0.1.0`);
      writeFileSync(join(root, "packages/core/index.ts"), "export const value = 2;\n");
      git("add", "."); git("commit", "-m", "core feature");
      const result = prepareRelease(root, "all", { mode: "bump", bump: "minor" }, false);
      expect(result.packages.map((p) => p.name).sort()).toEqual([
        "@example/addon", "@example/consumer", "@example/core",
      ]);
      expect(result.changedFiles.map((file) => file.replace(root, ""))).toEqual(
        expect.arrayContaining(["/packages/core/package.json", "/packages/addon/package.json", "/packages/consumer/package.json"]),
      );
      expect(result.changedFiles.some((file) => file.includes("/compatible/"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("previews existing package.json versions without mutation", () => {
    const root = mkdtempSync(join(tmpdir(), "prepare-release-"));
    try {
      mkdirSync(join(root, "packages", "lib"), { recursive: true });
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "root",
          version: "1.0.0",
          private: true,
          workspaces: ["packages/*"],
        }),
      );
      const file = join(root, "packages", "lib", "package.json");
      const initial = JSON.stringify({
        name: "@example/lib",
        version: "2.3.4",
      });
      writeFileSync(file, initial);
      const result = prepareRelease(
        root,
        "all",
        { mode: "package-json" },
        false,
      );
      expect(result.packages[0].version).toBe("2.3.4");
      expect(result.changedFiles).toEqual([]);
      expect(readFileSync(file, "utf8")).toBe(initial);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("resolves bump and exact mode without writing manifests", () => {
    const root = mkdtempSync(join(tmpdir(), "prepare-release-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ name: "root", version: "1.2.3", private: false }),
      );
      expect(
        prepareRelease(root, "all", { mode: "bump", bump: "minor" }).packages[0]
          .version,
      ).toBe("1.3.0");
      expect(
        prepareRelease(root, "all", {
          mode: "exact",
          exactVersion: "5.0.0-beta.1",
        }).packages[0].version,
      ).toBe("5.0.0-beta.1");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
