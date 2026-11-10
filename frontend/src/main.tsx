import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App.tsx';
import CurrentUserProvider from './components/CurrentUserProvider';
import LanguageProvider from './components/LanguageProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Renders the kit's KernContextProvider with its texts in the website's language */}
      <LanguageProvider>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);
