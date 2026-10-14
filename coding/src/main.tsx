import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './shared/styles/tokens.css';
import './features/ui/cosmosLook.css';
import './features/ui/halftone.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker is optional for browser notifications
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
