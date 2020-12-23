# @mapbox/underreact

Minimal, extensible React app build system that you won't need to eject.

It's a pretty thin wrapper around Babel, Webpack, and PostCSS, and will never accumulate an ecosystem of its own. And it aims to be just as useful for production applications with idiosyncratic demands as for simple prototypes.

## Table of contents

- [Installation](#installation)
  - [Getting started](#getting-started)
- [Usage](#usage)
  - [Underreact configuration file](#underreact-configuration-file)
  - [Defining your HTML](#defining-your-html)
- [Modes](#modes)
  - [Development mode](#development-mode)
  - [Production mode](#production-mode)
- [Babel](#babel)
  - [Exposing babel.config.js](#exposing-babelconfigjs)
- [Browser support and polyfills](#browser-support-and-polyfills)
  - [Transpiling JavaScript syntax and vendor-prefixing CSS](#transpiling-javascript-syntax-and-vendor-prefixing-css)
  - [Polyfilling newer JavaScript features](#polyfilling-newer-javascript-features)
  - [Using @babel/polyfill](#using-babelpolyfill)
- [Deployment environments](#deployment-environments)
  - [Using environment variables](#using-environment-variables)
  - [DEPLOY_ENV and NODE_ENV](#deploy_env-and-node_env)
  - [Why set DEPLOY_ENV instead of NODE_ENV?](#why-set-deploy_env-instead-of-node_env)
- [Configuration object properties](#configuration-object-properties)
  - [browserslist](#browserslist)
  - [compileNodeModules](#compilenodemodules)
  - [devServerHistoryFallback](#devserverhistoryfallback)
  - [environmentVariables](#environmentvariables)
  - [hot](#hot)
  - [htmlSource](#htmlsource)
  - [jsEntry](#jsentry)
  - [liveReload](#livereload)
  - [outputDirectory](#outputdirectory)
  - [polyfill](#polyfill)
  - [port](#port)
  - [postcssPlugins](#postcssplugins)
  - [publicAssetsPath](#publicassetspath)
  - [publicDirectory](#publicdirectory)
  - [siteBasePath](#sitebasepath)
  - [stats](#stats)
  - [vendorModules](#vendormodules)
  - [webpackConfigTransform](#webpackconfigtransform)
  - [webpackLoaders](#webpackloaders)
  - [webpackPlugins](#webpackplugins)
- [FAQs](#faqs)
  - [How do I make Jest use Underreact's Babel configuration ?](#how-do-i-make-jest-use-underreacts-babel-configuration-)
  - [How do I dynamically import JavaScript modules or React components?](#how-do-i-dynamically-import-javascript-modules-or-react-components)
  - [How do I reduce my build size?](#how-do-i-reduce-my-build-size)
  - [How do I include SVGs, images, and videos?](#how-do-i-include-svgs-images-and-videos)
  - [How do I enable hot module reloading ?](#how-do-i-enable-hot-module-reloading-)

## Installation

Requirements:

- Node 6+.

Install Underreact as a devDependency of your project:

```bash
npm install --save-dev @mapbox/underreact
```

If you are building a React application, you also need to install React dependencies:

```bash
npm install react react-dom
```

Add `_underreact*` to your `.gitignore`, and maybe other ignore files (e.g. `.eslintignore`). That way you'll ignore files that Underreact generates. (If you set the [`outputDirectory`](#outputdirectory) option, you'll want to ignore your custom output directory.)

### Getting started

#### The bare minimum to get started

- Create your entry JS file at `src/index.js`.

```js
// src/index.js
console.log('hello world!');
```

- Run the development server with `underreact`.

```bash
npx underreact start
# or
node node_modules/.bin/underreact start
```

- Open the URL printed in your terminal.

#### Getting started with React

- Create your entry JS file at `src/index.js`.

```jsx
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';

class App extends React.Component {
  render() {
    return <div>Hello world</div>;
  }
}

const container = document.createElement('div');
document.body.appendChild(container);
ReactDOM.render(<App />, container);
```

- Run the development server with `underreact`.

```bash
npx underreact start
# or
node node_modules/.bin/underreact start
```

- Open the URL printed in your terminal.

## Usage

You should not install the Underreact CLI globally. Instead, install Underreact as a devDependency of your project and use the `underreact` command via `npx`, npm `"scripts"`, or `node_modules/.bin/underreact`. The easiest way is probably to set up npm scripts in `package.json`, so you can use `npm run start`, `npm run build`, etc., as needed.

The CLI provides the following commands:

- `start`: Start a development server.
- `build`: Build for deployment.
- `serve-static`: Serve the files that you built for deployment.

**Tip:** In this readme we frequently use the command `npx`, if you find it unfamiliar please read [this blog post by npm](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b).

### Underreact configuration file

To configure Underreact, create an `underreact.config.js` file at the root of your project.

Please note that **no configuration is necessary to get started.** On most production projects you'll want to set at least a few of the [`configuration object`](#configuration-object-properties) properties.

Your `underreact.config.js` can export a function or an object.

#### Exporting an object

You can also directly export the [configuration object](#configuration-object-properties). This is a great way to start tweaking Underreact's configuration. For example, in the code below we simply modify the [`siteBasePath`](#sitebasepath):

```javascript
// underreact.config.js
module.exports = {
  siteBasePath: 'fancy'
};
```

#### Exporting a function

You can also export a function that returns your [configuration object](#configuration-object-properties).

This function is called with the following named parameters:

```javascript
// underreact.config.js
/**
 * @param {Object} opts
 * @param {Webpack} opts.webpack - Underreact's version of Webpack. Use this as needed to apply core Webpack plugins like `PrefetchPlugin`, `IgnorePlugin`, and `SourceMapDevToolPlugin`, so that your project is not dependent on its own Webpack version.
 * @param {'start'|'build'|'serve-static'} opts.command - The current Underreact command.
 * @param {'production'|'development'} opts.mode - The current mode of Underreact.
 * @returns {Promise<Object> | Object}
 */
module.exports = function underreactConfig({ webpack, command, mode }) {
  return {
    /* Underreact configuration object */
  };
};
```

This approach is quite powerful, because you can also return a Promise or use an async function to generate configurations with asynchronous dependencies from the filesystem or Internet. For example:

```javascript
// underreact.config.js
const path = require('path');
const downloadAssets = require('./scripts/fetchAssets');

module.exports = async function underreactConfig({ webpack, command, mode }) {
  const publicAssetsPath = 'public';
  await downloadAssets(path.resolve(publicAssetsPath));

  return {
    publicAssetsPath,
    webpackPlugins: [command === 'build' ? new webpack.ProgressPlugin() : null]
  };
};
```

### Defining your HTML

Underreact is intended for single-page apps, so you only need one HTML page. If you are building a React application, you can also use it to define a `div` element for `react-dom` to mount your React component tree on.

You have 2 choices:

1. **Preferred:** Provide the [`htmlSource`] configuration option, which is an HTML string, a Promise or a Function returning HTML string or promise, that resolves to an HTML string.
2. Provide no HTML-rendering function and let Underreact use the default, development-only HTML document. *You should only do this for prototyping and early development*: for production projects, you'll definitely want to define your own HTML, if only for the `<title>`.

If you provide a Promise for [`htmlSource`], you can use any async I/O you need to put together the page. For example, you could read JS files and inject their code directly into `<script>` tags, or inject CSS into `<style>` tags. Or you could make an HTTP call to fetch dynamic data and inject it into the page with a `<script>` tag, so it's available to your React app.

If you provide a Function for [`htmlSource`], Underreact would call it with the named parameter `basePath`. This gives you the flexibility to load assets with a root relative URL. The example below shows how to load a favicon from your `public` directory:

```js
// underreact.config.js
module.exports = {
  /**
   * @param {Object} opts
   * @param {Webpack} opts.basePath - the normalized value of your site's base path
   * @returns {Promise<string> | string} 
   */
  htmlSource: ({ basePath }) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Words that rhyme with fish</title>
      <meta name="description" content="A website about words that rhyme with fish, like plish">
      <link rel="shortcut icon" href="${basePath}/img/favicon.ico" type="image/x-icon" />
    </head>
    <body>
      <div id="app">
        <!-- React app will be rendered into this div -->
      </div>
    </body>
    </html>
  `
};
```

**Note: Underreact would automatically inject the relevant `script` and `link` tags to your HTML template.**

In the example below, we are defining our HTML in a separate file and requiring it in `underreact.config.js`:

```js
// underreact.config.js
const html = require('./html');

module.exports = function underreactConfig({ webpack, command, mode }) {
  return {
    htmlSource: html(mode)
  };
};

// html.js
const fs = require('fs');
const { promisify } = require('util');
const minimizeJs = require('./minimize-js');

module.exports = async mode => {
  // read an external script, which we will inline
  let inlineJs = await promisify(fs.readFile)('./path/to/some-script.js', 'utf8');

  if (mode === 'production') {
    inlineJs = minimizeJs(inlineJs);
  }

  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Words that rhyme with fish</title>
        <meta name="description" content="A website about words that rhyme with fish, like plish">
        <script>${inlineJs}</script>
      </head>
      <body>
        <div id="app">
          <!-- React app will be rendered into this div -->
        </div>
      </body>
      </html>
    `;
};
```

## Modes

Underreact provides two different modes of execution: development and production

### Development mode

The development mode is the default mode of the `start` command. This mode is meant to be used in a local development environment, ideally your computer. Underreact does a bunch of optimizations to make compilation as fast as possible and enable developer tools like [hot reloading](#how-do-i-enable-hot-module-reloading-) and live reloading.

You can use this mode by simply running `underreact start`:

```bash
npx underreact start
# or being explicit
npx underreact start --mode=development
```

You can also use this mode with the `build` command and then serve it with `serve-static`, if you want to perform quick inspection of unminified files.

```bash
npx underreact build --mode=development
# serve it
npx underreact serve-static
```

**Warning: Do not host code generated by development mode in a production environment.**

### Production mode

This mode is geared towards running the build output in a production environment. Underreact performs a bunch of optimizations to make your application run fast and reduce the bundle size.

You can use this mode by simply running `underreact build`:

```bash
npx underreact build
# or being explicit
npx underreact build --mode=production
```

You can also use this mode with the `start` command, in case you need to debug a problem that does not show up in `development` mode (e.g. one caused by minification):

```bash
npx underreact start --mode=production
```

## Babel

Out of the box Underreact doesn't require you to setup a `babel.config.js` file. It uses [`@mapbox/babel-preset-mapbox`](https://github.com/mapbox/underreact/tree/master/packages/babel-preset-mapbox) internally to provide a top-notch default configuration.

### Exposing `babel.config.js`

There are many cases — for example, [when using Jest](#how-do-i-make-jest-use-underreacts-babel-configuration-) — when you want a `babel.config.js` to exist at the root your project. In this case it is best to create a `babel.config.js` at the root of your project and install `@mapbox/babel-preset-mapbox` as a devDependency:

```npm
npm install --save-dev @mapbox/babel-preset-mapbox
```

```js
// babel.config.js
module.exports = {
  presets: ['@mapbox/babel-preset-mapbox']
};
```

While you are free to use any Babel presets & plugins, we strongly recommend that you use `@mapbox/babel-preset-mapbox`, as it provides a good combination of presets and plugins that are necessary for any Underreact application to work properly. For more advanced configuration visit [the documentation for `@mapbox/babel-preset-mapbox`](https://github.com/mapbox/underreact/tree/master/packages/babel-preset-mapbox).

**Note:** Underreact doesn't support `.babelrc`; please use `babel.config.js`. (Read more about the difference [here](https://babeljs.io/docs/en/config-files)).

## Browser support and polyfills

One of the founding principles of the Internet is its ability to support a multitude of devices. With the ever changing JavaScript ecosystem, new features of the language coming yearly and it has become difficult to use them while also supporting older browsers. Underreact wraps tools that solve these problems for you.

### Transpiling JavaScript syntax and vendor-prefixing CSS

In Underreact you can use the [Browserslist](https://github.com/browserslist/browserslist) notation to specify the browser versions that you want to support. By default, Underreact uses a query that **supports all major browsers including `ie 11`**. You can change this behaviour by customizing the [`browserslist`] property:

```javascript
// underreact.config.js
module.exports = {
  // The % refers to the global coverage of users from browserslist
  browserslist: ['>0.25%', 'not ie 11']
};
```

In the example above we are setting [`browserslist`] to target all the browsers with greater than `0.25%` market share but not IE 11. This information will be passed to [Autoprefixer](https://github.com/postcss/autoprefixer) to add vendor prefixes to CSS and to [Babel](https://babeljs.io/docs/en) to transpile your JavaScript to ES5.

### Polyfilling newer JavaScript features

By default, Underreact polyfills the following JavaScript features:

- `Array.from`
- `Object.assign`
- `Promise`
- `Symbol`

The above polyfills (combined with Babel's transpilation) allow you to freely use `for..of` loops, async functions, and the spread operator.

If your application needs any other polyfill (e.g. `fetch`), you can install it and import it at the top of your [`jsEntry`] file:

```js
// src/index.js
import 'whatwg-fetch';
```

### Using `@babel/polyfill`

If you don't care about bundle size and want to polyfill all standard JS, you can install [`@babel/polyfill`](https://babeljs.io/docs/en/babel-polyfill) and import it in your [`jsEntry`] file.

**Warning:** [`polyfill`](#polyfill) must be set to `false` to use `@babel/polyfill` and you should only import `@babel/polyfill` once and only once in your application.

## Deployment environments

### Using environment variables

Underreact allows you to inject environment variables into your client-side code at build time. You can set them up by using the [`environmentVariables`](#environmentvariables) option in your configuration.

```js
// underreact.config.js
module.exports = {
  environmentVariables: {
    SERVER_URL: 'https://ketchup.com'
  }
};
```

**Note: `DEPLOY_ENV` & `NODE_ENV` are special environment variables in Underreact, so cannot be set in Underreact configuration.**

### `DEPLOY_ENV` and `NODE_ENV`

- `NODE_ENV` will default to `'development'` in [development mode](#modes) and `'production'` in [production mode](#modes).
- It's recommended that you *not* set `NODE_ENV` manually: use Underreact modes instead. But if you do set `NODE_ENV`, it must be `'development'`, `'production'`, or `'test'`.
- By default, `DEPLOY_ENV` is set to `'development'`. You can it to any value you wish to better align with your target environments (e.g. `DEPLOY_ENV=something npx underreact build`) and this value will be made available in your client-side code on `process.env.DEPLOY_ENV`. For example, you may want to set it to `'staging'` when building for a staging environment, `'production'` when building for production, or `'test'` when testing.
- `DEPLOY_ENV` is not the same as `NODE_ENV`: see [below](#why-set-deploy_env-instead-of-node_env).

A recommend way to use `DEPLOY_ENV` is set it in your npm scripts:

```json
// package.json
{
  "scripts": {
    "build": "underreact run build", // if not set, DEPLOY_ENV will be set to `production` automatically
    "build:staging": "DEPLOY_ENV=staging underreact run build",
    "build:sandbox": "DEPLOY_ENV=sandbox underreact run build"
  }
}
```

### Why set `DEPLOY_ENV` instead of `NODE_ENV`?

If you are used to using `NODE_ENV` to target different deployment environments, you should instead use `DEPLOY_ENV`, instead.

Underreact discourages setting `NODE_ENV` manually, as a number of libraries depend on its value and a wrong value could result in an unoptimized build. You should instead use Underreact's [modes](#modes), which will set the right `NODE_ENV` for your app.

## Configuration object properties

### browserslist

Type: `Array<string>` \| `Object`. A valid [Browserslist](https://github.com/browserslist/browserslist) value. Default:`['>0.2%', 'not dead', 'not ie < 11', 'not op_mini all']`.

This value is used by Autoprefixer to set vendor prefixes in the CSS of your stylesheets, and is used to determine Babel compilation via [babel-preset-env](#babel).

You can also target different settings for different Underreact [modes](#modes) by sending an object:

```javascript
// underreact.config.js
module.exports = {
  browserslist: {
    production: ['> 1%', 'ie 10'],
    development: ['last 1 chrome version', 'last 1 firefox version']
  }
};
```

### compileNodeModules

Type: `boolean` \| `Array<string>`. Default: `true`.

Many npm packages are now written in ES2015+ syntax, which is not compatible with all the browsers you may be supporting. So **by default Underreact compiles all `node_modules` to ES5**.

You can set `compileNodeModules: false` to disable compilation of `node_modules`, or pass an array of package names to selectively compile. In the example below we are only compiling the specified npm packages:

```js
// underreact.config.js
module.exports = {
  compileNodeModules: ['p-finally', 'p-queue']
};
```

### devServerHistoryFallback

Type: `boolean`. Default: `false`.

Set to `true` if you want to use HTML5 History for client-side routing (as opposed to hash routing). This configures the development server to fall back to `index.html` when you request nested routes.

**Tip**: This should only be *intentionally* turned on, when you know you're going to configure your server to allow for HTML5-History-powered client-side routing.

### environmentVariables

Type: `{ [string]: string | number | boolean }`.

Environment variables that you'd like to make available in your client-side bundle on `process.env`. For example, if you set `environmentVariables: { ORIGIN: 'foo.com' }`, you can use `process.env.ORIGIN` in your JavaScript.

### hot

Type: `boolean`. Default: `true`.

Enable hot module reloading of Underreact. Read ["How do I enable hot module reloading?"](#how-do-i-enable-hot-module-reloading-) for more details.

### htmlSource

Type: `string`\|`Promise<string>`\|`Function<string | Promise<string>>`. Default:[see the default HTML](https://github.com/mapbox/underreact/blob/master/lib/default-html.js).

The HTML template for your app, or a Promise that resolves to it. Read ["Defining your HTML"](#defining-your-html) for more details.

### jsEntry

Type: `string`. Absolute path. Default: `${project-root}/src/index.js`.

The entry JS file for your app. In a typical React app, this is the file where you'll use `react-dom` to render your app on an element.

In the default value, `project-root` refers to the directory of your `underreact.config.js` file.

### liveReload

Type: `boolean`. Default: `true`.

Set it to `false` to prevent automatic reloading of your app on code changes. **Switching off `liveReload` also disables [hot reloading](#hot).**

### outputDirectory

Type `string`. Absolute path, please. Default: `${project-root}/_site/`.

The directory where webesite files should be written.

You'll want to ignore this directory with `.gitignore`, `.eslintignore`, etc.

In the default value, `project-root` refers to the directory of your `underreact.config.js` file.

### polyfill

Type: `boolean`. Default: `true`.

Whether or not to use Underreact's default polyfills. Read more at ["Polyfilling newer JavaScript features"](#polyfilling-newer-javascript-features).

### port

Type: `number`. Default: `8080`.

Preferred port for development servers.
If the specified port is unavailable, another port is used.

### postcssPlugins

Type: `Array<Function>`. Default: `[]`.

All of the CSS that you import is run through [PostCSS](http://postcss.org/), so you can apply any [PostCSS plugins](https://github.com/postcss/postcss/blob/master/docs/plugins.md) to it.
Underreact always runs [Autoprefixer](https://github.com/postcss/autoprefixer) for you.

### publicAssetsPath

Type: `string`. Default: `underreact-assets`.

The directory where Underreact assets will be placed, relative to the website's root.

By default, for example, the main JS chunk will be written to `underreact-assets/js/main.chunk.js`.

**Tip**: It's important to know about this value so you can set up caching and other asset configuration on your server.

### publicDirectory

Type `string`. Absolute path, please. Default: `${project-root}/public/`.

Any files you put into this directory will be copied, without processing, into the [`outputDirectory`](#outputdirectory).
You can put images, favicons, data files, and anything else you want in here. To reference these assets in your Javascript code, you can use the `BASE_PATH` environment variable. Read ["How do I include SVGs, images, and videos?"](#how-do-i-include-svgs-images-and-videos).

In the default value, `project-root` refers to the directory of your `underreact.config.js` file.

### siteBasePath

Type: `string`. Default: `'/'`.

Path to the base directory on the domain where the site will be deployed. The default value is the domain's root. To help create valid links, Underreact exposes this value to your source code with an environment variable `BASE_PATH`. The table below gives an example of how Underreact sets `BASE_PATH` environment variable for a given `siteBasePath` value: 

| siteBasePath | process.env.BASE_PATH |
| ------------ | --------------------- |
| (not set)    | ""                    |
| "/"          | ""                    |
| "ketchup"    | "/ketchup"            |
| "/ketchup"   | "/ketchup"            |
| "/ketchup/"  | "/ketchup"            |

This normalization behaviour comes in handy when writing statements like `process.env.BASE_PATH + '/my-path'`. Read ["How do I include SVGs, images, and videos?"](#how-do-i-include-svgs-images-and-videos).

Underreact also passes this as a named parameter to the [`htmlSource`] function.  Read ["Defining your HTML"](#defining-your-html) for more details.

**Tip**: There's a good chance your app isn't at the root of your domain. So this option represents the path of your site *within* that domain. For example, if your app is at `https://www.special.com/ketchup/*`, you should set `siteBasePath: '/ketchup'`.

### stats

Type: `string`. Absolute path. Default: ``.

The directory where Webpack would write stats. By default, no stats file will be generated.

### vendorModules

Type: `Array<string>`. Default: `[]`.

Identifiers of npm packages that you want to be added to the vendor bundle.
The purpose of the vendor bundle is to deliberately group dependencies that change relatively infrequently — so the vendor bundle can stay cached for longer than the others.

By default, the vendor bundle includes `react` and `react-dom`.

**Tip:** It is good idea to include big stable libraries your project depends on: for example, `redux`, `moment.js`, `lodash`, etc.

### webpackConfigTransform

Type: `config => transformedConfig`. Default `x => x` (identify function).

If you want to make changes to the Webpack configuration beyond what's available in the above options, you can use this, the nuclear option.
Your function receives the Webpack configuration that Underreact generates and returns a new Webpack configuration, representing your heart's desires.

**Tip:** You should think twice before using `webpackConfigTransform`, as Underreact tries its best to abstract away Webpack so that you can focus on your application.

### webpackLoaders

Type: `Array<Rule>`.

[Webpack `Rule`s](https://webpack.js.org/configuration/module/#rule) specifying additional loaders that you'd like to add to your Webpack configuration.

If you need more fine-grained control over the Webpack configuration, use [`webpackConfigTransform`](#webpackconfigtransform).

**Tip**: You should be careful before adding support for a new source type (for example, `scss`, `less`, `ts`), as it will make your application dependent on Webpack and its ecosystem.

### webpackPlugins

Type: `Array<Object>`.

Additional plugins to add to your Webpack configuration.

For plugins exposed on the `webpack` module itself (e.g. `webpack.DefinePlugin`), **you should use Underreact's version of Webpack instead of installing your own.**
That will prevent any version incompatibilities.
That version is available in the context object passed to your configuration module function.

Here, for example, is how you could use the `DefinePlugin` in your `underreact.config.js`:

```js
// underreact.config.js
module.exports = ({ webpack }) => {
  return {
    webpackPlugins: [new webpack.DefinePlugin(..)]
  };
}
```

## FAQs

### How do I make Jest use Underreact's Babel configuration ?

Jest expects a `babel.config.js` at the root of your application. Read ["Exposing `babel.config.js`"](#exposing-babelconfigjs). **Underreact will only work with Jest version >=23.6.** To install Jest, follow the steps mentioned for Babel 7 in the [official installation docs](https://jestjs.io/docs/en/getting-started#using-babel).

### How do I dynamically import JavaScript modules or React components?

You can use the `import()` syntax to asynchronously load a valid JavaScript module. For example:

```js
// src/index.js
import("./math").then(math => {
  console.log(math.add(16, 26)); // 42
});
// src/math.js
export default add(a,b) {
  return a + b;
}
```

Read [official React](https://reactjs.org/docs/code-splitting.html#reactlazy) docs for more information on how to load your React component dynamically.

### How do I reduce my build size?

To reduce the build size you can try the following:

- **Avoid using custom polyfilling.** Polyfilling is expensive, and using the default [polyfill](#polyfill) settings could save you a ton of bytes.
- **Use dynamic imports.** Read more [here](#how-do-i-dynamically-import-javascript-modules-or-react-components)
- **Target modern browsers with `browserslist`.**
- **Selectively compile `node_modules`.** By either selectively compiling or disabling [compilation of `node_modules`](#compilenodemodules), you can save some compilation time and reduce build size.

### How do I include SVGs, images, and videos?

- **SVG** Underreact uses [@mapbox/svg-react-transformer](https://github.com/mapbox/svg-react-transformer) to transform any imported SVG into a React component.
- **Images/Videos/Other Files**: Underreact allows you to import any file type with the help of [file-loader](https://www.npmjs.com/package/file-loader). In the example below we are going to import an image:

```js
import logo from './logo.png';
console.log(logo); // /logo.84287d09.png

function Header() {
  // Import result is the URL of your image
  return <img src={logo} alt="Logo" />;
}
```

It is generally a good idea to use the above method for importing assets because:

- It will throw a compilation error when an asset is missing.
- It adds a hash to the filenames for client level cache invalidation.

If you cannot use this method, you can place assets in the [`publicDirectory`](#publicdirectory) and create a link using the `BASE_PATH` environment variable as shown below:

```js
function Header() {
  return <img src={process.env.BASE_PATH + '/logo.png'} alt="Logo" />;
}
```

The `BASE_PATH` environment variable is automatically set by Underreact and is equivalent to the value of [`siteBasePath`](#sitebasepath). `BASE_PATH`'s value will never end with a `/`, even if your `siteBasePath` does.

### How do I enable hot module reloading ?

Hot module reloading allows you to reload only the module that has changed, without affecting the rest of the code or reloading the page in the browser. This is different from [`liveReload`](#livereload) which reloads the entire application when code changes. Underreact first tries to hot reload, then falls back to live reloading.

Underreact supports CSS and JavaScript hot reloading. CSS hot reloading should work out of the box. To implement hot reloading for JavaScript modules, you can follow the steps in the [Webpack docs](https://webpack.js.org/guides/hot-module-replacement/#enabling-hmr). (You can skip the parts about Webpack configuration, as it has already been taken care of by Underreact.)

For React apps, you'll' benefit from hot module reloading of React components. Luckily this setup is fairly straightforward. First, you need to get your own `babel.config.js` file by following the steps in ["Exposing `babel.config.js`"](#exposing-babelconfigjs). Then, you need to install [react-hot-loader](https://github.com/gaearon/react-hot-loader):

```bash
npm install react-hot-loader
```

And then add it to your `babel.config.js`:

```js
// babel.config.js
module.exports = {
  presets: ['@mapbox/babel-preset-mapbox'],
  plugins: ['react-hot-loader/babel']
};
```

You can then make any of your React components hot:

```js
// src/app.js
import React from 'react';
import { hot } from 'react-hot-loader';

const App = () => <div>Hello World!</div>;

export default hot(module)(App);
```

You can read more about hot reloading your React components by reading `react-hot-loader` [docs](https://github.com/gaearon/react-hot-loader).

[`htmlsource`]: #htmlsource

[`browserslist`]: #browserslist

[`jsentry`]: #jsentry
