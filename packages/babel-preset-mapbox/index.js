'use strict';
const isPlainObj = require('is-plain-obj');

const MINIMUM_BABEL_VERSION = 7;

module.exports = function(api, opts) {
  api.assertVersion(MINIMUM_BABEL_VERSION);

  const { plugins, presets } = preset.call(this, api, opts);

  // this is done in order to easily snapshot this module
  const requireModule = entity => {
    const esmInterop = obj =>
      obj.hasOwnProperty('default') ? obj.default : obj;

    if (Array.isArray(entity)) {
      return [esmInterop(require(entity[0])), entity[1]];
    }
    return esmInterop(require(entity));
  };

  return {
    plugins: plugins.map(requireModule),
    presets: presets.map(requireModule)
  };
};

module.exports.babelPresetMapbox = preset;

function preset(api, opts) {
  opts = opts || {};

  if (opts.override && typeof opts.override !== 'function') {
    throw new Error(
      '`@mapbox/babel-preset-mapbox` expects `override` option to be a function.'
    );
  }

  const env = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';

  const isEnvDevelopment = env === 'development';
  const isEnvProduction = env === 'production';
  const isEnvTest = env === 'test';

  if (!isEnvDevelopment && !isEnvProduction && !isEnvTest) {
    throw new Error(
      'Using `@mapbox/babel-preset-mapbox` requires that you specify `NODE_ENV` or ' +
        '`BABEL_ENV` environment variables. Valid values are "development", ' +
        '"test", and "production". Instead, received: ' +
        JSON.stringify(env) +
        '.'
    );
  }

  if (!isPlainObj(opts)) {
    throw new Error(
      '`@mapbox/babel-preset-mapbox` expects an object as an option.'
    );
  }

  // prevent ambiguity if user is using both
  if (process.env.BROWSERSLIST && opts['@babel/preset-env']) {
    throw new Error(
      'Please do not use process.env.BROWSERSLIST and `babel-preset-env` together.'
    );
  }

  opts = Object.assign({}, opts);

  const presets = [
    {
      name: '@babel/preset-react',
      options: {
        // Adds component stack to warning messages
        // Adds __self attribute to JSX which React will use for some warnings
        development: isEnvDevelopment || isEnvTest,
        // Will use the native Object.assign instead of trying to polyfill
        // it.
        useBuiltIns: true
      }
    },
    isEnvTest && {
      name: '@babel/preset-env',
      options: {
        targets: {
          node: 'current'
        }
      }
    },
    (isEnvProduction || isEnvDevelopment) && {
      name: '@babel/preset-env',
      options: {
        // `entry` transforms `@babel/polyfill` into individual requires for
        // the targeted browsers. This is safer than `usage` which performs
        // static code analysis to determine what's required.
        // This is probably a fine default to help trim down bundles when
        // end-users inevitably import '@babel/polyfill'.
        useBuiltIns: 'entry',
        corejs: 2,
        // Do not transform modules to CJS
        modules: false,
        // mapboxgl doesn't work without this.
        exclude: ['transform-typeof-symbol']
      }
    }
  ]
    .map(entity =>
      toBabelFormat({
        entity,
        opts,
        isEnvDevelopment,
        isEnvProduction,
        isEnvTest
      })
    )
    .filter(Boolean);

  const plugins = [
    {
      // Enable loose mode to use assignment instead of defineProperty
      // See discussion in https://github.com/facebook/create-react-app/issues/4263
      name: '@babel/plugin-proposal-class-properties',
      options: {
        loose: true
      }
    },
    {
      // Note that this assumes `Object.assign` is available.
      name: '@babel/plugin-proposal-object-rest-spread',
      options: { useBuiltIns: true }
    },
    {
      // Polyfills the runtime needed for async/await and generators
      name: '@babel/plugin-transform-runtime',
      options: {
        // By default babel will add helpers to every file,
        // this is redundant, this option keeps them at one location.
        // https://babeljs.io/docs/en/babel-plugin-transform-runtime#helpers
        helpers: true,
        // Support for async/await/yield
        regenerator: true,
        // Webpack fully supports ESM, hence it allows for smaller
        // build size. We are disabling this for testing since Node's
        // ESM support is 🐥.
        useESModules: isEnvDevelopment || isEnvProduction
      }
    },
    {
      name: '@babel/plugin-syntax-dynamic-import'
    },
    isEnvTest && {
      name: 'babel-plugin-transform-dynamic-import'
    },
    isEnvProduction && {
      name: 'babel-plugin-transform-react-remove-prop-types',
      options: {
        removeImport: true
      }
    }
  ]
    .map(entity =>
      toBabelFormat({
        entity,
        opts,
        isEnvDevelopment,
        isEnvProduction,
        isEnvTest
      })
    )
    .filter(Boolean);

  if (opts.debug) {
    console.log(JSON.stringify({ plugins, presets }, null, 2));
  }

  return {
    plugins,
    presets
  };
}

function toBabelFormat({
  entity,
  opts,
  isEnvDevelopment,
  isEnvProduction,
  isEnvTest
}) {
  if (!entity) {
    return;
  }
  const userOptions = opts[entity.name] || {};
  const entityOptions = entity.options;

  // apply user options
  let options = Object.assign({}, entityOptions, userOptions);

  // apply user provided override
  if (opts.override) {
    options = opts.override({
      name: entity.name,
      options,
      isEnvDevelopment,
      isEnvProduction,
      isEnvTest
    });
    // user wanted to disable it
    if (!options) {
      return;
    }
  }

  if (Object.keys(options).length === 0) {
    return entity.name;
  }
  return [entity.name, options];
}
