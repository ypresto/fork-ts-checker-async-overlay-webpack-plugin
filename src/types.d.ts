// fork-ts-checker-webpack-plugin refers tslint typing only once.
// It is too big to `npm i --save-dev tslint`, so define missing types here.

declare module 'tslint' {
  export type RuleFailure = any
}
