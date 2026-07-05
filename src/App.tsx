import type { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { downloadRecordsCsv } from './lib/csv'
import { fetchProductDetails } from './lib/openFoodFacts'
import { listSavedRecords, saveRecord } from './lib/storage'
import type { ProductDetails, SavedProductRecord } from './types'

const cameraSupported =
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function'

const sanitizeBarcode = (value: string) => value.replace(/[^\d]/g, '')

const createRecordId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const formatPrice = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const toPriceNumber = (value: string) => Number(value.replace(',', '.'))

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

function App() {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lookupStatus, setLookupStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [lookupMessage, setLookupMessage] = useState(
    'Scan a barcode or type one in manually to begin.',
  )
  const [scannerStatus, setScannerStatus] = useState<
    'idle' | 'starting' | 'active' | 'error'
  >('idle')
  const [scannerMessage, setScannerMessage] = useState(
    cameraSupported
      ? 'Use the camera to scan a barcode, or fall back to manual entry below.'
      : 'Camera scanning is not available here, so use manual barcode entry instead.',
  )
  const [currentProduct, setCurrentProduct] = useState<ProductDetails | null>(
    null,
  )
  const [priceInput, setPriceInput] = useState('')
  const [history, setHistory] = useState<SavedProductRecord[]>([])
  const [saveMessage, setSaveMessage] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)
  const scanHandledRef = useRef(false)
  const lookupRequestRef = useRef(0)

  const clearVideoPreview = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    video.pause()

    const stream = video.srcObject
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) {
        track.stop()
      }
    }

    video.srcObject = null
  }, [])

  const releaseScanner = useCallback(() => {
    scanHandledRef.current = false
    scannerControlsRef.current?.stop()
    scannerControlsRef.current = null
    clearVideoPreview()
  }, [clearVideoPreview])

  const loadSavedHistory = useCallback(async () => {
    const records = await listSavedRecords()
    setHistory(records)
  }, [])

  useEffect(() => {
    void loadSavedHistory()
  }, [loadSavedHistory])

  useEffect(
    () => () => {
      releaseScanner()
    },
    [releaseScanner],
  )

  const lookupProduct = useCallback(async (rawBarcode: string) => {
    const barcode = sanitizeBarcode(rawBarcode)
    if (!barcode) {
      setLookupStatus('error')
      setCurrentProduct(null)
      setLookupMessage('Enter digits only for the barcode lookup.')
      return
    }

    lookupRequestRef.current += 1
    const requestId = lookupRequestRef.current

    setBarcodeInput(barcode)
    setCurrentProduct(null)
    setPriceInput('')
    setSaveMessage('')
    setLookupStatus('loading')
    setLookupMessage(`Looking up ${barcode} in Open Food Facts...`)

    try {
      const product = await fetchProductDetails(barcode)
      if (requestId !== lookupRequestRef.current) {
        return
      }

      setCurrentProduct(product)
      setLookupStatus('ready')
      setLookupMessage(
        product.isProductFound
          ? 'Product loaded. Confirm the price before saving.'
          : 'No Open Food Facts match found. You can still save the barcode with a price.',
      )
    } catch (error) {
      if (requestId !== lookupRequestRef.current) {
        return
      }

      setLookupStatus('error')
      setCurrentProduct(null)
      setLookupMessage(getErrorMessage(error))
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (!cameraSupported) {
      setScannerStatus('error')
      setScannerMessage(
        'Camera scanning is unavailable in this browser or context. Use manual entry below.',
      )
      return
    }

    if (!videoRef.current) {
      setScannerStatus('error')
      setScannerMessage('The camera preview could not be prepared. Reload and try again.')
      return
    }

    releaseScanner()
    setScannerStatus('starting')
    setScannerMessage('Requesting camera access...')
    setSaveMessage('')

    try {
      if (!scannerReaderRef.current) {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        scannerReaderRef.current = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 900,
        })
      }

      const controls = await scannerReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, activeControls) => {
          if (result && !scanHandledRef.current) {
            scanHandledRef.current = true
            const detectedBarcode = sanitizeBarcode(result.getText())
            activeControls.stop()
            scannerControlsRef.current = null
            clearVideoPreview()
            setScannerStatus('idle')
            setScannerMessage(`Captured barcode ${detectedBarcode}.`)
            void lookupProduct(detectedBarcode)
          }
        },
      )

      scannerControlsRef.current = controls
      setScannerStatus('active')
      setScannerMessage('Point the camera at a barcode to scan.')
    } catch (error) {
      releaseScanner()
      setScannerStatus('error')
      setScannerMessage(
        `Camera access failed: ${getErrorMessage(error)} Use manual entry below.`,
      )
    }
  }, [clearVideoPreview, lookupProduct, releaseScanner])

  const stopScanner = useCallback(() => {
    releaseScanner()
    setScannerStatus('idle')
    setScannerMessage('Camera stopped. You can restart it whenever you need it.')
  }, [releaseScanner])

  const handleLookupSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void lookupProduct(barcodeInput)
    },
    [barcodeInput, lookupProduct],
  )

  const handleSave = useCallback(async () => {
    if (!currentProduct) {
      setSaveMessage('Look up a product before saving.')
      return
    }

    const parsedPrice = toPriceNumber(priceInput)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setSaveMessage('Enter a valid non-negative price before saving.')
      return
    }

    const record: SavedProductRecord = {
      ...currentProduct,
      id: createRecordId(),
      savedAt: new Date().toISOString(),
      price: Math.round(parsedPrice * 100) / 100,
    }

    await saveRecord(record)
    setHistory((previousHistory) =>
      [record, ...previousHistory].sort((left, right) =>
        right.savedAt.localeCompare(left.savedAt),
      ),
    )
    setCurrentProduct(null)
    setBarcodeInput('')
    setPriceInput('')
    setLookupStatus('idle')
    setLookupMessage('Saved locally. Scan the next product when you are ready.')
    setSaveMessage(`Saved ${record.name ?? 'item'} for ${formatPrice(record.price)}.`)
  }, [currentProduct, priceInput])

  const historyCountLabel = useMemo(
    () => `${history.length} saved ${history.length === 1 ? 'item' : 'items'}`,
    [history.length],
  )

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Food scanner MVP</p>
          <h1>Scan barcodes, add prices, and keep your own product history.</h1>
          <p className="hero-copy">
            This mobile-first app pulls product details from Open Food Facts,
            stores your saved items in the browser, and exports everything as a
            CSV when you need it.
          </p>
        </div>
        <div className="hero-stats">
          <strong>{historyCountLabel}</strong>
          <span>Saved locally on this device</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">1. Scan or enter a barcode</p>
            <h2>Capture a product</h2>
          </div>
          <span
            className={`status-pill status-pill--${scannerStatus === 'active' ? 'good' : scannerStatus === 'error' ? 'bad' : 'neutral'}`}
          >
            {scannerStatus === 'active'
              ? 'Camera live'
              : scannerStatus === 'starting'
                ? 'Starting camera'
                : scannerStatus === 'error'
                  ? 'Camera unavailable'
                  : 'Camera idle'}
          </span>
        </div>

        <div className="scanner-preview">
          <video ref={videoRef} className="scanner-video" muted playsInline />
          {scannerStatus !== 'active' && (
            <div className="scanner-overlay">
              <p>{scannerMessage}</p>
            </div>
          )}
        </div>

        <div className="scanner-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => void startScanner()}
            disabled={scannerStatus === 'starting'}
          >
            {scannerStatus === 'active' ? 'Restart camera' : 'Start camera'}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={stopScanner}
            disabled={scannerStatus !== 'active'}
          >
            Stop camera
          </button>
        </div>

        <form className="manual-form" onSubmit={handleLookupSubmit}>
          <label className="field">
            <span>Manual barcode entry</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Example: 3017620422003"
              value={barcodeInput}
              onChange={(event) =>
                setBarcodeInput(sanitizeBarcode(event.target.value))
              }
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={lookupStatus === 'loading'}
          >
            {lookupStatus === 'loading' ? 'Looking up…' : 'Lookup product'}
          </button>
        </form>

        <p
          className={`helper-text helper-text--${lookupStatus === 'error' ? 'error' : 'default'}`}
        >
          {lookupMessage}
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">2. Review product details</p>
            <h2>Confirm before saving</h2>
          </div>
        </div>

        {currentProduct ? (
          <article className="product-card">
            <div className="product-card__header">
              <div>
                <p className="product-card__barcode">{currentProduct.barcode}</p>
                <h3>
                  {currentProduct.name ??
                    (currentProduct.isProductFound
                      ? 'Unnamed Open Food Facts product'
                      : 'Unknown product')}
                </h3>
                <p className="product-card__subtitle">
                  {currentProduct.isProductFound
                    ? currentProduct.brands ?? 'Brand unavailable'
                    : 'No matching product data was found.'}
                </p>
              </div>

              {currentProduct.imageUrl ? (
                <img
                  className="product-card__image"
                  src={currentProduct.imageUrl}
                  alt={currentProduct.name ?? 'Scanned product'}
                />
              ) : (
                <div className="product-card__image product-card__image--placeholder">
                  No image
                </div>
              )}
            </div>

            <div className="product-grid">
              <section className="detail-card">
                <h4>Ingredients</h4>
                <p>
                  {currentProduct.ingredients ??
                    'No ingredients were provided by Open Food Facts for this barcode.'}
                </p>
              </section>

              <section className="detail-card">
                <h4>Key nutrients per 100g</h4>
                <dl className="nutrient-grid">
                  {currentProduct.nutrients.map((nutrient) => (
                    <div key={nutrient.id}>
                      <dt>{nutrient.label}</dt>
                      <dd>
                        {nutrient.value !== null
                          ? `${nutrient.value} ${nutrient.unit}`
                          : 'Unavailable'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <div className="price-row">
              <label className="field">
                <span>Price</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="2.49"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="button button--primary"
                onClick={() => void handleSave()}
              >
                Save item locally
              </button>
            </div>

            {saveMessage && <p className="helper-text">{saveMessage}</p>}
          </article>
        ) : (
          <div className="empty-state">
            <p>
              Scan or look up a barcode first. Product details and the price
              field will appear here.
            </p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">3. Saved history</p>
            <h2>Browse and export your items</h2>
          </div>

          <button
            type="button"
            className="button button--secondary"
            onClick={() => downloadRecordsCsv(history)}
            disabled={history.length === 0}
          >
            Export CSV
          </button>
        </div>

        {history.length > 0 ? (
          <div className="history-list">
            {history.map((record) => (
              <article key={record.id} className="history-card">
                <div className="history-card__top">
                  <div>
                    <h3>{record.name ?? 'Unknown product'}</h3>
                    <p>{record.barcode}</p>
                  </div>
                  <strong>{formatPrice(record.price)}</strong>
                </div>
                <p className="history-card__meta">{formatTimestamp(record.savedAt)}</p>
                <p className="history-card__ingredients">
                  {record.ingredients ??
                    'No ingredients were stored for this product.'}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No saved items yet. Your history will stay on this device.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
