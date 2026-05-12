import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[quickcheck-ui] Render error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
          <div className="max-w-lg rounded-2xl border border-white/10 bg-white/[0.06] p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-300" size={22} />
              <p className="text-lg font-black">QuickCheck recovered from a UI error</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Refresh the page to continue. The backend state was not changed by this screen error.
            </p>
            <button
              className="mt-5 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950"
              type="button"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
