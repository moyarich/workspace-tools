import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type DiscoverPackagesOptions = {
  packagesDirectory: string;
  useWorkspaces: boolean;
  includeRootPackage: boolean;
  includePrivate: boolean;
  requirePublishConfig: boolean;
  requireTestScript: boolean;
  requireBuildScript: boolean;
};

export type DiscoveredPackage = {
  directory: string;
  name: string;
  version: string;
  private: boolean;
  scoped: boolean;
  scope?: string;
  /** Static npm eligibility; registry credentials and permissions are not checked. */
  publishable: boolean;
  hasPublishConfig: boolean;
  access?: "public" | "restricted";
  guidance: string[];
  hasTest?: boolean;
  hasBuild?: boolean;
};

function readManifest(file: string): Record<string, any> {
  return JSON.parse(readFileSync(file, "utf8"));
}

function packageFromManifest(
  directory: string,
  manifest: Record<string, any>,
  fallbackName: string,
): DiscoveredPackage {
  return {
    directory,
    name: manifest.name ?? fallbackName,
    version: manifest.version ?? "0.0.0",
    private: manifest.private === true,
    scoped: /^@[^/]+\/[^/]+$/.test(manifest.name ?? fallbackName),
    ...(/^@[^/]+\/[^/]+$/.test(manifest.name ?? fallbackName)
      ? { scope: String(manifest.name ?? fallbackName).split("/")[0] }
      : {}),
    publishable: manifest.private !== true,
    hasPublishConfig:
      manifest.publishConfig !== null &&
      typeof manifest.publishConfig === "object" &&
      !Array.isArray(manifest.publishConfig),
    ...(manifest.publishConfig?.access === "public" ||
    manifest.publishConfig?.access === "restricted"
      ? { access: manifest.publishConfig.access }
      : {}),
    guidance:
      manifest.private === true
        ? ["Remove private: true to allow npm publish."]
        : /^@[^/]+\/[^/]+$/.test(manifest.name ?? fallbackName) &&
            manifest.publishConfig?.access !== "public"
          ? [
              "For a public scoped package, set publishConfig.access to public or run npm publish --access public; npm scope access and registry permissions must be verified separately.",
            ]
          : [],
    hasTest: typeof manifest.scripts?.test === "string",
    hasBuild: typeof manifest.scripts?.build === "string",
  };
}

function discoverWorkspacePackages(
  options: DiscoverPackagesOptions,
): DiscoveredPackage[] {
  if (!existsSync("package.json")) return [];

  const root = readManifest("package.json");
  const raw = Array.isArray(root.workspaces)
    ? root.workspaces
    : Array.isArray(root.workspaces?.packages)
      ? root.workspaces.packages
      : [];

  const patterns = raw
    .map((value: unknown) => String(value).replace(/\/$/, ""))
    .filter(Boolean);

  const files = new Set<string>();

  for (const pattern of patterns) {
    const output = execFileSync(
      "git",
      ["ls-files", "--cached", "-z", "--", `:(glob)${pattern}/package.json`],
      { encoding: "utf8" },
    );

    for (const file of output.split("\0").filter(Boolean)) {
      files.add(file);
    }
  }

  return [...files].map((file) => {
    const directory = path.posix.dirname(file);
    return packageFromManifest(
      directory,
      readManifest(file),
      path.posix.basename(directory),
    );
  });
}

function discoverDirectoryPackages(
  options: DiscoverPackagesOptions,
): DiscoveredPackage[] {
  if (!existsSync(options.packagesDirectory)) return [];

  const packages: DiscoveredPackage[] = [];

  for (const entry of readdirSync(options.packagesDirectory, {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;

    const directory = path.posix.join(options.packagesDirectory, entry.name);
    const manifestPath = path.posix.join(directory, "package.json");

    if (!existsSync(manifestPath)) continue;

    const pkg = packageFromManifest(
      directory,
      readManifest(manifestPath),
      entry.name,
    );

    packages.push(pkg);
  }

  return packages;
}

function discoverRootPackage(
  options: DiscoverPackagesOptions,
): DiscoveredPackage | null {
  if (!options.includeRootPackage || !existsSync("package.json")) return null;

  const manifest = readManifest("package.json");
  if (typeof manifest.name !== "string") return null;

  const pkg = packageFromManifest(".", manifest, manifest.name);
  return pkg;
}

export function discoverPackagesReport(options: DiscoverPackagesOptions) {
  const packages = options.useWorkspaces
    ? discoverWorkspacePackages(options)
    : discoverDirectoryPackages(options);

  const root = discoverRootPackage(options);
  if (root) packages.unshift(root);

  const included: DiscoveredPackage[] = [];
  const filtered: { package: DiscoveredPackage; reasons: string[] }[] = [];
  for (const pkg of packages.sort((a, b) => a.name.localeCompare(b.name))) {
    const reasons: string[] = [];
    if (pkg.private && !options.includePrivate)
      reasons.push("npm cannot publish packages with private: true; remove this field or set it to false.");
    if (options.requirePublishConfig && !pkg.hasPublishConfig)
      reasons.push("The --require-publish-config filter requires publishConfig; npm does not require it for publishing.");
    if (options.requireTestScript && !pkg.hasTest)
      reasons.push("Add scripts.test to package.json.");
    if (options.requireBuildScript && !pkg.hasBuild)
      reasons.push("Add scripts.build to package.json.");
    if (reasons.length) filtered.push({ package: pkg, reasons });
    else included.push(pkg);
  }
  return { included, filtered, total: included.length + filtered.length };
}

export function discoverPackages(
  options: DiscoverPackagesOptions,
): DiscoveredPackage[] {
  return discoverPackagesReport(options).included;
}

export function packageMatrix(packages: DiscoveredPackage[]) {
  return { include: packages };
}
