const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Proxy react-native-maps to a mock on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'react-native-maps') {
        return {
            filePath: path.resolve(__dirname, 'src/mocks/react-native-maps.js'),
            type: 'sourceFile',
        };
    }

    // Chain to the standard resolver
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
