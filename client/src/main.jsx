import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { DuckProvider } from './context/DuckContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DuckProvider>
      <App />
    </DuckProvider>
  </React.StrictMode>
)
