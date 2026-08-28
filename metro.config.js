const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Works around a known Metro + react-native-svg web-bundling issue where
// Metro's package "exports" resolution fails to find the package's own
// .web.js internals (e.g. parseTransform) even though the files exist.
// Native builds are unaffected since they don't use this code path.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
