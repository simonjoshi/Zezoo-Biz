import {StrictMode, Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{children: any}, {error: any}> {
  state = { error: null };
  static getDerivedStateFromError(e: any) { return { error: e }; }
  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div style={{padding:32,fontFamily:'monospace',background:'#fff',color:'#c00'}}>
          <h2>App crashed</h2>
          <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
            {err?.message || String(err)}
            {err?.stack ? '

' + err.stack : ''}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
