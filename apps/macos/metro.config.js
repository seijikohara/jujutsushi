const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * `watchFolders`/`resolver.nodeModulesPaths` are needed because Metro's default hierarchical
 * node_modules lookup doesn't always resolve this app's own top-level dependencies (e.g.
 * @babel/runtime) under pnpm's `node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>` symlink
 * layout — this app's own node_modules and the workspace root's are added as an explicit
 * fallback. Hierarchical lookup itself is intentionally left enabled (Metro's default): it's
 * still what resolves packages that are scoped dependencies of other, deeper packages within
 * the pnpm store (e.g. `invariant`, a dependency of react-native-macos, not of this app).
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
