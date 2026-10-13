import { describe, expect, it } from "vitest";
import { resolveReleaseVersions } from "../../src/release-identity/release-versions.ts";

const packages = [
  { name: "@example/core", directory: "packages/core", version: "0.1.0" },
  {
    name: "@example/addon",
    directory: "packages/addons/example",
    version: "1.0.0",
  },
];

describe("resolveReleaseVersions", () => {
  it("keeps manifest versions when requested", () => {
    expect(
      resolveReleaseVersions(packages, { mode: "package-json" }, () => []),
    ).toMatchObject([
      { version: "0.1.0", currentVersion: "0.1.0", major: "0" },
      { version: "1.0.0" },
    ]);
  });

  it("uses latest stable package-specific tag for auto", () => {
    const tags = (prefix: string) =>
      prefix === "packages/core@"
        ? [
            "packages/core@0.1.0",
            "packages/core@0.2.0",
            "packages/core@0.2.1-beta.1",
            "packages/core@0.1.9",
          ]
        : ["packages/addons/example@1.2.0"];
    expect(
      resolveReleaseVersions(packages, { mode: "auto" }, tags).map(
        (p) => p.version,
      ),
    ).toEqual(["0.2.1", "1.2.1"]);
  });

  it("uses the initial version without release tags", () => {
    expect(
      resolveReleaseVersions(
        packages,
        { mode: "auto", initialVersion: "0.5.0" },
        () => [],
      ).map((p) => p.version),
    ).toEqual(["0.5.0", "0.5.0"]);
  });

  it("supports major, minor, patch and prerelease bumps", () => {
    expect(
      resolveReleaseVersions(
        packages,
        { mode: "bump", bump: "minor" },
        () => [],
      )[0].version,
    ).toBe("0.2.0");
    expect(
      resolveReleaseVersions(
        packages,
        { mode: "bump", bump: "prerelease" },
        () => [],
      )[0].version,
    ).toBe("0.1.1-0");
  });

  it("supports exact versions", () => {
    expect(
      resolveReleaseVersions(
        packages,
        { mode: "exact", exactVersion: "2.1.3" },
        () => [],
      ).map((p) => p.version),
    ).toEqual(["2.1.3", "2.1.3"]);
  });

  it("rejects malformed versions and empty selections", () => {
    expect(() =>
      resolveReleaseVersions([], { mode: "auto" }, () => []),
    ).toThrow();
    expect(() =>
      resolveReleaseVersions(
        packages,
        { mode: "exact", exactVersion: "oops" },
        () => [],
      ),
    ).toThrow();
  });
});
