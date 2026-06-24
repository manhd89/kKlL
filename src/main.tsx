import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe JSON.stringify monkeypatch to prevent any circular structure crashes from third-party libraries or browser instrumentation
(function () {
  const originalStringify = JSON.stringify;
  JSON.stringify = function (value: any, replacer?: any, space?: any): string {
    const seen = new WeakSet();
    const circularReplacer = (key: string, val: any) => {
      if (val && typeof val === "object") {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
        if (typeof Node !== "undefined" && val instanceof Node) {
          return `[DOMElement: ${val.nodeName}]`;
        }
      }
      return val;
    };

    let finalReplacer = circularReplacer;
    if (typeof replacer === "function") {
      finalReplacer = (key: string, val: any) => {
        const simplified = circularReplacer(key, val);
        if (simplified === "[Circular]" || (typeof simplified === "string" && simplified.startsWith("[DOMElement:"))) {
          return simplified;
        }
        return replacer(key, simplified);
      };
    } else if (Array.isArray(replacer)) {
      finalReplacer = (key: string, val: any) => {
        if (key !== "" && !replacer.includes(key)) {
          return undefined;
        }
        return circularReplacer(key, val);
      };
    }

    try {
      return originalStringify(value, finalReplacer, space);
    } catch (err: any) {
      try {
        return originalStringify({ error: "Serialization failed", message: err?.message || String(err) });
      } catch (_) {
        return '"[Unserializable]"';
      }
    }
  };
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register service worker for high-speed client-side HLS proxying and ad-blocking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('HLS AdBlocker Service Worker registered with scope: ', reg.scope);
        // If there's an active worker, check for updates
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New HLS AdBlocker Service Worker content is available; please refresh.');
              }
            });
          }
        });
      })
      .catch(err => {
        console.error('HLS AdBlocker Service Worker registration failed: ', err);
      });
  });
}

