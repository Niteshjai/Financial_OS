import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initErrorLogger } from './utils/errorLogger'

// Initialize global error catching
initErrorLogger();

createRoot(document.getElementById('root')!).render(
  <App />,
)
