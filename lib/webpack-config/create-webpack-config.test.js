'use strict';

const path = require('path');
const tempy = require('tempy');
const fs = require('fs');
const browserslist = require('browserslist');

jest.mock('../config/get-user-config');

const getUserConfig = require('../config/get-user-config');
const config = require('../config');
const createWebpackConfig = require('./create-webpack-config');

const getCliOpts = ({
  command = 'build',
  mode = 'development',
  configPath = path.join(process.cwd(), 'underreact.config.js')
} = {}) => ({
  command,
  mode,
  configPath
});

test('Basic Test', () => {
  getUserConfig.mockResolvedValueOnce({
    siteBasePath: 'fancy',
    publicAssetsPath: 'cacheable-things',
    htmlSource: `<html></html>`,
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
  });

  const urcPromise = config(getCliOpts());

  return expect(
    urcPromise.then(urc => createWebpackConfig(urc))
  ).resolves.toMatchSnapshot();
});

test('Adds mapbox-gl to exclude if user is on 2.0.0 or above', () => {
  getUserConfig.mockResolvedValueOnce({});
  const tempDir = tempy.directory();
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    `{
      "name": "fake",
      "version": "0.0.0",
      "dependencies": {
        "mapbox-gl": "^2.0.0"
      }
    }`
  );

  fs.writeFileSync(
    path.join(tempDir, 'babel.config.js'),
    `module.exports = {}`
  );

  const urcPromise = config(
    getCliOpts({
      configPath: path.join(tempDir, 'underreact.config.js')
    })
  );

  return urcPromise.then(urc => {
    const config = createWebpackConfig(urc);
    expect(config.module.rules[0].oneOf[1].include).toEqual(
      /\/node_modules\/((?!mapbox-gl\/))/
    );
  });
});

test('Does not add mapbox-gl to exclude if user is on a version below 2.0.0', () => {
  getUserConfig.mockResolvedValueOnce({});
  const tempDir = tempy.directory();
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    `{
      "name": "fake",
      "version": "0.0.0",
      "dependencies": {
        "mapbox-gl": "~1.9.0"
      }
    }`
  );

  fs.writeFileSync(
    path.join(tempDir, 'babel.config.js'),
    `module.exports = {}`
  );

  const urcPromise = config(
    getCliOpts({
      configPath: path.join(tempDir, 'underreact.config.js')
    })
  );

  return urcPromise.then(urc => {
    const config = createWebpackConfig(urc);
    expect(config.module.rules[0].oneOf[1].include).toBeUndefined();
  });
});

test('Uses babel.config.js if it exists at project root', () => {
  getUserConfig.mockResolvedValueOnce({});
  const tempDir = tempy.directory();
  const urcPromise = config(
    getCliOpts({
      configPath: path.join(tempDir, 'underreact.config.js')
    })
  );

  fs.writeFileSync(
    path.join(tempDir, 'babel.config.js'),
    `module.exports = {}`
  );

  return urcPromise.then(urc => {
    expect(
      createWebpackConfig(urc).module.rules[0].oneOf.find(
        obj => obj.test.toString() === `/\\.jsx?$/`
      ).options.configFile
    ).toBe(path.join(tempDir, 'babel.config.js'));
  });
});

test('Uses babel preset if babel.config.js doesnt exists at project root', () => {
  getUserConfig.mockResolvedValueOnce({});
  const tempDir = tempy.directory();
  const urcPromise = config(
    getCliOpts({
      configPath: path.join(tempDir, 'underreact.config.js')
    })
  );
  return urcPromise.then(urc => {
    expect(
      createWebpackConfig(urc).module.rules[0].oneOf.find(
        obj => obj.test.toString() === `/\\.jsx?$/`
      ).options.presets[0]
    ).toBe(require('@mapbox/babel-preset-mapbox'));
  });
});

test('babel-loader creates a good cacheIdentifier which includes urc.browserslist', () => {
  const query = 'chrome 67';
  getUserConfig.mockResolvedValueOnce({ browserslist: [query] });

  const urcPromise = config(
    getCliOpts({
      configPath: '/fake/underreact.config.js'
    })
  );

  return urcPromise.then(urc => {
    const cacheIdentifier = JSON.parse(
      createWebpackConfig(urc).module.rules[0].oneOf.find(
        obj => obj.test.toString() === `/\\.jsx?$/`
      ).options.cacheIdentifier
    );

    expect(cacheIdentifier).toMatchObject({
      'babel-loader': expect.any(String),
      '@babel/core': expect.any(String),
      babelConfig: expect.any(String),
      env: 'test',
      browserslist: browserslist(query)
    });
  });
});

test('config transform works', () => {
  getUserConfig.mockResolvedValueOnce({
    webpackConfigTransform: obj =>
      Object.assign({ injectedObj: 'injectedObj' }, obj)
  });

  const urcPromise = config(
    getCliOpts({
      configPath: path.join(process.cwd(), 'underreact.config.js')
    })
  );
  return urcPromise.then(urc => {
    expect(createWebpackConfig(urc)).toMatchObject({
      injectedObj: 'injectedObj'
    });
  });
});

test("Doesn't set polyfill entry when urc.polyfill is false", () => {
  getUserConfig.mockResolvedValueOnce({
    polyfill: false
  });

  const urcPromise = config(
    getCliOpts({
      configPath: path.join(process.cwd(), 'underreact.config.js')
    })
  );
  return urcPromise.then(urc => {
    expect(createWebpackConfig(urc).entry.polyfill).toBe(undefined);
  });
});
