import { Component } from 'react'

/**
 * Last line of defence around the whole app.
 *
 * Without this, any render-time exception unmounts the tree and leaves a blank
 * white page with no indication anything went wrong — which is exactly what
 * happened during development when a helper was referenced across a module
 * boundary without being exported. A blank page is the worst possible failure
 * for a daily game: players assume it's broken forever rather than retrying.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep the detail in the console for anyone who opens devtools to report it.
    console.error('Swing IQ crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stone-50 px-6 text-center dark:bg-stone-950">
        <h1 className="text-lg font-extrabold uppercase tracking-[0.18em] text-stone-900 dark:text-stone-100">
          Swing<span className="text-emerald-600"> IQ</span>
        </h1>
        <p className="max-w-xs text-sm text-stone-600 dark:text-stone-400">
          Something went wrong loading today&apos;s puzzle. Your streak is safe — it&apos;s
          stored on this device.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          Reload
        </button>
      </div>
    )
  }
}
