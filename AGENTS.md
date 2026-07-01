# Jujutsushi

Jujutsushi is a native desktop GUI for [Jujutsu (`jj`)](https://github.com/jj-vcs/jj), a Git-compatible version control system.

## Scope of this repository

The project is built as a sequence of independent sub-projects, each with a design spec under `docs/superpowers/specs/` and an implementation plan under `docs/superpowers/plans/`. Read the most recent spec before making architectural changes — specs record the reasoning behind decisions (what was chosen, what was rejected, and why).

Current sub-project: **Foundation** — repository scaffolding, toolchain, and a minimal native macOS shell. See `docs/superpowers/specs/2026-07-01-foundation-design.md` and `docs/superpowers/plans/2026-07-01-foundation.md`.

## Workspace layout

- `apps/macos` — the react-native-macos application shell.
- `packages/core` — platform-agnostic TypeScript: the `jj` integration layer (`JjClient`) and business logic. No React Native dependency, and no `node:*` imports in its public exports (`src/index.ts`) — only in `src/testing/`, used exclusively by this package's own Jest tests. `apps/macos` depends on this package via the pnpm workspace protocol, importing its built `dist/` output, not raw source.

## jj integration

All communication with `jj` goes through `packages/core`'s `JjClient`, which depends only on a `ProcessRunner` interface — never directly on how a subprocess actually gets spawned. There are two implementations: `NodeProcessRunner` (Jest tests, via `node:child_process`) and `apps/macos`'s `NativeProcessRunner` (the real app, via a small Swift native module wrapping `Process`/`NSTask` — React Native's JS runtime has no subprocess API of its own, and there's no existing widely-used community package for this). UI code must never spawn `jj` directly.

`jj` supports a `-T`/`--template` option with a `json(value)` template function on most read commands (`log`, `diff`, `show`, ...) for structured, machine-readable output — this is the supported integration point, not `jj`'s default human-readable formatting. Notably, `jj status` itself does NOT accept `-T`; `JjClient` gets working-copy status via `jj log -T 'json(self)' --no-graph -r '@'` instead.

Minimum supported `jj` version: 0.42. `MINIMUM_SUPPORTED_JJ_VERSION` in `packages/core` encodes this; check it against `JjClient.getVersion()` before trusting other calls.

The native bridge (`apps/macos/macos/Jujutsushi-macOS/NativeModules/JjProcessExecutor/`) explicitly disables App Sandbox (`apps/macos/macos/Jujutsushi-macOS/Jujutsushi.entitlements`) — a sandboxed app cannot spawn an arbitrary, independently-installed binary like `jj` operating outside the app's own container. Don't re-enable sandboxing without solving that first.

## Commands

- `pnpm install` — install dependencies.
- `pnpm --filter @jujutsushi/core run build` — build `packages/core`'s `dist/` output. **Required after every change to `packages/core`** before `apps/macos` will see it — there is no automatic build-on-install or file-watch wiring yet.
- `pnpm lint` / `pnpm format` / `pnpm format:check` — oxlint / oxfmt across the whole workspace (nested per-package configs apply automatically).
- `pnpm typecheck` — TypeScript, per package.
- `pnpm --filter @jujutsushi/core run test` — Jest integration tests for `packages/core`, run against a real, temporary `jj` repository. (Note: `pnpm test` at the root attempts to run `apps/macos` tests as well but fails due to Jest version conflicts with React Native's dependencies; use per-filter command above for reliable local testing.)
- `cd apps/macos && npx react-native run-macos` — build and launch the app.

## Conventions

- TypeScript strict mode everywhere.
- Tests in `packages/core` run against a real, temporary `jj` repository (created with `jj git init` in a test's setup) rather than mocked subprocess output — `jj`'s actual behavior is the source of truth.
- `apps/macos` has no automated tests beyond a build check in CI — native-module-touching code is verified by building and running the app, per each plan task's own verification steps.
- This repository is itself colocated with `jj` (`jj git init --colocate` was run against the main checkout on 2026-07-01 — `jj` refuses to colocate inside a linked Git worktree, so this always needs to target the main checkout). It's both a working Git repo and a `jj` repo, and doubles as the sample repository the app's proof-of-life screen queries.
- Commit messages follow Conventional Commits. No Claude/AI attribution in commits, PRs, or issues.
