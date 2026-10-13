import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'normalize.css';

// hydrateRoot (not createRoot): the skeleton in index.html is byte-identical
// to App's output, so React ADOPTS the existing DOM instead of destroying and
// rebuilding it. The profile images are never torn down on mount — no blank
// window, no flash, regardless of load order or frame timing.
const rootEl = document.getElementById('root')!;

ReactDOM.hydrateRoot(
  rootEl,
  <React.StrictMode>
    <App />
  </React.StrictMode>
);