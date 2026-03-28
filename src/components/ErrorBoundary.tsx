import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream px-4">
          <div className="text-center max-w-md">
            <p className="text-5xl mb-4">😔</p>
            <h1 className="font-display text-2xl font-bold text-espresso">
              Ocurrió un error inesperado
            </h1>
            <p className="text-warm-gray mt-3">
              Lo sentimos, algo salió mal. Por favor intentá de nuevo.
            </p>
            <a
              href="/"
              className="inline-block mt-6 rounded-full bg-dusty-pink text-white px-8 py-3 text-sm font-semibold uppercase tracking-[0.08em] hover:bg-mauve transition-all active:scale-95"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
