import { Component } from 'react';
import { HiOutlineExclamationTriangle, HiOutlineArrowPath } from 'react-icons/hi2';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#e8edf5" }}>
          <div className="rounded-2xl p-8 max-w-lg w-full text-center" style={{ background: "#e8edf5", boxShadow: "8px 8px 16px #c8cfd8, -8px -8px 16px #ffffff" }}>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <HiOutlineExclamationTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-500 mb-6">
              Something unexpected happened. This is usually a temporary issue.
            </p>

            <div className="flex gap-3 justify-center mb-6">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <HiOutlineArrowPath className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>

            <details className="text-left rounded-xl p-3 text-xs text-gray-500" style={{ background: "#e8edf5", boxShadow: "inset 2px 2px 4px #c8cfd8, inset -2px -2px 4px #ffffff" }}>
              <summary className="cursor-pointer font-medium text-gray-600">Technical Details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
