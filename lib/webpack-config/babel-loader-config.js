'use strict';

const fs = require('fs');
const path = require('path');
const browserslist = require('browserslist');
const chalk = require('chalk');

const logger = require('../logger');

module.exports = {
  getConfigForApp,
  getConfigForNodeModules
};

function getConfigForApp(urc) {
  if (fs.existsSync(path.join(urc.rootDirectory, '.babelrc'))) {
    throw new Error(
      "Underreact doesn't support '.babelrc', please remove it or use 'babel.config.js'."
    );
  }

  const babelConfigPath = path.join(urc.rootDirectory, 'babel.config.js');
  const exists = fs.existsSync(babelConfigPath);

  const options = {
    presets: [require('../../packages/babel-preset-mapbox')],
    // `.babelrc` and `babel.config` ecosystem is still stabilizing.
    // For now, we are disabling `.babelrc` files. The important difference
    // to remember is that `.babelrc` does not compile `node_modules`.
    babelrc: false,
    configFile: exists ? babelConfigPath : false,
    compact: urc.isProductionMode,
    cacheDirectory: true,
    cacheCompression: false,
    // `babel-preset-mapbox` depends on the browserslist and
    // any change in its value would fail to change the default `cacheIdentifier` of `babel-loader`
    // hence leading to stale babel output. To mitigate this we need to create a more accurate `cacheIdentifier`
    // which is (`defaultCacheIdentifier` + `urc.browserslist`) ref: https://github.com/babel/babel-loader/blob/7.x/src/index.js#L129
    cacheIdentifier: createCacheIdentifier({
      urc,
      babelConfig: exists ? fs.readFileSync(babelConfigPath, 'utf8') : ''
    })
  };

  if (exists) {
    delete options.presets;
    const message = `Using an external Babel config ${chalk.bold(
      path.relative(urc.rootDirectory, babelConfigPath)
    )}`;
    logger.log(message);
  }

  return {
    test: /\.jsx?$/,
    exclude: [/[/\\\\]node_modules[/\\\\]/],
    loader: require.resolve('babel-loader'),
    options
  };
}

function getConfigForNodeModules(urc) {
  const override = ({ name, options }) => {
    if (name === '@babel/preset-react') {
      return null;
    }
    if (name === '@babel/plugin-proposal-class-properties') {
      return null;
    }
    if (name === '@babel/plugin-proposal-object-rest-spread') {
      return null;
    }
    if (name === 'babel-plugin-transform-react-remove-prop-types') {
      return null;
    }
    return options;
  };

  const loaderConfig = {
    test: /\.js$/,
    // We want to avoid sending babel/runtime back to babel.
    exclude: /@babel(?:\/|\\{1,2})runtime/,
    loader: require.resolve('babel-loader'),
    options: {
      presets: [
        [
          require('../../packages/babel-preset-mapbox'),
          {
            // The override option allows for customizing each
            // individual preset/plugin with the help of callback
            // ref: https://github.com/mapbox/underreact/tree/next/packages/babel-preset-mapbox#advanced-configuration
            override
          }
        ]
      ],
      // Ref: https://babeljs.io/docs/en/options#sourcetype
      // By default Babel considers everything as an `EcmaScript Module`, which is not
      // the case for most of the `node_modules`. This changes the behavior of
      // Babel to assume CommonJS unless an `import` or `export` is present in the file.
      sourceType: 'unambiguous',
      babelrc: false,
      configFile: false,
      compact: false,
      cacheDirectory: true,
      cacheCompression: false,
      sourceMaps: false,
      cacheIdentifier: createCacheIdentifier({ urc })
    }
  };
  // By default we compile all of the `node_modules`, but the user can also pass a
  // selective list of node_modules to compile.
  if (Array.isArray(urc.compileNodeModules)) {
    loaderConfig.include = new RegExp(
      urc.compileNodeModules.map(m => `${m}(?!/node_modules).*`).join('|')
    );
  }
  return loaderConfig;
}

// `babel-preset-mapbox` depends on the `browserslist` and
// any change in its value would fail to change the default `cacheIdentifier` of `babel-loader`
// hence leading to stale babel output. To mitigate this we need to create a more accurate `cacheIdentifier`
// which is (`defaultCacheIdentifier` + `urc.browserslist`)
// ref: https://github.com/babel/babel-loader/blob/7.x/src/index.js#L129
function createCacheIdentifier({ urc, babelConfig = '' }) {
  return JSON.stringify({
    'babel-loader': require('babel-loader/package.json').version,
    '@babel/core': require('@babel/core/package.json').version,
    'babel-preset-mapbox': require('../../packages/babel-preset-mapbox')
      .version,
    babelConfig,
    env: process.env.BABEL_ENV || process.env.NODE_ENV || 'development',
    // Use `browserslist` module to do finding of the config and parse it.
    // Note, this would also work when a user uses `urc.browserslist`
    // since we would set it as env var `BROWSERSLIST` and `browserslist`
    // module will then read it.
    browserslist: browserslist(null, {
      path: urc.rootDirectory,
      env: process.env.NODE_ENV === 'production' ? 'production' : 'development'
    })
  });
}
