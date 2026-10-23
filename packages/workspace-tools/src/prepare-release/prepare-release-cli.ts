import { Command, Option } from "commander";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareRelease } from "./prepare-release.ts";
const command = new Command("workspace-prepare-release")
  .requiredOption(
    "--package <selector>",
    "Publishable workspace name/directory or all",
  )
  .addOption(
    new Option("--version-mode <mode>")
      .choices(["auto", "bump", "package-json", "exact"])
      .default("auto"),
  )
  .addOption(
    new Option("--version-bump <bump>")
      .choices([
        "patch",
        "minor",
        "major",
        "prepatch",
        "preminor",
        "premajor",
        "prerelease",
      ])
      .default("patch"),
  )
  .option("--initial-version <version>", "Initial release version", "0.1.0")
  .option("--exact-version <version>", "Exact release version", "")
  .option("--write", "Write manifests and package-lock.json; otherwise preview")
  .option("--manifest <path>", "Write release manifest JSON");
command.parse();
const values = command.opts();
const result = prepareRelease(
  process.cwd(),
  values.package,
  {
    mode: values.versionMode,
    bump: values.versionBump,
    initialVersion: values.initialVersion,
    exactVersion: values.exactVersion,
  },
  values.write === true,
);
if (values.manifest)
  writeFileSync(
    resolve(values.manifest),
    JSON.stringify(result, null, 2) + "\n",
  );
console.log(JSON.stringify(result, null, 2));
