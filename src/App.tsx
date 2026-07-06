import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
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

const toOptionalNumber = (value: string) => {
  const normalizedValue = value.replace(',', '.').trim()
  if (!normalizedValue) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const initialLookupMessage = 'Scan a barcode or type one in manually to begin.'
const initialScannerMessage = cameraSupported
  ? 'Use the camera to scan a barcode, or fall back to manual entry below.'
  : 'Camera scanning is not available here, so use manual barcode entry instead.'

const customShopOption = 'Custom'
const shopOptions = [
  'Lidl',
  'Rewe',
  'Penny',
  'DM',
  'Rossmann',
  'Edeka',
  'Aldi Nord',
  'Denns Biomarkt',
  'Bio Company',
  customShopOption,
] as const

const getSelectedShopName = (selectedShop: string, customShopName: string) =>
  selectedShop === customShopOption ? customShopName.trim() : selectedShop

const getShopSelectionState = (shop: string | null | undefined) => {
  const normalizedShop = shop?.trim() ?? ''

  if (!normalizedShop) {
    return {
      selectedShop: '',
      customShopName: '',
    }
  }

  if (shopOptions.includes(normalizedShop as (typeof shopOptions)[number])) {
    return {
      selectedShop: normalizedShop,
      customShopName: '',
    }
  }

  return {
    selectedShop: customShopOption,
    customShopName: normalizedShop,
  }
}

const cloneProductDetails = (product: ProductDetails): ProductDetails => ({
  barcode: product.barcode,
  name: product.name,
  ingredients: product.ingredients,
  brands: product.brands,
  imageUrl: product.imageUrl,
  nutrients: product.nutrients.map((nutrient) => ({ ...nutrient })),
  isProductFound: product.isProductFound,
})

const getProductComparisonSignature = (product: ProductDetails) =>
  JSON.stringify({
    barcode: product.barcode.trim(),
    name: product.name?.trim() ?? '',
    ingredients: product.ingredients?.trim() ?? '',
    brands: product.brands?.trim() ?? '',
    imageUrl: product.imageUrl?.trim() ?? '',
    nutrients: product.nutrients.map((nutrient) => ({
      id: nutrient.id,
      value: nutrient.value,
      text: nutrient.text?.trim() ?? '',
    })),
  })

const parseEnergyText = (value: string | null | undefined) => {
  const [kilojoulesPart = '', kilocaloriesPart = ''] = (value ?? '')
    .split('/')
    .map((part) => part.trim())

  return {
    kilojoules: kilojoulesPart.replace(/\s*kJ$/u, ''),
    kilocalories: kilocaloriesPart.replace(/\s*kcal$/u, ''),
  }
}

const formatEnergyText = (kilojoules: string, kilocalories: string) => {
  const parts: string[] = []
  const normalizedKilojoules = kilojoules.trim()
  const normalizedKilocalories = kilocalories.trim()

  if (normalizedKilojoules) {
    parts.push(`${normalizedKilojoules} kJ`)
  }
  if (normalizedKilocalories) {
    parts.push(`${normalizedKilocalories} kcal`)
  }

  return parts.join(' / ')
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

const getPageFromLocation = () =>
  typeof window !== 'undefined' && window.location.hash === '#product'
    ? 'product'
    : 'capture'

function App() {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [lookupStatus, setLookupStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [lookupMessage, setLookupMessage] = useState(initialLookupMessage)
  const [scannerStatus, setScannerStatus] = useState<
    'idle' | 'starting' | 'active' | 'error'
  >('idle')
  const [scannerMessage, setScannerMessage] = useState(initialScannerMessage)
  const [currentProduct, setCurrentProduct] = useState<ProductDetails | null>(null)
  const [productReference, setProductReference] = useState<ProductDetails | null>(
    null,
  )
  const [priceInput, setPriceInput] = useState('')
  const [history, setHistory] = useState<SavedProductRecord[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [selectedShop, setSelectedShop] = useState('')
  const [customShopName, setCustomShopName] = useState('')
  const [offDataFaulty, setOffDataFaulty] = useState(false)
  const [isDetailsEditMode, setIsDetailsEditMode] = useState(false)
  const [currentPage, setCurrentPage] = useState<'capture' | 'product'>(
    getPageFromLocation,
  )

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)
  const scanHandledRef = useRef(false)
  const lookupRequestRef = useRef(0)

  const activeShopName = useMemo(
    () => getSelectedShopName(selectedShop, customShopName),
    [customShopName, selectedShop],
  )

  const hasProductOverrides = useMemo(() => {
    if (!currentProduct || !productReference) {
      return false
    }

    return (
      getProductComparisonSignature(currentProduct) !==
      getProductComparisonSignature(productReference)
    )
  }, [currentProduct, productReference])

  const offDataFaultyMarkerVisible = useMemo(
    () => offDataFaulty || hasProductOverrides,
    [hasProductOverrides, offDataFaulty],
  )

  const loadSavedHistory = useCallback(async () => {
    const records = await listSavedRecords()
    setHistory(records)
  }, [])

  useEffect(() => {
    void loadSavedHistory()
  }, [loadSavedHistory])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncCurrentPage = () => {
      setCurrentPage(getPageFromLocation())
    }

    window.addEventListener('hashchange', syncCurrentPage)
    window.addEventListener('popstate', syncCurrentPage)

    return () => {
      window.removeEventListener('hashchange', syncCurrentPage)
      window.removeEventListener('popstate', syncCurrentPage)
    }
  }, [])

  const navigateToPage = useCallback((page: 'capture' | 'product') => {
    setCurrentPage(page)

    if (typeof window === 'undefined') {
      return
    }

    const nextUrl =
      page === 'product'
        ? `${window.location.pathname}${window.location.search}#product`
        : `${window.location.pathname}${window.location.search}`

    window.history.pushState({ page }, '', nextUrl)
  }, [])

  useEffect(() => {
    if (currentPage === 'product' || currentProduct) {
      return
    }

    if (typeof window !== 'undefined' && window.location.hash === '#product') {
      window.history.replaceState(
        { page: 'capture' },
        '',
        `${window.location.pathname}${window.location.search}`,
      )
    }
  }, [currentPage, currentProduct])

  const clearVideoStream = useCallback(() => {
    const videoElement = videoRef.current
    const activeStream = videoElement?.srcObject

    if (activeStream instanceof MediaStream) {
      activeStream.getTracks().forEach((track) => {
        track.stop()
      })
    }

    if (videoElement) {
      videoElement.srcObject = null
    }
  }, [])

  const stopScanner = useCallback(
    (nextStatus: 'idle' | 'error' = 'idle', nextMessage = initialScannerMessage) => {
      scanHandledRef.current = false
      scannerControlsRef.current?.stop()
      scannerControlsRef.current = null
      scannerReaderRef.current = null
      clearVideoStream()
      setScannerStatus(nextStatus)
      setScannerMessage(nextMessage)
    },
    [clearVideoStream],
  )

  useEffect(() => () => stopScanner(), [stopScanner])

  const resetProductFlow = useCallback(() => {
    setCurrentProduct(null)
    setProductReference(null)
    setPriceInput('')
    setEditingRecordId(null)
    setOffDataFaulty(false)
    setIsDetailsEditMode(false)
  }, [])

  const handleLookupProduct = useCallback(
    async (rawBarcode: string) => {
      const barcode = sanitizeBarcode(rawBarcode)

      if (!barcode) {
        setLookupStatus('error')
        setLookupMessage('Enter a barcode before looking it up.')
        return
      }

      const requestId = lookupRequestRef.current + 1
      lookupRequestRef.current = requestId

      setBarcodeInput(barcode)
      setLookupStatus('loading')
      setLookupMessage('Looking up barcode…')
      setSaveMessage('')

      try {
        const product = await fetchProductDetails(barcode)

        if (lookupRequestRef.current !== requestId) {
          return
        }

        setCurrentProduct(product)
        setProductReference(cloneProductDetails(product))
        setPriceInput('')
        setEditingRecordId(null)
        setOffDataFaulty(false)
        setIsDetailsEditMode(false)
        setLookupStatus('ready')
        setLookupMessage(
          product.isProductFound
            ? 'Product loaded. Confirm the shop and price, or use Edit details if Open Food Facts is wrong.'
            : 'No Open Food Facts match found. You can still complete the details manually and save the barcode with a price.',
        )
        navigateToPage('product')
      } catch (error) {
        if (lookupRequestRef.current !== requestId) {
          return
        }

        setLookupStatus('error')
        setLookupMessage(getErrorMessage(error))
      }
    },
    [navigateToPage],
  )

  const startScanner = useCallback(async () => {
    if (!cameraSupported) {
      setScannerStatus('error')
      setScannerMessage(initialScannerMessage)
      return
    }

    if (!videoRef.current) {
      setScannerStatus('error')
      setScannerMessage('Camera preview could not be prepared.')
      return
    }

    stopScanner()
    setScannerStatus('starting')
    setScannerMessage('Starting camera…')
    setSaveMessage('')

    const reader = new BrowserMultiFormatReader()
    scannerReaderRef.current = reader
    scanHandledRef.current = false

    try {
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error, activeControls) => {
          if (result && !scanHandledRef.current) {
            const scannedBarcode = sanitizeBarcode(result.getText())

            if (!scannedBarcode) {
              return
            }

            scanHandledRef.current = true
            activeControls.stop()
            scannerControlsRef.current = null
            clearVideoStream()
            setScannerStatus('idle')
            setScannerMessage(`Scanned ${scannedBarcode}.`)
            void handleLookupProduct(scannedBarcode)
            return
          }

          if (
            error &&
            error.name !== 'NotFoundException' &&
            scannerStatus !== 'error'
          ) {
            setScannerStatus('error')
            setScannerMessage(getErrorMessage(error))
          }
        },
      )

      scannerControlsRef.current = controls
      setScannerStatus('active')
      setScannerMessage('Point the camera at a barcode.')
    } catch (error) {
      stopScanner('error', getErrorMessage(error))
    }
  }, [clearVideoStream, handleLookupProduct, scannerStatus, stopScanner])

  const handleLookupSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleLookupProduct(barcodeInput)
    },
    [barcodeInput, handleLookupProduct],
  )

  const updateProductField = useCallback(
    (
      field: 'barcode' | 'name' | 'ingredients' | 'brands' | 'imageUrl',
      value: string,
    ) => {
      setCurrentProduct((previousProduct) => {
        if (!previousProduct) {
          return previousProduct
        }

        return {
          ...previousProduct,
          [field]: field === 'barcode' ? sanitizeBarcode(value) : value || null,
        }
      })
      setSaveMessage('')
    },
    [],
  )

  const updateNutrientValue = useCallback(
    (nutrientId: string, value: string, part: 'value' | 'kj' | 'kcal') => {
      setCurrentProduct((previousProduct) => {
        if (!previousProduct) {
          return previousProduct
        }

        return {
          ...previousProduct,
          nutrients: previousProduct.nutrients.map((nutrient) => {
            if (nutrient.id !== nutrientId) {
              return nutrient
            }

            if (nutrientId === 'energy') {
              const energyParts = parseEnergyText(nutrient.text)
              const nextKilojoules =
                part === 'kj' ? value : energyParts.kilojoules
              const nextKilocalories =
                part === 'kcal' ? value : energyParts.kilocalories

              return {
                ...nutrient,
                value: toOptionalNumber(nextKilocalories),
                text:
                  formatEnergyText(nextKilojoules, nextKilocalories) || null,
              }
            }

            return {
              ...nutrient,
              value: toOptionalNumber(value),
              text: null,
            }
          }),
        }
      })
      setSaveMessage('')
    },
    [],
  )

  const handleStartProductEdit = useCallback(() => {
    setIsDetailsEditMode(true)
    setSaveMessage('')
  }, [])

  const handleCancelProductEdit = useCallback(() => {
    if (!productReference) {
      setIsDetailsEditMode(false)
      return
    }

    setCurrentProduct(cloneProductDetails(productReference))
    setIsDetailsEditMode(false)
    setSaveMessage('')
  }, [productReference])

  const handleEditRecord = useCallback(
    (record: SavedProductRecord) => {
      const product: ProductDetails = {
        barcode: record.barcode,
        name: record.name,
        ingredients: record.ingredients,
        brands: record.brands,
        imageUrl: record.imageUrl,
        nutrients: record.nutrients.map((nutrient) => ({ ...nutrient })),
        isProductFound: record.isProductFound,
      }

      const shopSelection = getShopSelectionState(record.shop)

      setCurrentProduct(product)
      setProductReference(cloneProductDetails(product))
      setPriceInput(String(record.price))
      setEditingRecordId(record.id)
      setSelectedShop(shopSelection.selectedShop)
      setCustomShopName(shopSelection.customShopName)
      setOffDataFaulty(record.offDataFaulty)
      setIsDetailsEditMode(true)
      setLookupStatus('ready')
      setLookupMessage('Editing saved item. Update any field and save your changes.')
      setSaveMessage('')
      navigateToPage('product')
    },
    [navigateToPage],
  )

  const handleCancelEdit = useCallback(() => {
    resetProductFlow()
    setLookupStatus('idle')
    setLookupMessage(initialLookupMessage)
    setSaveMessage('')
    navigateToPage('capture')
  }, [navigateToPage, resetProductFlow])

  const handleSave = useCallback(async () => {
    if (!currentProduct) {
      return
    }

    const normalizedPrice = toPriceNumber(priceInput)
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      setSaveMessage('Enter a valid price before saving.')
      return
    }

    if (!activeShopName) {
      setSaveMessage('Choose a shop before saving.')
      return
    }

    const existingRecord = editingRecordId
      ? history.find((record) => record.id === editingRecordId) ?? null
      : null

    const record: SavedProductRecord = {
      id: editingRecordId ?? createRecordId(),
      barcode: currentProduct.barcode.trim(),
      name: currentProduct.name?.trim() || null,
      ingredients: currentProduct.ingredients?.trim() || null,
      brands: currentProduct.brands?.trim() || null,
      imageUrl: currentProduct.imageUrl?.trim() || null,
      nutrients: currentProduct.nutrients.map((nutrient) => ({ ...nutrient })),
      isProductFound: currentProduct.isProductFound,
      price: normalizedPrice,
      savedAt: existingRecord?.savedAt ?? new Date().toISOString(),
      shop: activeShopName,
      offDataFaulty: offDataFaultyMarkerVisible,
    }

    await saveRecord(record)

    setHistory((previousHistory) =>
      [record, ...previousHistory.filter((entry) => entry.id !== record.id)].sort(
        (left, right) => right.savedAt.localeCompare(left.savedAt),
      ),
    )

    const isEditing = Boolean(editingRecordId)

    resetProductFlow()
    setLookupStatus('idle')
    setLookupMessage(
      isEditing
        ? 'Saved changes locally. Select another item or scan the next product when you are ready.'
        : 'Saved locally. Scan the next product when you are ready.',
    )
    setSaveMessage(
      `${isEditing ? 'Updated' : 'Saved'} ${record.name ?? 'item'} at ${record.shop} for ${formatPrice(record.price)}.`,
    )
    setBarcodeInput('')
    navigateToPage('capture')
  }, [
    activeShopName,
    currentProduct,
    editingRecordId,
    history,
    navigateToPage,
    offDataFaultyMarkerVisible,
    priceInput,
    resetProductFlow,
  ])

  const renderShopPicker = () => (
    <div className="shop-picker">
      <label className="field">
        <span>Shop</span>
        <select
          value={selectedShop}
          onChange={(event) => {
            setSelectedShop(event.target.value)
            if (event.target.value !== customShopOption) {
              setCustomShopName('')
            }
            setSaveMessage('')
          }}
        >
          <option value="">Choose a shop</option>
          {shopOptions.map((shopOption) => (
            <option key={shopOption} value={shopOption}>
              {shopOption}
            </option>
          ))}
        </select>
      </label>

      {selectedShop === customShopOption && (
        <label className="field">
          <span>Custom shop name</span>
          <input
            type="text"
            autoComplete="off"
            placeholder="Enter a shop name"
            value={customShopName}
            onChange={(event) => {
              setCustomShopName(event.target.value)
              setSaveMessage('')
            }}
          />
        </label>
      )}
    </div>
  )

  return (
    <main className="app-shell">
      {currentPage === 'capture' ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
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

            {renderShopPicker()}

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
                onClick={() => stopScanner()}
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
                {lookupStatus === 'loading' ? 'Looking up…' : 'Lookup'}
              </button>
            </form>

            <p
              className={`helper-text helper-text--${lookupStatus === 'error' ? 'error' : 'default'}`}
            >
              {lookupMessage}
            </p>
            {saveMessage && <p className="helper-text">{saveMessage}</p>}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
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
                  <article
                    key={record.id}
                    className={`history-card${editingRecordId === record.id ? ' history-card--editing' : ''}`}
                  >
                    <div className="history-card__top">
                      <div>
                        <h3>{record.name ?? 'Unknown product'}</h3>
                        <p>{record.barcode}</p>
                        <p className="history-card__brand">
                          {record.brands ?? 'Brand unavailable'}
                        </p>
                        <p className="history-card__shop">
                          {record.shop ?? 'Shop not set'}
                        </p>
                      </div>
                      <div className="history-card__actions">
                        <strong>{formatPrice(record.price)}</strong>
                        {record.offDataFaulty && (
                          <span className="history-card__badge">OFF data faulty</span>
                        )}
                        <button
                          type="button"
                          className="button button--secondary button--small"
                          onClick={() => handleEditRecord(record)}
                        >
                          Edit
                        </button>
                      </div>
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
        </>
      ) : (
        <section className="panel panel--product-page">
          <div className="panel-header panel-header--product-page">
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => navigateToPage('capture')}
            >
              Back
            </button>
            <div>
              <h2>{editingRecordId ? 'Edit saved item' : 'Confirm before saving'}</h2>
            </div>
          </div>

          {renderShopPicker()}

          {currentProduct ? (
            <article className="product-card">
              <div className="product-card__header">
                <div className="product-card__summary">
                  {isDetailsEditMode ? (
                    <>
                      <label className="field">
                        <span>Barcode</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={currentProduct.barcode}
                          onChange={(event) =>
                            updateProductField('barcode', event.target.value)
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Product name</span>
                        <input
                          type="text"
                          value={currentProduct.name ?? ''}
                          onChange={(event) =>
                            updateProductField('name', event.target.value)
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Brand</span>
                        <input
                          type="text"
                          value={currentProduct.brands ?? ''}
                          onChange={(event) =>
                            updateProductField('brands', event.target.value)
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Image URL</span>
                        <input
                          type="text"
                          autoComplete="off"
                          value={currentProduct.imageUrl ?? ''}
                          onChange={(event) =>
                            updateProductField('imageUrl', event.target.value)
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p className="product-card__barcode">{currentProduct.barcode}</p>
                      <h3 className="product-card__title">
                        {currentProduct.name ??
                          (currentProduct.isProductFound
                            ? 'Unnamed Open Food Facts product'
                            : 'Unknown product')}
                      </h3>
                      <p className="product-card__subtitle">
                        <span className="product-card__meta-label">Brand:</span>{' '}
                        {currentProduct.isProductFound
                          ? currentProduct.brands ?? 'Brand unavailable'
                          : 'No matching product data was found.'}
                      </p>
                    </>
                  )}

                  <p className="product-card__subtitle">
                    <span className="product-card__meta-label">Shop:</span>{' '}
                    {activeShopName || 'Not selected'}
                  </p>
                  {offDataFaultyMarkerVisible && (
                    <p className="product-card__flag">OFF data faulty</p>
                  )}
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
                  {isDetailsEditMode ? (
                    <label className="field">
                      <span>Ingredients text</span>
                      <textarea
                        value={currentProduct.ingredients ?? ''}
                        onChange={(event) =>
                          updateProductField('ingredients', event.target.value)
                        }
                      />
                    </label>
                  ) : (
                    <p>
                      {currentProduct.ingredients ??
                        'No ingredients were provided by Open Food Facts for this barcode.'}
                    </p>
                  )}
                </section>

                <section className="detail-card">
                  <h4>Nutrition declaration</h4>
                  <table className="nutrition-label">
                    <thead>
                      <tr>
                        <th scope="col">Typical values</th>
                        <th scope="col">Per 100 g</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProduct.nutrients.map((nutrient) => {
                        const energyParts = parseEnergyText(nutrient.text)

                        return (
                          <tr
                            key={nutrient.id}
                            className={
                              nutrient.indent ? 'nutrition-label__sub' : undefined
                            }
                          >
                            <th scope="row">{nutrient.label}</th>
                            <td>
                              {isDetailsEditMode ? (
                                nutrient.id === 'energy' ? (
                                  <div className="nutrition-energy-inputs">
                                    <label className="nutrition-energy-field">
                                      <span>kJ</span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={energyParts.kilojoules}
                                        onChange={(event) =>
                                          updateNutrientValue(
                                            nutrient.id,
                                            event.target.value,
                                            'kj',
                                          )
                                        }
                                      />
                                    </label>
                                    <label className="nutrition-energy-field">
                                      <span>kcal</span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={energyParts.kilocalories}
                                        onChange={(event) =>
                                          updateNutrientValue(
                                            nutrient.id,
                                            event.target.value,
                                            'kcal',
                                          )
                                        }
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <div className="nutrition-value-input">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={nutrient.value ?? ''}
                                      onChange={(event) =>
                                        updateNutrientValue(
                                          nutrient.id,
                                          event.target.value,
                                          'value',
                                        )
                                      }
                                    />
                                    <span>{nutrient.unit}</span>
                                  </div>
                                )
                              ) : nutrient.text ? (
                                nutrient.text
                              ) : nutrient.value !== null ? (
                                `${nutrient.value} ${nutrient.unit}`.trim()
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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
                    onChange={(event) => {
                      setPriceInput(event.target.value)
                      setSaveMessage('')
                    }}
                  />
                </label>

                <div className="price-actions">
                  {isDetailsEditMode ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={handleCancelProductEdit}
                    >
                      Cancel details edit
                    </button>
                  ) : editingRecordId ? (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={handleStartProductEdit}
                    >
                      Edit details
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void handleSave()}
                  >
                    {editingRecordId ? 'Update saved item' : 'Save item locally'}
                  </button>
                </div>
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
      )}
    </main>
  )
}

export default App
