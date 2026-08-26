import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { FocusProvider } from './state'
import './focus.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FocusProvider>
      <App/>
    </FocusProvider>
  </StrictMode>,
)
