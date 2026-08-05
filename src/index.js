import React from 'react';
import ReactDOM from 'react-dom/client';

// ============================================
// FUENTE POPPINS (oficial IMC según manual)
// ============================================
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

// ============================================
// TOKENS V2 - Sistema de diseño IMC (04/08/2026)
// ============================================
import './styles/base-v2.css';
import './styles/v2.css';
import './styles/colors-v2.css';
import './styles/fonts-v2.css';
import './styles/typography-v2.css';
import './styles/spacing-v2.css';
import './styles/brand-v2.css';
import './styles/v2-aliases.css';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
