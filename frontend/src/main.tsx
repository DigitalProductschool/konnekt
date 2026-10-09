import './index.css';

import { KernContextProvider } from '@kern-ux-annex/kern-react-kit';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App.tsx';
import CurrentUserProvider from './components/CurrentUserProvider';
import { KERN_TRANSLATIONS } from './constants';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <KernContextProvider translations={KERN_TRANSLATIONS}>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </KernContextProvider>
    </BrowserRouter>
  </StrictMode>
);
