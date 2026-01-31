import { render } from 'preact';
import { App } from './app';
import './styles/global.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - app still works
    });
  });
}

render(<App />, document.getElementById('app')!);
