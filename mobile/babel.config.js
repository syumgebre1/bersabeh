module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated plugin would go here if we used it.
      // Expo Router does not strictly require reanimated.
    ],
  };
};
