import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ToastProvider } from './Context/ToastContext.jsx'
import { AuthProvider } from './Context/AuthContext.jsx' 
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
        <ToastProvider>
          <AuthProvider> {/* 2. Wrap your app with AuthProvider */}
            <BrowserRouter basename={import.meta.env.VITE_BASENAME}>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
    </HelmetProvider>
  </StrictMode>,
)