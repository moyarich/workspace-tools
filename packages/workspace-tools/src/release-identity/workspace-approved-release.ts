import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";

interface ApprovedPackage {
  name: string;
  directory: string;
  version: string;
}
interface Manifest {
  schemaVersion: number;
  packages: ApprovedPackage[];
}
interface PlannedPackage extends ApprovedPackage {
  tag: string;
  dependencies: string[];
  stage: number;
}
const fail = (message: string): never => {
  throw new Error(message);
};
const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const safeDirectory = /^(?:packages\/)?[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/;

/**
 * Validate an approved workspace release manifest against the checked-out
 * merged commit and return publish stages in dependency order.
 *
 * This planner never publishes, tags, or mutates files.
 */
export function planApprovedRelease(
  root: string,
  manifest: Manifest,
): { packages: PlannedPackage[]; stages: PlannedPackage[][] } {
  if (
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.packages) ||
    manifest.packages.length === 0
  ) {
    fail("Expected a nonempty schemaVersion 1 release manifest");
  }
  const selected = new Map<string, PlannedPackage>();
  for (const item of manifest.packages) {
    if (
      !item ||
      typeof item.name !== "string" ||
      typeof item.directory !== "string" ||
      typeof item.version !== "string" ||
      !safeDirectory.test(item.directory) ||
      item.directory.split("/").some((part) => part === "." || part === "..") ||
      !exactVersion.test(item.version)
    ) {
      fail("Invalid release manifest package");
    }
    if (selected.has(item.name))
      fail("Duplicate release package: " + item.name);
    const file = resolve(root, item.directory, "package.json");
    if (relative(root, file).startsWith(".." + sep))
      fail("Package path escapes workspace");
    const actual = JSON.parse(readFileSync(file, "utf8"));
    if (
      actual.name !== item.name ||
      actual.version !== item.version ||
      actual.private === true
    ) {
      fail("Approved release manifest differs from package.json: " + item.name);
    }
    selected.set(item.name, {
      ...item,
      tag: item.directory + "@" + item.version,
      dependencies: Object.keys({
        ...actual.dependencies,
        ...actual.optionalDependencies,
      }),
      stage: -1,
    });
  }
  const visiting = new Set<string>();
  function visit(pkg: PlannedPackage): number {
    if (pkg.stage >= 0) return pkg.stage;
    if (visiting.has(pkg.name))
      fail("Circular workspace release dependency: " + pkg.name);
    visiting.add(pkg.name);
    const dependencies = pkg.dependencies.filter((name) => selected.has(name));
    pkg.dependencies = dependencies;
    pkg.stage = dependencies.length
      ? Math.max(...dependencies.map((name) => visit(selected.get(name)!))) + 1
      : 0;
    visiting.delete(pkg.name);
    return pkg.stage;
  }
  for (const pkg of selected.values()) visit(pkg);
  const packages = [...selected.values()].sort(
    (a, b) => a.stage - b.stage || a.name.localeCompare(b.name),
  );
  const stages = Array.from(
    { length: Math.max(...packages.map((pkg) => pkg.stage)) + 1 },
    (_, stage) => packages.filter((pkg) => pkg.stage === stage),
  );
  return { packages, stages };
}

function main() {
  const argv = process.argv.slice(2);
  const argument = (key: string): string => {
    const index = argv.indexOf(key);
    if (index < 0 || !argv[index + 1]) fail("Missing argument: " + key);
    return argv[index + 1]!;
  };
  const root = resolve(argument("--root"));
  const manifest = JSON.parse(
    readFileSync(resolve(root, argument("--manifest")), "utf8"),
  ) as Manifest;
  const expected = argument("--expected-sha");
  if (!/^[0-9a-f]{40}$/.test(expected))
    fail("Expected exact 40-character merged commit SHA");
  const actual = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (actual !== expected)
    fail("Checked-out SHA does not match merged release PR: " + actual);
  process.stdout.write(
    JSON.stringify({ sha: actual, ...planApprovedRelease(root, manifest) }) +
      "\n",
  );
}
if (process.argv[1]?.includes("workspace-approved-release")) {
  try {
    main();
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
}
