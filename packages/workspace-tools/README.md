# @moyarich/workspace-tools

CLI utilities for npm workspaces: package discovery, dependency checks, lockfile maintenance, semantic-version resolution, release preparation, publishing, and GitHub issue dependency trees.

## Requirements

Node.js 24+ and npm 11+.

## Install

```sh
npm install --save-dev @moyarich/workspace-tools
```

## Commands

| CLI | Purpose |
| --- | --- |
| `discover-packages` | Discover packages and npm workspaces |
| `workspace-dependency-check` | Check dependency versions and workspace consistency |
| `workspace-package-lock` | Inspect or update a root npm lockfile |
| `workspace-release` | Resolve and prepare package releases |
| `workspace-release-identity` | Determine canonical release identities and versions |
| `sim-version-resolver` | Preview semantic version changes |
| `workspace-publish` | Validate and publish package artifacts |
| `issue-dependency-tree` | Inspect GitHub issue dependencies |

Run any tool with `npm exec` or consult its `--help` output:

```sh
npm exec -- discover-packages --workspaces --json
npm exec -- workspace-release --package packages/example --mode bump --version patch --dry-run
npm exec -- workspace-publish --package packages/example --dry-run
npm exec -- issue-dependency-tree --help
```

Publishing to public npm is the default; GitHub Packages and custom HTTPS registries are supported with explicit configuration.

## Further information

- [Package changelog](./CHANGELOG.md)
- [Documentation](https://github.com/moyarich/workspace-tools/tree/main/docs)
- [Runnable examples](https://github.com/moyarich/workspace-tools/tree/main/examples)
- [Repository and playground](https://github.com/moyarich/workspace-tools)
- [Reusable GitHub workflows](https://github.com/moyarich/reusable-workflows) (maintained and released separately)

Licensed under MIT.
