import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProviders } from '@/components/auth/AuthProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProviders>
      <App />
    </AuthProviders>
  </StrictMode>,
)
