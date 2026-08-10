import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initErrorLogger } from './utils/errorLogger'
import { Toaster } from './components/ui/sonner'
import { useTheme } from './hooks/useTheme'

// Initialize global error catching
initErrorLogger();

// Initialize theme (sync with anti-flash script)
useTheme.getState().initTheme();

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster position="top-center" richColors />
  </>
)
