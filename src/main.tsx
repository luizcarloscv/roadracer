import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      console.log('SW registered:', reg);
      
      // Check for updates periodically
      setInterval(() => {
        try {
          reg.update().catch(err => console.debug('SW update check failed:', err));
        } catch (e) {
          console.debug('SW update check error:', e);
        }
      }, 60 * 60 * 1000); // Check every hour

      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content available; please refresh.');
                // We could show a toast here to ask the user to refresh
              }
            }
          };
        }
      };
    }).catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

import { toast, Toaster } from 'sonner';

// Global error handling for debugging white screens
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global JS Error:', { message, source, lineno, colno, error });
  // If it's a critical error during load, we might want to show a message
  if (document.getElementById('root')?.innerHTML === '') {
    document.getElementById('root')!.innerHTML = `
      <div style="background: #0a0a0a; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; padding: 20px; text-align: center;">
        <h1 style="color: #dc2626; font-style: italic; font-weight: 900; text-transform: uppercase;">Erro de Carregamento</h1>
        <p style="color: #525252; font-size: 14px;">Ocorreu um erro ao iniciar o aplicativo. Tente recarregar a página.</p>
        <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; margin-top: 20px; cursor: pointer;">RECARREGAR</button>
        <pre style="font-size: 10px; color: #262626; margin-top: 40px; max-width: 100%; overflow: auto;">${message}</pre>
      </div>
    `;
  }
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  const reason = event.reason;
  
  // Ignore benign WebSocket errors from Vite/HMR
  if (typeof reason === 'string' && reason.includes('WebSocket closed without opened')) {
    return;
  }
  if (reason && typeof reason === 'object' && reason.message && reason.message.includes('WebSocket closed without opened')) {
    return;
  }

  let message = 'Erro desconhecido ou vazio';
  let code = '';
  let stack = '';

  if (!reason) {
    message = 'Promessa rejeitada sem motivo (null/undefined)';
  } else if (reason instanceof Error) {
    message = reason.message;
    stack = reason.stack || '';
  } else if (typeof reason === 'object') {
    code = reason.code || reason.errorCode || '';
    message = reason.message || JSON.stringify(reason);
    stack = reason.stack || '';
  } else {
    message = String(reason);
  }

  toast.error(
    <div className="space-y-2 text-left">
      <p className="font-bold text-red-500">Erro de Promessa Não Tratada</p>
      {code && <p className="text-xs font-mono bg-red-950/30 p-1 rounded">Código: {code}</p>}
      <p className="text-sm leading-tight">{message}</p>
      {stack && (
        <details className="mt-2">
          <summary className="text-[10px] cursor-pointer opacity-50">Ver Stack Trace</summary>
          <pre className="text-[8px] opacity-40 overflow-auto max-h-32 mt-1 p-2 bg-black/50 rounded">
            {stack}
          </pre>
        </details>
      )}
    </div>,
    { duration: 10000 }
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster position="top-center" richColors />
    <App />
  </StrictMode>,
);
