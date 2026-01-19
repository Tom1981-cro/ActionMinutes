module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@/screens': './src/screens',
            '@/components': './src/components',
            '@/services': './src/services',
            '@/hooks': './src/hooks',
            '@/navigation': './src/navigation',
            '@/store': './src/store',
            '@/utils': './src/utils',
          },
        },
      ],
    ],
  };
};
