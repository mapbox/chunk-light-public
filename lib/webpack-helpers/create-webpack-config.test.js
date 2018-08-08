'use strict';

const path = require('path');
const tempy = require('tempy');
const fs = require('fs');

const createConfig = require('./create-webpack-config');
const createUrc = require('../config/create-urc');
const getDefaultConfig = require('../default-underreact.config');

test('Basic Test', () => {
  const defaultConfig = getDefaultConfig({
    mode: 'development',
    configPath: path.join(process.cwd(), 'underreact.config.js')
  });

  const urc = createUrc(
    {
      polyfills: {
        promise: true,
        fetch: true
      },
      siteBasePath: 'fancy',
      publicAssetsPath: 'cacheable-things',
      stylesheets: [path.join(__dirname, './src/bg.css')],
      htmlSource: path.join(__dirname, './src/index.html'),
      babelPlugins: ['/babel-plugin-lodash'],
      webpackLoaders: [
        {
          test: /\.less$/,
          use: ['css-loader', 'less-loader']
        }
      ],
      webpackPlugins: [function foo() {}],
      webpackConfigTransform: config => {
        config.devtool = false;
        return config;
      }
    },
    defaultConfig
  );
  expect(createConfig(urc)).toMatchSnapshot();
});

test('uses babelrc if it exists at project root', () => {
  const tempDir = tempy.directory();
  const defaultConfig = getDefaultConfig({
    mode: 'development',
    configPath: path.join(tempDir, 'underreact.config.js')
  });
  const urc = createUrc({}, defaultConfig);

  fs.writeFileSync(path.join(tempDir, '.babelrc'), `{}`);
  expect(
    createConfig(urc).module.rules.find(
      obj => obj.test.toString() === `/\\.jsx?$/`
    ).use
  ).toMatchObject([
    {
      loader: 'babel-loader',
      options: {
        cacheDirectory: true,
        babelrc: true,
        compact: false
      }
    }
  ]);
});

test('uses babel preset if babelrc doesnt exists at project root', () => {
  const tempDir = tempy.directory();
  const defaultConfig = getDefaultConfig({
    mode: 'development',
    configPath: path.join(tempDir, 'underreact.config.js')
  });
  const urc = createUrc({}, defaultConfig);

  expect(
    createConfig(urc).module.rules.find(
      obj => obj.test.toString() === `/\\.jsx?$/`
    ).use
  ).toMatchObject([
    {
      loader: 'babel-loader',
      options: {
        presets: [require.resolve('../../packages/babel-preset-mapbox')],
        cacheDirectory: true,
        babelrc: false,
        compact: false
      }
    }
  ]);
});

test('config transform works', () => {
  const defaultConfig = getDefaultConfig({
    mode: 'development',
    configPath: path.join(process.cwd(), 'underreact.config.js')
  });
  const urc = createUrc(
    {
      webpackConfigTransform: obj =>
        Object.assign({ injectedObj: 'injectedObj' }, obj)
    },
    defaultConfig
  );
  expect(createConfig(urc)).toMatchObject({
    injectedObj: 'injectedObj'
  });
});
