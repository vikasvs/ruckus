const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The local Watchman watcher repeatedly times out and serves stale screens.
// Metro's node watcher keeps simulator reloads in sync with source changes.
config.resolver.useWatchman = false;

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Zustand's ESM bundle contains `import.meta`, but Expo web currently emits a
  // classic script tag. Resolve the package root to its CommonJS entry so the
  // same stores work on web without changing native resolution.
  if (platform === 'web' && moduleName === 'zustand') {
    return {
      filePath: require.resolve('zustand'),
      type: 'sourceFile',
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
