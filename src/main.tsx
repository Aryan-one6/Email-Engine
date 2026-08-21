import { Fragment, StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { client } from './lib/appwrite';
import './index.css';

const AppRoot = import.meta.env.DEV ? Fragment : StrictMode;

void client
  .ping()
  .then(() => console.info('[Appwrite] ping successful.'))
  .catch((error: unknown) => console.error('[Appwrite] ping failed.', error));

ReactDOM.createRoot(document.getElementById('app')!).render(
  <AppRoot>
    <AuthProvider>
      <BrowserRouter>
        <App />
        <Toaster
          expand
          position="top-right"
          richColors
          theme="light"
          toastOptions={{
            classNames: {
              toast:
                'border border-slate-300 bg-white text-slate-900 shadow-[0_18px_40px_rgba(74,55,31,0.08)]',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  </AppRoot>,
);
