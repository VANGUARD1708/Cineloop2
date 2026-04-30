import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[CineLoop] uncaught render error", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") window.location.assign(import.meta.env.BASE_URL);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={32} className="text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something snapped.</h1>
          <p className="text-sm text-zinc-400 mb-6">
            A scene cut out unexpectedly. We've logged it. Try heading back to the feed — it usually resolves on a reload.
          </p>
          {this.state.error && (
            <pre className="text-[11px] text-zinc-600 bg-zinc-900/50 rounded-md p-3 mb-6 overflow-auto max-h-32 text-left">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.reset}
            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 rounded-md font-bold text-white text-sm transition-all"
          >
            Back to the feed
          </button>
        </div>
      </div>
    );
  }
}
