const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const ForkTsCheckerAsyncOverlayWebpackPlugin = require('../index')

module.exports = {
  entry: './app.ts',
  output: {
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  plugins: [
    ...new ForkTsCheckerAsyncOverlayWebpackPlugin({
      checkerPlugin: new ForkTsCheckerWebpackPlugin({ async: true })
    }).plugins()
  ],
  devServer: {
    contentBase: __dirname,
    compress: true,
    port: 9000,
    overlay: true
  }
}
