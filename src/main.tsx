import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PreferencesProvider } from './contexts/PreferencesContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </ErrorBoundary>
);
