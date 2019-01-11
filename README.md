# Fork TS Checker Async Overlay Webpack Plugin

[![npm version](https://img.shields.io/npm/v/fork-ts-checker-async-overlay-webpack-plugin.svg?style=flat-square)](https://www.npmjs.com/package/fork-ts-checker-async-overlay-webpack-plugin)

Webpack plugin that connects [fork-ts-checker-webpack-plugin](https://github.com/Realytics/fork-ts-checker-webpack-plugin) (async: true) to error overlay of [webpack-dev-server](https://github.com/webpack/webpack-dev-server).

## What

This plugin enables fork-ts-checker-webpack-plugin to show type check errors in overlay of webpack-dev-server, without specifying `async: false` option (which slows down).

By default fork-ts-checker-webpack-plugin runs type checking after compilation, so result is pushed to webpack-dev-server client before type check is done.
So this plugin re-fires [`done` hook](https://webpack.js.org/api/compiler-hooks/#done) of webpack-dev-server after type checking is done (bit hacky).

## Installation

Please setup [fork-ts-checker-webpack-plugin](https://github.com/Realytics/fork-ts-checker-webpack-plugin) first.

For convenient, you can concat `thisPlugin.plugins()` to plugins array. Or you can add these plugins one-by-one.
Don't forget to remove `async: false` option of fork-ts-checker-webpack-plugin to get speed up with this plugin.

```js
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ForkTsCheckerAsyncOverlayWebpackPlugin = require('./fork-ts-checker-async-overlay-webpack-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  ...
  plugins: [
    ...
  ].concat(
    new ForkTsCheckerAsyncOverlayWebpackPlugin({
      checkerPlugin: new ForkTsCheckerWebpackPlugin()
    }).plugins()
  ),
  devServer: {
    overlay: true, // important
    inline: true,
  }
}
```

## Limitation (important)

Only errors (NOT warnings) are shown in overlay.
webpack-dev-server reloads window if re-firing done hook without errors. To prevent it, this plugin only re-fire if there are any errors.
It'd better to have async error reporting feature in webpack-dev-server itself.

## License

MIT
