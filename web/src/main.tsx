import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/reset.css';
import './styles/variables.css';
import './styles/nes-theme.css';

// Stable viewport height — set once on load so the address bar
// showing/hiding on mobile never causes layout shifts.
document.documentElement.style.setProperty(
  '--app-h',
  `${window.visualViewport?.height ?? window.innerHeight}px`,
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
