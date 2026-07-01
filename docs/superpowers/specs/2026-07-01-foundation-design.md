# Foundation Sub-Project — Design

## Status

Proposed

## Context

Jujutsushi is a desktop GUI for [Jujutsu (`jj`)](https://github.com/jj-vcs/jj), a Git-compatible version control system. The overall project goal spans several independent subsystems: project scaffolding, `jj` read operations, `jj` write operations, Git interoperability, an operation log/undo view, AI-assisted features, an application icon, and documentation. This scope is too large for a single spec, so the work is decomposed into sub-projects, each carried through its own design → plan → implementation cycle:

- **A. Foundation** (this document) — scaffolding, tooling, and a minimal native shell.
- **B. jj read integration** — log graph, status, diff, show views.
- **C. jj write operations** — full command coverage (`new`, `edit`, `describe`, `abandon`, `squash`, `split`, `rebase`, `restore`, bookmarks, ...).
- **D. Git interoperability** — remotes, push/fetch, colocated repos, conflict display.
- **E. Operation log & undo.**
- **F. AI-assisted features** — scope to be defined in its own brainstorming pass.
- **G. Application icon.**
- **H. Documentation** — folded into the definition of done for every sub-project rather than a standalone phase.

Foundation has no dependencies and every other sub-project depends on it, so it is built first.

## Goals

- Stand up a buildable, runnable native macOS app shell.
- Prove the `jj` integration pattern end-to-end with a minimal `JjClient`.
- Establish tooling (package manager, lint, format, git hooks, tests, CI) that later sub-projects build on without revisiting these choices.
- Populate `CLAUDE.md`, `AGENTS.md`, and `.claude/` with project-specific guidance.

## Non-Goals

- Real UI/UX design (sidebar, log graph rendering, theming system) — deferred to sub-project B.
- Full `jj` command coverage — Foundation implements only `getVersion()` and `getStatus()` to validate the integration pattern.
- Windows or Linux support — deferred; revisit platform expansion after Foundation ships on macOS.
- The final application icon — Foundation ships a placeholder; sub-project G owns the real design.
- AI features of any kind.

## Decisions

### Platform target

macOS only, using [react-native-macos](https://github.com/microsoft/react-native-macos) (Microsoft-maintained, AppKit-based). Windows (`react-native-windows`) and Linux (no official out-of-tree React Native platform exists) are out of scope until a later sub-project revisits platform expansion.

Minimum supported OS: the latest two macOS major versions at any given time. As of this writing, that is macOS 26 (Tahoe) and macOS 15 (Sequoia).

### jj integration architecture

`jj` exposes a template language with a built-in `json(value) -> String` function (stable since `jj` 0.31, July 2025) designed for exactly this purpose: machine-readable output for external tooling. The `core` package talks to `jj` exclusively through a `JjClient` interface, implemented by spawning `jj` as a subprocess with a `-T`/`--template` argument that emits one JSON object per line (NDJSON).

Two alternatives were considered and rejected:

- **Embedding `jj-lib` via a Rust native addon (napi-rs).** `jj-lib` is an internal implementation detail of the `jj` CLI, not a published, version-stable API for external consumers. Tracking its breaking changes against `jj`'s monthly release cadence would be an ongoing cost, on top of adding a Rust toolchain, cross-compilation, and native-module signing to the build before a single screen exists.
- **Reading `.jj` repository data directly.** Would require reimplementing `jj`'s data model (change IDs, operation log) outside of `jj` itself. Not viable.

`JjClient` is the only seam UI code is allowed to depend on, so the subprocess implementation can be replaced later without touching consumers.

Minimum `jj` version: pinned to 0.42 (latest stable as of this writing). The app checks `jj --version` at startup and surfaces a typed error if the installed binary is older or missing.

### Repository layout

pnpm workspaces:

```
jujutsushi/
├── apps/macos/            # react-native-macos app shell
├── packages/core/          # platform-agnostic JjClient, types, business logic
├── docs/superpowers/specs/
├── .claude/
├── CLAUDE.md
├── AGENTS.md
├── pnpm-workspace.yaml
└── (tsconfig base, oxlint/oxfmt config, lefthook.yml, ...)
```

Packages for future sub-projects (e.g. `packages/ui`) are created when those sub-projects start, not speculatively now.

### Tooling

- **Package manager:** pnpm, with workspaces splitting `apps/macos` and `packages/core`.
- **Language:** TypeScript, strict mode, across both packages.
- **Lint/format:** [oxlint](https://oxc.rs/) + [oxfmt](https://oxc.rs/), the Rust-based tools from the Oxc project. As of mid-2026, oxlint (v1.7x) ships built-in `react` rules and reaches React Native through its JS-plugin system (`oxlint-plugin-react-native`); oxfmt (v0.55, pre-1.0) is functional but younger than oxlint. If oxfmt has gaps on specific files during implementation, fall back to Prettier for those files rather than blocking on it.
- **Git hooks:** [Lefthook](https://github.com/evilmartians/lefthook), replacing the Husky + lint-staged combination. Single Go binary, no Node dependency for the hook runner itself, native staged-file filtering, and a `root`-scoped config that matches the pnpm workspace layout.
- **Tests:** Jest (React Native's standard runner).
- **CI:** GitHub Actions — lint, typecheck, test, and a macOS build job.

### Native shell scope ("proof of life")

The Foundation app is intentionally minimal:

- A native macOS window (via react-native-macos) with standard window chrome, resizing, and automatic light/dark appearance following the system.
- A single screen that calls `JjClient.getStatus()` against a real `jj` repository and renders the raw result as text. No real UI/UX — this exists only to prove the integration end-to-end.
- A placeholder app icon, sufficient to produce a buildable, launchable `.app` bundle. The real icon is sub-project G.

Note for sub-project B: macOS 26 (Tahoe) introduced the "Liquid Glass" translucent design language system-wide. Real UI design should account for this as the current native macOS visual baseline.

### Self-hosting: colocate this repository with jj

This repository becomes the real `jj` repository the "proof of life" screen queries, via `jj git init --colocate`. This is additive: in colocated mode `jj` uses the existing `.git` history as its backend, so existing git history, branches, and remotes are unaffected, and the repository remains a fully functional plain-git repository for anyone not using `jj`.

`jj` refuses to colocate inside a linked Git worktree ("Cannot create a colocated jj repo inside a Git worktree"), confirmed by direct testing during implementation planning. Colocation therefore runs once against the main checkout, not against any feature worktree. This was done directly against `main` during planning (2026-07-01): no commit was created (colocation only adds local `.jj/` metadata and a `.git/info/exclude` entry), so it carries none of the risk multi-commit feature work would.

### Testing strategy

- `packages/core`: integration tests run against a real, temporary `jj` repository created with `jj git init` per test (not mocked subprocess output), so tests track actual `jj` behavior rather than an assumption about it.
- `apps/macos`: CI verifies the build succeeds. Manual verification of actual app behavior happens separately, outside of automated tests.

### Error handling

`JjClient` returns typed results/errors rather than raw subprocess failures, covering at least: the `jj` binary not found on `PATH`, an installed `jj` version older than the pinned minimum, and the configured path not being a `jj` repository.

## Definition of Done

1. `pnpm install` succeeds from a clean clone.
2. The app launches as a native macOS window that follows system light/dark appearance.
3. `JjClient.getStatus()` calls the real `jj` binary and returns a typed result, covered by an integration test against a real temporary repository.
4. Lint, typecheck, test, and macOS build all pass locally and in GitHub Actions CI.
5. `CLAUDE.md`, `AGENTS.md`, and `.claude/` contain project-specific guidance (architecture summary, dev commands, conventions, `jj` integration notes), not just inherited defaults.
6. This design document is committed.

## Risks

- `jj`'s release cadence is roughly monthly; templates and the pinned minimum version will need periodic revisiting.
- `oxfmt` is pre-1.0; treat formatting edge cases as expected during implementation, not blocking.
- `react-native-macos`'s New Architecture support is still experimental (since 0.71); pin a specific compatible version pairing with React Native core during implementation planning rather than assuming the latest of each is mutually compatible.

## Sources

- https://docs.jj-vcs.dev/latest/templates/
- https://docs.jj-vcs.dev/latest/changelog/
- https://github.com/microsoft/react-native-macos
- https://github.com/microsoft/react-native-windows
- https://oxc.rs/
- https://oxc.rs/docs/guide/usage/linter/plugins.html
- https://github.com/evilmartians/lefthook
