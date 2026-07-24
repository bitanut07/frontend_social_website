import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Không tìm thấy phần tử gốc của ứng dụng.')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
