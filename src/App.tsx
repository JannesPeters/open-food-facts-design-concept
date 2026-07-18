import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ScrollToTop from '@/components/ScrollToTop'

const HomePage = lazy(() => import('./HomePage'))
const LoginPage = lazy(() => import('./LoginPage'))
const ProfilePage = lazy(() => import('./ProfilePage'))
const ProductPage = lazy(() => import('./ProductPage'))
const PricesPage = lazy(() => import('./PricesPage'))
const ProducersPage = lazy(() => import('./ProducersPage'))
const ProPage = lazy(() => import('./ProPage'))
const ScannerPage = lazy(() => import('./ScannerPage'))
const SearchPage = lazy(() => import('./SearchPage'))

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<div className="min-h-dvh bg-background" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/producers" element={<ProducersPage />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="/product/:barcode" element={<ProductPage />} />
          <Route path="/product/:barcode/prices" element={<PricesPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
