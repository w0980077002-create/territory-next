import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NextApp } from './NextApp';

// Intentionally no imports from the old App, Supabase, Telegram authentication,
// cloud-save, wallets, or admin panel. This is a completely separate V2 client.
const mountPoint = document.getElementById('root');
if (!mountPoint) throw new Error('TERRITORY 2.0 root element not found');
createRoot(mountPoint).render(<StrictMode><NextApp /></StrictMode>);
