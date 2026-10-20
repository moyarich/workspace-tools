import { Option, program } from "commander";
import { discoverPackagesReport } from "./discover-packages";
import { appendFileSync } from "node:fs";

program
  .name("discover-packages")
  .description("Discover repository packages and package metadata.")
  .option("--directory <directory>", "Packages directory", "packages")
  .option("--workspaces", "Discover from package.json workspace patterns")
  .option("--include-root-package", "Include the repository root package")
  .option("--include-private", "Include private packages")
  .option("--require-publish-config", "Only include publishable packages")
  .option("--require-test-script", "Only include packages with a test script")
  .option("--require-build-script", "Only include packages with a build script")
  .addOption(
    new Option("--format <format>", "Output format").choices([
      "text",
      "json",
      "pretty-json",
    ]),
  )
  .option("--json", "Print compact JSON")
  .option("--report", "Return included and filtered packages as JSON")
  .option(
    "--github-summary",
    "Report publishability in GitHub Actions summary and annotations",
  )
  .option("--pretty-json", "Print formatted JSON")
  .action((options) => {
    const directory = options.directory;
    const report = discoverPackagesReport({
      packagesDirectory: directory,
      useWorkspaces: Boolean(options.workspaces),
      includeRootPackage: Boolean(options.includeRootPackage),
      includePrivate: Boolean(options.includePrivate),
      requirePublishConfig: Boolean(options.requirePublishConfig),
      requireTestScript: Boolean(options.requireTestScript),
      requireBuildScript: Boolean(options.requireBuildScript),
    });

    const packages = report.included;
    if (options.githubSummary) {
      const rows = [
        "# Package discovery and publishability",
        "",
        "Included: " +
          report.included.length +
          " · Filtered: " +
          report.filtered.length,
        "",
        "| Package | Manifest | Status | Required changes |",
        "| --- | --- | --- | --- |",
        ...report.included.map(
          (pkg) =>
            "| " +
            pkg.name +
            " | \`" +
            pkg.directory +
            "/package.json\` | Included | — |",
        ),
        ...report.filtered.map(
          ({ package: pkg, reasons }) =>
            "| " +
            pkg.name +
            " | \`" +
            pkg.directory +
            "/package.json\` | Filtered | " +
            reasons.join(" ").replaceAll("|", "\\|") +
            " |",
        ),
      ];
      if (process.env.GITHUB_STEP_SUMMARY)
        appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          rows.join("\n") + "\n",
        );
      for (const { package: pkg, reasons } of report.filtered) {
        const encode = (text: string) =>
          text
            .replaceAll("%", "%25")
            .replaceAll("\r", "%0D")
            .replaceAll("\n", "%0A");
        process.stderr.write(
          "::warning file=" +
            encode(pkg.directory + "/package.json") +
            ",title=Package filtered::" +
            encode(pkg.name + ": " + reasons.join(" ")) +
            "\n",
        );
      }
    }
    const format = options.json
      ? "json"
      : options.prettyJson
        ? "pretty-json"
        : (options.format ?? (process.stdout.isTTY ? "text" : "json"));

    if (format === "json")
      process.stdout.write(JSON.stringify(options.report ? report : packages));
    else if (format === "pretty-json")
      process.stdout.write(
        `${JSON.stringify(options.report ? report : packages, null, 2)}\n`,
      );
    else if (!packages.length) process.stdout.write("No packages found.\n");
    else {
      process.stdout.write(`Packages (${packages.length}):\n\n`);
      for (const pkg of packages) {
        process.stdout.write(
          `  ${pkg.name}@${pkg.version}\n    ${pkg.directory}\n`,
        );
      }
    }
  });

await program.parseAsync();
