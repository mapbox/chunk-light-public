#!/usr/bin/env node
'use strict';

const yargs = require('yargs');
const path = require('path');
const chalk = require('chalk');
const webpack = require('webpack');
const start = require('../commands/start');
const build = require('../commands/build');
const serveStatic = require('../commands/serve-static');
const writeBabelrc = require('../commands/write-babelrc');
const vendor = require('../commands/vendor');
const logger = require('../lib/chunk-light-logger');
const normalizeConfig = require('../lib/normalize-config');

const configOption = [
  'config',
  {
    description: 'Path to your configuration module',
    alias: 'c',
    type: 'string',
    normalize: true
  }
];

const portOption = [
  'port',
  {
    description: 'Port',
    alias: 'p',
    type: 'number',
    default: 8080
  }
];

const statsOption = [
  'stats',
  {
    description:
      'Directory where Webpack stats should be written, for bundle analysis',
    alias: 's',
    type: 'string',
    normalize: true
  }
];

yargs
  .usage('$0 <command>')
  .command(
    'start [options]',
    'Start a development server.',
    defineStart,
    runStart
  )
  .command('build [options]', 'Build for deployment.', defineBuild, runBuild)
  .command(
    'serve-static [options]',
    'Serve the files you built for deployment.',
    defineServeStatic,
    runServeStatic
  )
  .command(
    'write-babelrc [options]',
    'Write a .babelrc file.',
    defineWriteBabelrc,
    runWriteBabelrc
  )
  .command(
    'vendor [options] <pkg..>',
    'Vendor ES2015+ npm packages so they can be compiled with Babel. They will be bundled with their dependencies but otherwise uncompiled: import them from the output directory, which defaults to `vendor/`.',
    defineVendor,
    runVendor
  )
  .demand(1, 'You must specify a command')
  .example('chunk-light start')
  .example('chunk-light build -c conf/clf.js')
  .example('chunk-light serve-static --port 3000')
  .help().argv;

function defineStart(y) {
  y.version(false)
    .option(...configOption)
    .option(...portOption)
    .option('production', {
      description: 'Build as though for production.',
      alias: 'r',
      type: 'boolean'
    })
    .option(...statsOption)
    .help();
}

function runStart(argv) {
  try {
    start(getConfig('start', argv));
  } catch (error) {
    handleError(error);
  }
}

function defineBuild(y) {
  y.version(false)
    .option(...configOption)
    .option('debug', {
      description: 'Build for debugging, not for production.',
      alias: 'd',
      type: 'boolean'
    })
    .option(...statsOption)
    .help();
}

function runBuild(argv) {
  try {
    build(getConfig('build', argv)).catch(handleError);
  } catch (error) {
    handleError(error);
  }
}

function defineServeStatic(y) {
  y.version(false)
    .option(...configOption)
    .option(...portOption)
    .help();
}

function runServeStatic(argv) {
  try {
    serveStatic(getConfig('serve-static', argv));
  } catch (error) {
    handleError(error);
  }
}

function defineWriteBabelrc(y) {
  y.version(false)
    .option(...configOption)
    .option('env', {
      description: 'Environment .babelrc should target',
      alias: 'e',
      choices: ['node', 'prod', 'dev'],
      default: 'node'
    })
    .option('output', {
      description: 'Directory where .babelrc should be written',
      alias: 'o',
      type: 'string',
      normalize: true,
      default: '.'
    })
    .help();
}

function runWriteBabelrc(argv) {
  try {
    writeBabelrc(getConfig('write-babelrc', argv), argv.output, argv.env);
  } catch (error) {
    handleError(error);
  }
}

function defineVendor(y) {
  y.version(false)
    .positional('pkg', {
      description: 'Packages that should be compiled',
      type: 'array'
    })
    .option('output', {
      description:
        'Destination directory where compiled packages should be written',
      alias: 'o',
      type: 'string',
      normalize: true,
      default: './src/vendor'
    })
    .help();
}

function runVendor(argv) {
  vendor(argv.output, argv.pkg).catch(handleError);
}

function getConfig(command, argv) {
  const configIsNotSpecified = argv.config === undefined;
  let configPath;
  if (configIsNotSpecified) {
    configPath = path.join(process.cwd(), 'chunk-light.config.js');
  } else {
    configPath = path.isAbsolute(argv.config)
      ? argv.config
      : path.join(process.cwd(), argv.config);
  }
  let production = true;
  if (command === 'build') {
    production = !argv.debug;
  } else if (command === 'start') {
    production = argv.production;
  } else if (command === 'write-babelrc' && argv.env === 'prod') {
    production = true;
  }

  // This object is passed as the argument to the config module, if it's a
  // function.
  const configModuleContext = {
    webpack,
    command,
    production,
    argv
  };

  let config = {};
  // If the user didn't use --config, it's fine if the default does not exist.
  // But if they did specify a path, tell them if it doesn't work.
  try {
    const configModule = require(configPath);
    config =
      typeof configModule === 'function'
        ? configModule(configModuleContext)
        : configModule;
  } catch (error) {
    if (!configIsNotSpecified) {
      logger.log(
        `Failed to load configuration module from ${chalk.underline(
          configPath
        )}`
      );
    }
  }

  const configWithArgs = Object.assign({}, config, {
    production,
    stats: argv.stats,
    port: argv.port
  });

  return normalizeConfig(configWithArgs, path.dirname(configPath));
}

function handleError(error) {
  logger.error(error.stack ? error.stack : error);
}
