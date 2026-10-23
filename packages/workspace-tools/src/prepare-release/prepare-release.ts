import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { workspacePackages, packageInfo } from "../workspace/workspace.ts";
import {
  resolveReleaseVersions,
  type ReleaseVersionOptions,
} from "../release-identity/release-versions.ts";

/** Prepare package manifests without publishing, tagging, or creating releases. */
export function prepareRelease(
  root: string,
  selector: string,
  options: ReleaseVersionOptions,
  write = false,
) {
  const rootPkg = packageInfo(root, ".");
  const eligible = workspacePackages(root).filter(
    (p) => p.manifest.private !== true,
  );
  if (rootPkg.manifest.private !== true) eligible.unshift(rootPkg);
  const selected =
    selector === "all"
      ? eligible
      : eligible.filter(
          (p) =>
            p.directory === selector ||
            p.manifest.name === selector ||
            p.directory.split("/").at(-1) === selector,
        );
  if (!selected.length)
    throw new Error("No publishable package matches " + selector);
  const resolved = resolveReleaseVersions(
    selected.map((p) => ({
      name: p.manifest.name,
      directory: p.directory,
      version: p.manifest.version,
    })),
    options,
  );
  const versions = new Map(resolved.map((p) => [p.name, p.version]));
  const updates: Array<{ file: string; content: string }> = [];
  for (const pkg of [rootPkg, ...workspacePackages(root)]) {
    const file = pkg.file;
    const original = readFileSync(file, "utf8");
    const manifest = JSON.parse(original);
    let changed = false;
    const next = versions.get(pkg.manifest.name);
    if (next && next !== manifest.version) {
      manifest.version = next;
      changed = true;
    }
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      for (const [name, version] of versions) {
        const prior = manifest[field]?.[name];
        if (
          typeof prior !== "string" ||
          /^(file:|workspace:|link:|npm:)/.test(prior)
        )
          continue;
        const prefix = prior.startsWith("^")
          ? "^"
          : prior.startsWith("~")
            ? "~"
            : "";
        if (prior !== prefix + version) {
          manifest[field][name] = prefix + version;
          changed = true;
        }
      }
    }
    if (changed)
      updates.push({ file, content: JSON.stringify(manifest, null, 2) + "\n" });
  }
  const manifest = {
    schemaVersion: 1,
    packages: resolved.map((p) => ({
      name: p.name,
      directory: p.directory,
      currentVersion: p.currentVersion,
      version: p.version,
    })),
  };
  if (write) {
    for (const update of updates) writeFileSync(update.file, update.content);
    execFileSync(
      "npm",
      [
        "install",
        "--package-lock-only",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: root, stdio: "inherit" },
    );
  }
  return { ...manifest, changedFiles: updates.map((u) => u.file) };
}
