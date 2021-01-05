'use strict';

const fs = require('fs');
const path = require('path');
const browserslist = require('browserslist');
const chalk = require('chalk');
const semver = require('semver');

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
    presets: [require('@mapbox/babel-preset-mapbox')],
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
    exclude: /@babel(?:\/|\\{1,2})runtime/,
    loader: require.resolve('babel-loader'),
    options: {
      presets: [
        [
          require('@mapbox/babel-preset-mapbox'),
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
  const selectiveCompile = Array.isArray(urc.compileNodeModules);
  if (selectiveCompile) {
    loaderConfig.include = new RegExp(
      urc.compileNodeModules.map(m => `${m}(?!/node_modules).*`).join('|')
    );
  }

  // If the app uses mapbox-gl 2.0+, do not transpile. mapbox-gl 2.0+ is
  // incompatible with babel without additional configuration beacuse it uses
  // an inlined webworker.
  let excludeList = urc.excludeCompileNodeModules || [];
  if (usesMapboxGl2({ urc }) && !selectiveCompile) {
    excludeList = excludeList.concat('mapbox-gl');
  }

  // If excludeList is provided, compile all node modules except the provided
  // list of modules.
  if (excludeList.length) {
    if (selectiveCompile) {
      throw new Error(
        "Cannot use 'excludeCompileNodeModules' if 'compileNodeModules' is an array. If you want to exclude a list of modules and include the rest, set 'compileNodeModules: true'."
      );
    }
    loaderConfig.include = new RegExp(
      `/node_modules/(${excludeList.map(m => `(?!${m}/)`)})`
    );
  }
  return loaderConfig;
}

function usesMapboxGl2({ urc }) {
  let usesMapboxGl2 = false;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(urc.rootDirectory, 'package.json'), 'utf8')
    );
    const glJsVer = pkg.dependencies['mapbox-gl'];
    usesMapboxGl2 = semver.gte(semver.coerce(glJsVer), '2.0.0');
  } catch (e) {} // eslint-disable-line

  return usesMapboxGl2;
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
    'babel-preset-mapbox': require('@mapbox/babel-preset-mapbox').version,
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
