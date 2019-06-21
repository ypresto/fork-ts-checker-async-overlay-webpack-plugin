import webpack, { compilation } from 'webpack'
import { Tap, AsyncSeriesHook, SyncHook } from 'tapable'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import { NormalizedMessage } from 'fork-ts-checker-webpack-plugin/lib/NormalizedMessage';

interface ForkTsCheckerWebpackPluginPrivate {
  async: boolean
  isWatching: boolean
  emitCallback: Function
  createEmitCallback(compilation: compilation.Compilation, callback: any): Function
}

interface ForkTsCheckerHooks {
  forkTsCheckerServiceBeforeStart: AsyncSeriesHook

  forkTsCheckerCancel: SyncHook
  forkTsCheckerServiceStartError: SyncHook
  forkTsCheckerWaiting: SyncHook
  forkTsCheckerServiceStart: SyncHook
  forkTsCheckerReceive: SyncHook<NormalizedMessage[], NormalizedMessage[]>
  forkTsCheckerServiceOutOfMemory: SyncHook;
  forkTsCheckerEmit: SyncHook<NormalizedMessage[], NormalizedMessage[], number>
  forkTsCheckerDone: SyncHook<NormalizedMessage[], NormalizedMessage[], number>
}

const NAME = 'ForkTsCheckerAsyncOverlayWebpackPlugin'

// destructive
function conditionalTap(tap: Tap, condition: () => boolean) {
  const fn = tap.fn
  tap.fn = (...args: any[]) => {
    if (condition()) return fn(...args)
    switch (tap.type) {
      case 'sync':
        return () => {}
      case 'async':
        return (...args: any[]) => {
          const callback = args.pop()
          callback()
        }
      case 'promise':
        return () => Promise.resolve()
      default:
        throw new Error(`Unknown tap type: ${tap.type}`)
    }
  }
  return tap
}

class ForkTsCheckerAsyncOverlayWebpackPlugin {
  private checkerPlugin:ForkTsCheckerWebpackPluginPrivate
  private interceptedDoneTaps: Tap[] = []
  private isCheckerDone = false
  private lastStats: webpack.Stats | null = null

  constructor(options: { checkerPlugin: ForkTsCheckerWebpackPlugin }) {
    if (!options.checkerPlugin) throw new Error(`Please pass checkerPlugin to ${NAME}.`)
    this.checkerPlugin = options.checkerPlugin as any
    this.validateChecker()
  }

  plugins(): any[] {
    return [this.checkerPlugin, this]
  }

  private validateChecker() {
    if (this.checkerPlugin.async) {
      console.warn(
        NAME +
          ': async option of ForkTsCheckerWebpackPlugin is disabled. This plugin does nothing.'
      )
    }
  }

  private isAsync() {
    return this.checkerPlugin.isWatching && this.checkerPlugin.async
  }

  apply(compiler: webpack.Compiler) {
    const hooks = compiler.hooks as compilation.CompilerHooks & ForkTsCheckerHooks
    // To access plugin hooks and tap into the event, we need to use the getCompilerHooks static method
    const forkTsCheckerHooks = (this.checkerPlugin as ForkTsCheckerWebpackPlugin).constructor.getCompilerHooks(compiler)

    // Steel 'done' hooks of webpack-dev-server.
    hooks.done.intercept({
      register: tap => {
        if (tap.name === 'webpack-dev-server') {
          if (tap.type !== 'sync') {
            throw new Error(
              "webpack-dev-server's done tap is not sync. Please update logic of this plugin."
            )
          }
          this.interceptedDoneTaps.push(tap)
        }
        return tap
      }
    })

    // Reset state on start of compile.
    hooks.compile.tap(NAME, () => {
      this.isCheckerDone = false
      this.lastStats = null
    })

    // emitCallback of fork-ts-checker-webpack-plugin adds compilation.errors/warnings, only in not async mode.
    // We call it even in async mode to add them.
    hooks.emit.tap(NAME, compilation => {
      if (!this.isAsync()) return
      this.checkerPlugin.emitCallback = this.checkerPlugin.createEmitCallback(
        compilation,
        () => this.maybeCallDevServerDone()
      )
    })

    // Then disable emit taps as they are not called in async mode.
    forkTsCheckerHooks.emit.intercept({
      register: tap => conditionalTap(tap, () => !this.isAsync())
    })

    // Memoize stats to send to webpack-dev-server after type check is completed.
    hooks.done.tap(NAME, stats => {
      if (!this.isAsync()) return
      this.lastStats = stats
      this.maybeCallDevServerDone()
    })

    // webpack-dev-server shows overlay without reload when error is reported.
    // This will re-send 'done' event after some type check error is found.
    forkTsCheckerHooks.done.tap(
      NAME,
      (diagnostics, lints, elapsed) => {
        if (!this.isAsync()) return
        if (
          diagnostics.concat(lints).some(message => message.isErrorSeverity())
        ) {
          this.isCheckerDone = true
          this.checkerPlugin.emitCallback()
        }
      }
    )
  }

  private maybeCallDevServerDone() {
    if (this.isCheckerDone && this.lastStats) {
      this.interceptedDoneTaps.forEach(tap => tap.fn(this.lastStats))
    }
  }
}

export = ForkTsCheckerAsyncOverlayWebpackPlugin
