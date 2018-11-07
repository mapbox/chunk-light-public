# @mapbox/underreact

🚨🚨 **WORK IN PROGRESS!** 🚨🚨

Minimal, extensible React app build system that you won't need to eject when things get weird.

It's a pretty thin wrapper around Babel, Webpack, and PostCSS, and will never accumulate an ecosystem of its own. And it aims to be just as useful for production applications with idiosyncratic demands as for simple prototypes.

## Table of contents

- [Installation](#installation)
  - [Getting started](#getting-started)
- [Usage](#usage)
  - [Underreact configuration file](#underreact-configuration-file)
  - [Defining your HTML](#defining-your-html)
- [Modes](#modes)
- [Babel](#babel)
  - [Exposing babel.config.js](#exposing-babelconfigjs)
- [Browser support and Polyfills](#browser-support-and-polyfills)
  - [Transpiling of Javascript syntax and prefixing CSS](#transpiling-of-javascript-syntax-and-prefixing-css)
  - [Polyfilling of newer Javascript features](#polyfilling-of-newer-javascript-features)
  - [Using @babel/polyfill](#using-babelpolyfill)
- [Deployment environments](#deployment-environments)
  - [Using environment variables](#using-environment-variables)
  - [Using custom environment variables](#using-custom-environment-variables)
  - [Why not use NODE_ENV?](#why-not-use-node_env)
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
  - [How do I use Flow with Underreact ?](#how-do-i-use-flow-with-underreact-)
  - [How do I dynamically import Javascript modules or React Components ?](#how-do-i-dynamically-import-javascript-modules-or-react-components-)
  - [How do I reduce my build size?](#how-do-i-reduce-my-build-size)
  - [How do I include SVGs, images, and videos?](#how-do-i-include-svgs-images-and-videos)
  - [How do I enable Hot module reloading ?](#how-do-i-enable-hot-module-reloading-)

## Installation

Requirements:

- Node 6+.

Install Underreact as a developer dependency of your project:

```bash
npm install --save-dev @mapbox/underreact
```

If you are building a React application, you also need to install React dependencies:

```bash
npm install react react-dom
```

Add `_underreact*` to your `.gitignore`, and maybe other ignore files (e.g. `.eslintignore`). That way you'll ignore files that Underreact generates. (If you set the [`outputDirectory`](#outputdirectory) option, you'll want to do this for your custom value.)

### Getting started

**The bare minimum to get started with Underreact.**

- Create your entry JS file at `src/index.js`.

```js
// src/index.js
console.log('hello world!');
```

- Run it with `underreact`

```bash
npx underreact start
# or
node node_modules/.bin/underreact start
```

- Open the URL printed in your terminal.

**Using with React**

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

- Run it with `underreact`

```bash
npx underreact start
```

- Open the URL printed in your terminal.

## Usage

You should not install the Underreact CLI globally. Instead, install it as a dependency of your project and use the `underreact` command via `npx`, npm `"scripts"`, or `node_modules/.bin/underreact`. The easiest way is probably to set up npm scripts in `package.json`, so you can use `npm run start`, `npm run build`, etc., as needed.

The CLI provides the following commands:

- `start`: Start a development server.
- `build`: Build for deployment.
- `serve-static`: Serve the files that you built for deployment.

**Tip:** In this readme we frequently use the command `npx`, if you find it unfamiliar please read [this](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) blog post by npm.

### Underreact configuration file

To configure Underreact, it expects an `underreact.config.js` file to exist at the root of your project.

Please note that **no configuration is necessary to get started.** On most production projects you'll want to set at least a few of the [`configuration object`](#configuration-object-properties) properties.

Your `underreact.config.js` can look like either of the below:

**Exporting an object**: You can also directly export the [`configuration object`](#configuration-object-properties). This is a great way to start tweaking Underreact's configuration. For example in the code below we simply want to modify the [`siteBasePath`](#sitebasepath):

```javascript
// underreact.config.js
module.exports = {
  siteBasePath: 'fancy'
};
```

**Exporting a function**: You can also export a function which would then be used as a factory method for your [`configuration object`](#configuration-object-properties).

This function is called with the following parameter properties of an object:

```javascript
// underreact.config.js
/**
 * @param {Object} opts
 * @param {Webpack} opts.webpack - The webpack dependency injection, so that your project is not dependent on webpack module. This is useful for using a bunch of plugins scoped to the Webpack object eg. PrefetchPlugin, IgnorePlugin, SourceMapDevToolPlugin etc.
 * @param {'start'|'build'|'serve-static'} opts.command - The current command Underreact is following.
 * @param {'production'|'development'} opts.mode - The current mode of Underreact.
 * @returns {Promise<Object> | Object}
 */
module.exports = function underreactConfig({ webpack, command, mode }) {
  return {
    /*Underreact configuration object*/
  };
};
```

This approach is quite powerful as you can also use an **async function** (Node >= 8) to generate complex configurations. Let us look at a hypothetical use case:

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

1. **Preferred:** Provide [`htmlSource`](#htmlsource) which is an HTML string or a Promise that resolves to an HTML string.
2. Provide no HTML-rendering function and let Underreact use the default HTML document. *You should only do this for prototyping and early development*: for production projects, you'll definitely want to define your own HTML at some point, if only for the `<title>`.

If you provide a promise, you can use any async I/O you need to put together the page. For example, you could read JS files and inject their code directly into `<script>` tags, or inject CSS into `<style>` tags. Or you could make an HTTP call to fetch dynamic data and inject it into the page with a `<script>` tag, so it's available to your React app.

**Note: Underreact would automatically inject the relevant `script` and `link` tags to your HTML template.**

In the example below, we are defining `htmlSource` in a separate file and requiring it in `underreact.config.js`:

```js
// underreact.config.js
const htmlSource = require('./html-source');

module.exports = function underreactConfig({ webpack, command, mode }) {
  return {
    htmlSource: htmlSource(mode)
  };
};

// html-source.js
const fs = require('fs');
const { promisify } = require('util');
const minimizeJs = require('./minimize-js');

module.exports = async mode => {
  // read an external script, which we will inline
  let inlineJs = await promisify(fs.readFile)('./path/to/some-script.js');

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

Underreact provides two different modes of execution:

1. **development:** The development mode is the default mode of the `start` command. This mode is meant to be used in a local development environment, ideally your computer. Underreact does a bunch of optimizations to make compilation as fast as possible and enable developer tools like [Hot reloading](#how-do-i-enable-hot-module-reloading-) and Live reloading.

You can use this mode by simply running:

```bash
npx underreact start
# or being explicit
npx underreact start --mode=development
```

You can also use this mode with the `build` command and then serve it with `serve-static` command.

```bash
npx underreact build --mode=development
# serve it
npx underreact serve-static
```

**Warning: Do not host code generated by development mode in a production environment.**

2. **production:** This mode is geared towards running the build output in a production environment. Underreact makes a bunch of optimizations to make your application run fast and also reduce the bundle size.

You can use this mode by simply running:

```bash
npx underreact build
# or being explicit
npx underreact build --mode=production
```

You can also use this mode with the `start` command and benefit from the live reloading of the app:

```bash
npx underreact start --mode=production
```

## Babel

Out of the box Underreact doesn't require you to setup a `babel.config.js` file. It uses [`@mapbox/babel-preset-mapbox`](https://github.com/mapbox/underreact/tree/next/packages/babel-preset-mapbox) internally to provide a set of default configuration for your application.

### Exposing `babel.config.js`

There are certain libraries that expect `babel.config.js` to exist at the root your project. In this case it is best to create a `babel.config.js` at the root of your project:

```npm
npm install --save-dev @babel/core @mapbox/babel-preset-mapbox
```

```js
// babel.config.js
module.exports = {
  presets: ['@mapbox/babel-preset-mapbox']
};
```

While you are free to use any Babel presets & plugins, we strongly recommend you to use `@mapbox/babel-preset-mapbox` as it provides a good combination of presets and plugins that are necessary for any Underreact application to work properly. For more advanced configuration visit [`@mapbox/babel-preset-mapbox`](https://github.com/mapbox/underreact/tree/next/packages/babel-preset-mapbox).

**Note:** Underreact doesn't support `.babelrc`, please instead use `babel.config.js` (Read more [here](https://babeljs.io/docs/en/config-files)).

## Browser support and Polyfills

One of the founding principles of Internet is its ability to support a multitude of devices. With the ever changing Javascript ecosystem, new features of language coming yearly and it has become difficult to use them while also supporting older browsers.

### Transpiling of Javascript syntax and prefixing CSS

In Underreact you can use the [Browserslist](https://github.com/browserslist/browserslist) notation to provide a list of minimum browser versions to support. By default Underreact uses a query to **support all major browsers including `ie 11`**. In case you want to change this behaviour by customizing the [`browserslist`](#browserslist) property:

```javascript
// underreact.config.js
module.exports = {
  // The % refers to the global coverage of users from browserslist
  browserslist: ['>0.25%', 'not ie 11']
};
```

In the example above we are setting the [`browserslist`](#browserslist) to target all the browsers with greater than `0.25%` market share but not IE 11. This information would then be passed to [Autoprefixer](https://github.com/postcss/autoprefixer) to add vendor prefixes and also to [Babel](https://babeljs.io/docs/en) so that it can transpile your Javascript which can be read by all the browsers you wish to support.

### Polyfilling of newer Javascript features

Underreact polyfills the following Javascript features

- `Array.from`
- `fetch`
- `Object.assign`
- `Promise`
- `Symbol`

The above polyfills should allow you to freely use `for..of`, `async function() {}`, `fetch(..)` or `...{}` in your code.

If your application needs any other polyfill, you can install it and import it at the top of your [`jsEntry`](#jsentry) file:

```js
// src/index.js
import 'core-js/fn/set';
import 'core-js/fn/map';
```

### Using @babel/polyfill

Babel allows you to automatically inject the polyfills your application needs based on your [`browserslist`](#browserslist). If you want to use this feature you would first need to disable the [`polyfill`](#polyfill) option to prevent double importing of the same polyfill.

To use this feature install [`@babel/polyfill`](https://babeljs.io/docs/en/babel-polyfill):

```shell
npm install --save @babel/polyfill
```

And then place `@babel/polyfill` at the **top of your [`jsEntry`](#jsentry) file.**

```js
// Using @babel/polyfill
// src/index.js
import '@babel/polyfill';
```

**Warning:** [`polyfill`](#polyfill) must be set to `false` to use `@babel/polyfill` and you should only import `@babel/polyfill` once and only once in your application.

## Deployment environments

### Using environment variables

Underreact allows you to inject environment variables during the build time. You can set them up by using the [`environmentVariables`](#environmentvariables) option in your configuration.

**Note: `DEPLOY_ENV` & `NODE_ENV` are special environment variables in Underreact and they should never be set in Underreact configuration.**

There are certain things to keep in mind:

- If `DEPLOY_ENV` is not set it will default to `development` in [development mode](#modes) and `production` in [production mode](#modes).
- It is recommended that you do not change the default value of `DEPLOY_ENV` when running in [development mode](#modes).
- `DEPLOY_ENV` is generally be set to `staging` or `production` for production mode, but you can set it to any value you wish to better align with your target environments.
- `DEPLOY_ENV` is not the same as `NODE_ENV`, refer to [`Why not use NODE_ENV`](#why-not-use-node_env).

A recommend way to use `DEPLOY_ENV` would be to set it in your npm scripts:

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

### Using custom environment variables

You can also set env variables in your `underreact.config.js` with the help of [`environmentVariables`](#environmentvariables) property:

```js
// underreact.config.js
module.exports = {
  environmentVariables: {
    SERVER_URL: 'https://ketchup.com'
  }
};
```

### Why not use `NODE_ENV`?

Underreact discourages setting of `NODE_ENV` manually, as a number of libraries depend on its value and a wrong value could result in an unoptimized build. You should instead use Underreact's [mode](#modes) to signal optimization of your bundle. It would internally set the right `NODE_ENV` for your app.

**Tip:** If you are used to using `NODE_ENV` to target different deployment environments, you should instead use `DEPLOY_ENV`.

## Configuration object properties

### browserslist

Type: `Array<string>` \| `Object`. A valid [Browserslist](https://github.com/browserslist/browserslist) value. Default:`['>0.2%', 'not dead', 'not ie < 11', 'not op_mini all']`.

This value is used by Autoprefixer to set vendor prefixes in the CSS of your stylesheets, and is used to determine Babel compilation via [babel-preset-env](#babel).

You can also target different settings for different Underreact [modes](#modes), by sending an object:

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

There is no guarantee that the node module you use would work well with the browsers you are planning to target. This is why Underreact by compiles all of the node modules to standard ES5 Javascript by default.

You can set it to `false` to disable compilation of `node_modules` or pass an array of package names to selectively compile. In the example below we are only compiling the provided node modules:

```js
// underreact.config.js
module.exports = {
  compileNodeModules: ['p-finally', 'p-queue']
};
```

### devServerHistoryFallback

Type: `boolean`. Default: `false`.

Set to `true` if you want to use HTML5 History for client-side routing (as opposed to hash routing). This configures the development server to fall back to `index.html` when you request nested routes.

**Tip**: It should only be *intentionally* turned on, when you know you're going to configure your server to allow for HTML5-History powered client-side routing.

### environmentVariables

### hot

Type: `boolean`. Default: `true`.

Enable hot module reloading of Underreact. Read [How do I enable Hot module reloading?](#how-do-i-enable-hot-module-reloading-)) for more details.

### htmlSource

Type: `string`\|`Promise`. Default:`[Default HTML](https://github.com/mapbox/underreact/blob/next/lib/default-html.js)\`.

The value to be used to generate HTML template for your app. Read [`Defining your HTML`](#defining-your-html) for more details.

### jsEntry

Type: `string`. Absolute path. Default: `${project-root}/src/index.js`.

The entry JS file for your app. Typically this is the file where you'll use `react-dom` to render your app on an element.

In the default value, `project-root` refers to the directory of your `underreact.config.js` file.

### liveReload

Type: `boolean`. Default: `true`.

Set it to `false` to prevent automatic refreshing of your app on code changes. Switching off `liveReload` would also disabled [Hot Reloading](#hot).

### outputDirectory

Type `string`. Absolute path, please. Default: `${project-root}/_underreact-site/`.

The directory where files should be written.

You'll want to ignore this directory with `.gitignore`, `.eslintignore`, etc.

In the default value, `project-root` refers to the directory of your `underreact.config.js` file.

### polyfill

Type: `boolean`. Default: `true`.

Decide whether to use Underreact's polyfilling or not.Read more at [Polyfilling of ES2015 features](#polyfilling-of-newer-javascript-features))

### port

Type: `number`. Default: `8080`.

Preferred port for development servers.
If the specified port is unavailable, another port is used.

### postcssPlugins

Type: `Array<Function>`. Default: `[]`.

All of the CSS that you import is run through [PostCSS](http://postcss.org/), so you can apply any [PostCSS plugins](https://github.com/postcss/postcss/blob/master/docs/plugins.md) to it.
By default we already include [Autoprefixer](https://github.com/postcss/autoprefixer) for you.

### publicAssetsPath

Type: `string`. Default: `underreact-assets`.

The directory where Underreact assets will be placed, relative to the site's root.

By default, for example, the main JS chunk will be written to `underreact-assets/js/main.chunk.js`.

**Tip**: It's important to know about this value so you can set up caching and other asset configuration on your server.

### publicDirectory

Type `string`. Absolute path, please. Default: `${project-root}/src/public/`.

Any files you put into this directory will be copied, without processing, into the [`outputDirectory`](#outputdirectory).
You can put images, favicons, data files, and anything else you want in here.

In the default value, `project-root` refers to the directory of your `underreact.config.js` file.

### siteBasePath

Type: `string`. Default: `'/'`.

Path to the base directory on the domain where the site will be deployed. The default is the root

**Tip**: There's a good chance your app isn't at the root of your domain. So this option represents the path of your site *within* that domain. For example, if your app is at `https://www.special.com/ketchup/*`, you should set `siteBasePath: '/ketchup'`.

### stats

Type: `string`. Default: ``.

Pass a directory to which Webpack would write stats to. By default, no stats file would be generated.

### vendorModules

Type: `Array<string>`. Default: `[]`.

Identifiers of npm modules that you want to be added to the vendor bundle.
The purpose of the vendor bundle is to deliberately group dependencies that change relatively infrequently — so this bundle will stay cached for longer than the others.

By default, the vendor bundle includes `react` and `react-dom`.

**Tip:** It is good idea to include big stable libraries your project depends on; for example `redux`, `moment.js`, `lodash` etc.

### webpackConfigTransform

Type: `config => transformedConfig`. Default `x => x` (identify function).

If you want to make changes to the Webpack configuration beyond what's available in the above options, you can use this, the nuclear option.
Your function receives the Webpack configuration that Underreact generates and returns a new Webpack configuration, representing your heart's desires.

**Tip:** You should think twice before using `webpackConfigTransform`, as Underreact tries its best to abstract away Webpack so that you can focus on the important part of building your application.

### webpackLoaders

Type: `Array<Rule>`.

[Webpack `Rule`s](https://webpack.js.org/configuration/module/#rule) specifying additional loaders that you'd like to add your Webpack configuration.

If you need more fine-grained control over the Webpack configuration, use [`webpackConfigTransform`](#webpackconfigtransform).

**Tip**: You should be careful before adding support for a new source type (for example, `scss`, `less`, `ts`) as it is not officially supported by ECMAScript and would make your application dependant on Webpack and its ecosystem.

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

Underreact requires Jest version **>=23.6** and the steps mentioned for using Jest with **Babel 7** in the [official installation docs](https://jestjs.io/docs/en/getting-started#using-babel). Once done, you can follow the steps in [Exposing babel.config.js](#exposing-babelconfigjs).

### How do I use Flow with Underreact ?

To setup Flow, first set up a `babel.config.js` file by following steps mentioned in [Exposing babel.config.js](#exposing-babelconfigjs). Assuming you have already installed flow-bin by running the following command:

```bash
npm install --save-dev flow-bin
```

### How do I dynamically import Javascript modules or React Components ?

You can use the `import()` syntax to asynchronously load a valid Javascript module. For example:

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

To reduce the build size you can follow a bunch of the following steps:

- **Avoid using custom polyfilling.** Polyfilling is expensive and using the default [polyfill](#polyfill) settings would save you a ton of bytes.
- **Use dynamic import.** Read more [here](#how-do-i-dynamically-import-javascript-modules-or-react-components-)
- **Use a modern browserslist.** By using a more modern browserslist query you would end up saving your bundle size.

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

### How do I enable Hot module reloading ?

Hot module reloading allows you to reload only the module that has changes, without affecting the rest of the code. This is different from [`liveReload`](#livereload) which reloads the entire application when code changes. Underreact would first try to hot reload and then fall back to live reloading.

Underreact supports CSS and Javascript hot reloading. CSS hot reloading should work out of the box. To implement hot reloading for raw Javascript modules, you can follow the steps mentioned in the [Webpack docs](https://webpack.js.org/guides/hot-module-replacement/#enabling-hmr) (You can skip the parts which touches Webpack configuration as it has already been taken care of by Underreact).

For most cases you would benefit from hot module reloading of React components. Luckily this setup is fairly straight forward. First you need to get your own `babel.config.js` file by following the steps in [Exposing babel.config.js](#exposing-babelconfigjs). Now, you would need to install [react-hot-loader](https://github.com/gaearon/react-hot-loader):

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

You can then make any of your React component hot:

```js
// src/app.js
import React from 'react';
import { hot } from 'react-hot-loader';

const App = () => <div>Hello World!</div>;

export default hot(module)(App);
```

You can read more about reloading your React components by reading `react-hot-loader` [docs](https://github.com/gaearon/react-hot-loader).
