import { describe, expect, it, vi } from "vitest";
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
