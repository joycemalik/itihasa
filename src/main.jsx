import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SceneProvider } from './context/SceneContext'

import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SceneProvider>
        <App />
      </SceneProvider>
    </BrowserRouter>
  </StrictMode>,
)
