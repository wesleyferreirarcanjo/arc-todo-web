import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation } from 'framer-motion';
import App from './App';
import { getTheme } from './lib/storage/appStorage';
import './index.css';

document.documentElement.dataset.theme = getTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <App />
    </LazyMotion>
  </StrictMode>,
);
