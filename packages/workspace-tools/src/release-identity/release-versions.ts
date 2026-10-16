import { execFileSync } from "node:child_process";
import semver from "semver";

export interface VersionedPackage {
  name: string;
  directory: string;
  version: string;
  [key: string]: unknown;
}
export interface ReleaseVersionOptions {
  mode: "auto" | "bump" | "package-json" | "exact";
  bump?:
    | "major"
    | "minor"
    | "patch"
    | "premajor"
    | "preminor"
    | "prepatch"
    | "prerelease";
  initialVersion?: string;
  exactVersion?: string;
}

/**
 * Resolve versions for any package workspace; package scoped Git tags are
 * canonical, and auto increments the latest stable release tag by one patch.
 */
export function resolveReleaseVersions<T extends VersionedPackage>(
  packages: T[],
  options: ReleaseVersionOptions,
  listTags: (prefix: string) => string[] = (prefix) =>
    execFileSync("git", ["tag", "--list", `${prefix}*`], { encoding: "utf8" })
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean),
): Array<T & { currentVersion: string; major: string }> {
  if (!Array.isArray(packages) || !packages.length)
    throw new Error("No packages selected for release.");
  const {
    mode,
    bump = "patch",
    initialVersion = "0.1.0",
    exactVersion = "",
  } = options;
  if (!["auto", "bump", "package-json", "exact"].includes(mode))
    throw new Error(`Invalid version mode: ${mode}`);
  if (!semver.valid(initialVersion))
    throw new Error(`Invalid initial version: ${initialVersion}`);
  return packages.map((pkg) => {
    const current = pkg.version;
    if (!semver.valid(current))
      throw new Error(`Invalid current version for ${pkg.name}: ${current}`);
    let version = current;
    if (mode === "exact") version = exactVersion;
    if (mode === "bump") version = semver.inc(current, bump) ?? "";
    if (mode === "auto") {
      const prefix = (pkg.directory === "." ? pkg.name : pkg.directory) + "@";
      const prefixes = [...new Set([prefix, `${pkg.name}@`])];
      const previous = prefixes
        .flatMap((tagPrefix) =>
          listTags(tagPrefix)
            .filter((tag) => tag.startsWith(tagPrefix))
            .map((tag) => tag.slice(tagPrefix.length)),
        )
        .filter((v) => semver.valid(v) && !semver.prerelease(v))
        .sort(semver.compare)
        .at(-1);
      // Never roll back an existing manifest, even if tags are missing.
      const baseline =
        previous && semver.gt(previous, current) ? previous : current;
      version =
        previous || semver.gt(current, initialVersion)
          ? (semver.inc(baseline, "patch") ?? "")
          : initialVersion;
    }
    if (!semver.valid(version))
      throw new Error(`Invalid resolved version for ${pkg.name}: ${version}`);
    return {
      ...pkg,
      currentVersion: current,
      version,
      major: semver.major(version).toString(),
    };
  });
}
