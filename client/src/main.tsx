import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

window.addEventListener('error', (event) => {
 console.error('Global Error Listener:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
 console.error('Global Unhandled Rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
 <StrictMode>
  <App />
 </StrictMode>,
)
