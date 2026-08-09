import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './app/AuthProvider'
import { QueryProvider } from './app/QueryProvider'
import { Router } from './app/Router'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <ErrorBoundary>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </ErrorBoundary>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
