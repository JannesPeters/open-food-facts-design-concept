import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const HomePage = lazy(() => import('./HomePage'))
const ProductPage = lazy(() => import('./ProductPage'))
const ProducersPage = lazy(() => import('./ProducersPage'))
const ProPage = lazy(() => import('./ProPage'))
const ScannerPage = lazy(() => import('./ScannerPage'))
const SearchPage = lazy(() => import('./SearchPage'))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-dvh bg-background" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/producers" element={<ProducersPage />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="/product/:barcode" element={<ProductPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
