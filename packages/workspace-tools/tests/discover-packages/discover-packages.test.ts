import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  discoverPackages,
  discoverPackagesReport,
  packageMatrix,
  type DiscoverPackagesOptions,
} from "../../src/discover-packages/discover-packages";

const originalCwd = process.cwd();
const tempDirectories: string[] = [];

function makeRepo(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "discover-packages-"));
  tempDirectories.push(directory);
  process.chdir(directory);
  execFileSync("git", ["init", "-q"]);
  return directory;
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
}

function options(
  overrides: Partial<DiscoverPackagesOptions> = {},
): DiscoverPackagesOptions {
  return {
    packagesDirectory: "packages",
    useWorkspaces: false,
    includeRootPackage: false,
    includePrivate: false,
    requirePublishConfig: false,
    requireTestScript: false,
    requireBuildScript: false,
    ...overrides,
  };
}

beforeEach(() => {
  process.chdir(originalCwd);
});

afterEach(() => {
  process.chdir(originalCwd);

  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("discoverPackages", () => {
  it("discovers direct-child packages and excludes private packages by default", () => {
    makeRepo();

    writeJson("packages/public/package.json", {
      name: "@moya/public",
      version: "1.2.3",
      scripts: { test: "vitest", build: "vite build" },
      publishConfig: { registry: "https://npm.pkg.github.com" },
    });
    writeJson("packages/private/package.json", {
      name: "@moya/private",
      private: true,
    });

    expect(discoverPackages(options())).toEqual([
      {
        directory: "packages/public",
        name: "@moya/public",
        version: "1.2.3",
        private: false,
        scoped: true,
        scope: "@moya",
        publishable: true,
        hasPublishConfig: true,
        guidance: [
          "For a public scoped package, set publishConfig.access to public or run npm publish --access public; npm scope access and registry permissions must be verified separately.",
        ],
        hasTest: true,
        hasBuild: true,
      },
    ]);
  });

  it("applies publish, test, and build filters", () => {
    makeRepo();

    writeJson("packages/complete/package.json", {
      name: "complete",
      publishConfig: { registry: "https://registry.npmjs.org" },
      scripts: { test: "vitest", build: "vite build" },
    });
    writeJson("packages/incomplete/package.json", {
      name: "incomplete",
      scripts: { test: "vitest" },
    });

    expect(
      discoverPackages(
        options({
          requirePublishConfig: true,
          requireTestScript: true,
          requireBuildScript: true,
        }),
      ).map((pkg) => pkg.name),
    ).toEqual(["complete"]);
  });

  it("includes the root package when requested and eligible", () => {
    makeRepo();

    writeJson("package.json", {
      name: "@moyarich/actions",
      version: "0.1.0",
      publishConfig: { registry: "https://npm.pkg.github.com" },
    });

    const packages = discoverPackages(
      options({ includeRootPackage: true, requirePublishConfig: true }),
    );

    expect(packages).toHaveLength(1);
    expect(packages[0]).toMatchObject({
      directory: ".",
      name: "@moyarich/actions",
      version: "0.1.0",
      private: false,
      publishable: true,
      hasPublishConfig: true,
      scoped: true,
      scope: "@moyarich",
    });
  });

  it("discovers tracked workspace packages from package.json patterns", () => {
    makeRepo();

    writeJson("package.json", {
      name: "workspace-root",
      private: true,
      workspaces: ["packages/*"],
    });
    writeJson("packages/alpha/package.json", {
      name: "@moya/alpha",
      version: "1.0.0",
    });
    writeJson("packages/beta/package.json", {
      name: "@moya/beta",
      version: "2.0.0",
    });

    execFileSync("git", [
      "add",
      "package.json",
      "packages/alpha/package.json",
      "packages/beta/package.json",
    ]);

    expect(
      discoverPackages(options({ useWorkspaces: true })).map((pkg) => pkg.name),
    ).toEqual(["@moya/alpha", "@moya/beta"]);
  });

  it("accepts access-only publishConfig and explains excluded workspaces", () => {
    makeRepo();
    writeJson("package.json", {
      name: "root",
      private: true,
      workspaces: ["packages/*"],
    });
    writeJson("packages/css-expand-collapse/package.json", {
      name: "@moyarich/css-expand-collapse",
      publishConfig: { access: "public" },
    });
    writeJson("packages/unconfigured/package.json", { name: "unconfigured" });
    writeJson("packages/private/package.json", {
      name: "private",
      private: true,
    });
    execFileSync("git", ["add", "."]);
    const report = discoverPackagesReport(
      options({ useWorkspaces: true, requirePublishConfig: true }),
    );
    expect(report.included.map((pkg) => pkg.name)).toEqual([
      "@moyarich/css-expand-collapse",
    ]);
    expect(report.included[0]).toMatchObject({
      scoped: true,
      scope: "@moyarich",
      publishable: true,
    });
    expect(report.total).toBe(3);
    expect(report.included[0].guidance).toEqual([]);
    expect(report.filtered.map((entry) => entry.package.name)).toEqual([
      "private",
      "unconfigured",
    ]);
    expect(
      report.filtered
        .find((entry) => entry.package.name === "unconfigured")
        ?.reasons.join(" "),
    ).toContain("publishConfig");
    expect(
      report.filtered
        .find((entry) => entry.package.name === "private")
        ?.reasons.join(" "),
    ).toContain("private");
  });

  it("detects scoped and unscoped package names and allows public packages without publishConfig unless required", () => {
    makeRepo();
    writeJson("packages/scoped/package.json", {
      name: "@team/widget",
      publishConfig: { registry: "https://registry.npmjs.org" },
    });
    writeJson("packages/unscoped/package.json", { name: "plain-widget" });
    writeJson("packages/access/package.json", {
      name: "@team/access",
      publishConfig: { access: "public" },
    });
    writeJson("packages/private/package.json", {
      name: "@team/private",
      private: true,
      publishConfig: { access: "public" },
    });
    const report = discoverPackagesReport(options());
    expect(report.included.map((pkg) => pkg.name)).toEqual([
      "@team/access",
      "@team/widget",
      "plain-widget",
    ]);
    expect(
      report.included.find((pkg) => pkg.name === "plain-widget"),
    ).toMatchObject({
      scoped: false,
      publishable: true,
      hasPublishConfig: false,
    });
    expect(
      report.included.find((pkg) => pkg.name === "@team/widget"),
    ).toMatchObject({ scoped: true, scope: "@team", publishable: true });
    expect(
      report.filtered.find((entry) => entry.package.name === "@team/private")
        ?.package.publishable,
    ).toBe(false);
    const required = discoverPackagesReport(
      options({ requirePublishConfig: true }),
    );
    expect(
      required.filtered
        .find((entry) => entry.package.name === "plain-widget")
        ?.reasons.join(" "),
    ).toContain("publishConfig");
  });

  it("creates a GitHub Actions include matrix", () => {
    const packages = [
      {
        directory: ".",
        name: "@moya/root",
        version: "1.0.0",
        private: false,
      },
    ];

    expect(packageMatrix(packages)).toEqual({ include: packages });
  });
});
