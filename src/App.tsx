import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './HomePage'
import ScannerPage from './ScannerPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scanner" element={<ScannerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
