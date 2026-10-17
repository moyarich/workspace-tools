import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planApprovedRelease } from "../../src/release-identity/workspace-approved-release.ts";

describe("approved workspace release planning", () => {
  function fixture() {
    const root = mkdtempSync(join(tmpdir(), "approved-release-"));
    const add = (
      directory: string,
      name: string,
      version: string,
      dependencies: Record<string, string> = {},
    ) => {
      const dir = join(root, directory);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name, version, dependencies }),
      );
    };
    return {
      root,
      add,
      cleanup: () => rmSync(root, { recursive: true, force: true }),
    };
  }

  it("resolves dependency stages without hardcoding package names", () => {
    const f = fixture();
    try {
      f.add("packages/base", "@demo/base", "2.0.0");
      f.add("packages/ui", "@demo/ui", "3.0.0", { "@demo/base": "^2.0.0" });
      const plan = planApprovedRelease(f.root, {
        schemaVersion: 1,
        packages: [
          { name: "@demo/ui", directory: "packages/ui", version: "3.0.0" },
          { name: "@demo/base", directory: "packages/base", version: "2.0.0" },
        ],
      });
      expect(plan.stages.map((stage) => stage.map((p) => p.name))).toEqual([
        ["@demo/base"],
        ["@demo/ui"],
      ]);
      expect(plan.packages[0]?.tag).toBe("packages/base@2.0.0");
    } finally {
      f.cleanup();
    }
  });

  it("rejects stale versions, path traversal, and duplicate packages", () => {
    const f = fixture();
    try {
      f.add("packages/base", "@demo/base", "2.1.0");
      const pkg = {
        name: "@demo/base",
        directory: "packages/base",
        version: "2.0.0",
      };
      expect(() =>
        planApprovedRelease(f.root, { schemaVersion: 1, packages: [pkg] }),
      ).toThrow(/differs/);
      expect(() =>
        planApprovedRelease(f.root, {
          schemaVersion: 1,
          packages: [{ ...pkg, directory: "../outside" }],
        }),
      ).toThrow(/Invalid/);
      expect(() =>
        planApprovedRelease(f.root, {
          schemaVersion: 1,
          packages: [
            { ...pkg, version: "2.1.0" },
            { ...pkg, version: "2.1.0" },
          ],
        }),
      ).toThrow(/Duplicate/);
    } finally {
      f.cleanup();
    }
  });
});
