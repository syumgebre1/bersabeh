// Metro bundler config for Expo + web.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .svg as assets.
config.resolver.assetExts.push('svg');

// Exclude node_modules and .expo from the file watcher.
// Metro doesn't need to watch these directories — they change rarely.
// This dramatically reduces FSEvents usage on macOS and prevents EMFILE.
config.watcher = {
  ...(config.watcher ?? {}),
  additionalExts: ['cjs', 'mjs'],
  // The "watchman" setting here tells Metro to prefer Watchman if present.
  healthCheck: {
    enabled: true,
    interval: 30000,
    timeout: 10000,
  },
};

// Explicitly exclude noisy directories from the watcher.
config.watchFolders = [__dirname];

// Reduces Metro's memory + file handle footprint.
config.maxWorkers = 2;

module.exports = config;
