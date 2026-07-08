import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './HomePage'
import ProductPage from './ProductPage'
import ScannerPage from './ScannerPage'
import SearchPage from './SearchPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/product/:barcode" element={<ProductPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
