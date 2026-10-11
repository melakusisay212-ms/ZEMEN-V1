import { createRoot } from 'react-dom/client';
import '@fontsource-variable/urbanist';
import App from './App.tsx';
import { applyTheme, getSettings } from './lib/settings.ts';
import './styles.css';

applyTheme(getSettings().theme);

// Ask the WebView to keep our IndexedDB data even when storage is low.
void navigator.storage?.persist?.();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(<App />);
