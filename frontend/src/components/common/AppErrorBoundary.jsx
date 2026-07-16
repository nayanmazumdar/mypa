import { Component } from 'react';
import { HiOutlineExclamationTriangle, HiOutlineArrowPath } from 'react-icons/hi2';

/**
 * Global error boundary — catches unhandled JS errors
 * and shows a recovery UI instead of crashing the app.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#e8edf5' }}>
          <div className="max-w-md w-full text-center rounded-3xl p-8"
            style={{ background: '#e8edf5', boxShadow: '8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: '#e8edf5', boxShadow: 'inset 3px 3px 6px #c8cfd8, inset -3px -3px 6px #ffffff' }}>
              <HiOutlineExclamationTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">
              An unexpected error occurred. Your data is safe — try recovering or refreshing the page.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRecover}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 transition-all"
                style={{ background: '#e8edf5', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}
              >
                Try to Recover
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(145deg, #5a4dd4, #4f46e5)', boxShadow: '4px 4px 8px #c8cfd8, -4px -4px 8px #ffffff' }}
              >
                <HiOutlineArrowPath className="w-4 h-4" /> Reload App
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer">Technical details</summary>
                <pre className="mt-2 text-xs text-red-500 bg-red-50 p-3 rounded-lg overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
