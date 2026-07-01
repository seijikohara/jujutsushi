import type { Config } from 'jest';

// `jest`'s own `defineConfig` helper is avoided here: its lazy `require('jest-config')`
// resolves through this workspace's hoisted node_modules, which can land on the older
// jest-config@~29.7.0 pulled in transitively by apps/macos's React Native tooling instead
// of this root's jest-config@30.x, making `defineConfig` undefined at runtime. `Config` is
// a type-only import (erased at compile time), so it isn't affected by that resolution path.
const config: Config = {
  projects: ['<rootDir>/packages/core', '<rootDir>/apps/macos'],
};

export default config;
