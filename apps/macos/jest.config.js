module.exports = {
  displayName: 'macos',
  preset: 'react-native-macos',
  // react-native-macos@0.81.8's own jest-preset.js sets transformIgnorePatterns to
  // `node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)`, which only
  // whitelists the literal `react-native` package name, not `react-native-macos` itself, and
  // doesn't anticipate pnpm's `node_modules/.pnpm/<pkg>@<version>/node_modules/<pkg>` nesting.
  // As a result the preset's own `jest/setup.js` (and @react-native/js-polyfills, which it
  // imports) are never transformed and fail with "Cannot use import statement outside a
  // module". This overrides the pattern (Jest config keys replace, not merge with, preset
  // keys) to also allow `.pnpm` and the `-macos` suffix through.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native(-macos)?|@react-native(-community)?)/)',
  ],
  moduleNameMapper: {
    '^react-native$': 'react-native-macos',
    '^react-native/(.*)$': 'react-native-macos/$1',
  },
};
