import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import { Textarea } from './components/ui/textarea'
import './App.css'
import { downloadRecordsCsv } from './lib/csv'
import { fetchProductDetails } from './lib/openFoodFacts'
import { deleteRecord, listSavedRecords, saveRecord } from './lib/storage'
import type { ProductDetails, SavedProductRecord } from './types'

const cameraSupported =
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function'

const sanitizeBarcode = (value: string) => value.replace(/[^\d]/g, '')

const createRecordId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const formatPrice = (value: number | null) =>
  value === null
    ? 'N.A.'
    : new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))

const formatDateInputValue = (value: string) => {
  const parsedValue = new Date(value)
  if (Number.isNaN(parsedValue.getTime())) {
    return ''
  }

  const year = parsedValue.getFullYear()
  const month = String(parsedValue.getMonth() + 1).padStart(2, '0')
  const day = String(parsedValue.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const parseDateInputValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  const parsedValue = new Date(year, month - 1, day, 12)
  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue.toISOString()
}

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
  nutriScore: product.nutriScore,
  novaGroup: product.novaGroup,
  quantity: product.quantity,
  servingSize: product.servingSize,
  allergens: product.allergens,
  categories: product.categories,
  labels: product.labels,
  ingredientsAnalysis: product.ingredientsAnalysis,
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
    nutriScore: product.nutriScore?.trim() ?? '',
    novaGroup: product.novaGroup ?? '',
    quantity: product.quantity?.trim() ?? '',
    servingSize: product.servingSize?.trim() ?? '',
    allergens: product.allergens?.trim() ?? '',
    categories: product.categories?.trim() ?? '',
    labels: product.labels?.trim() ?? '',
    ingredientsAnalysis: product.ingredientsAnalysis?.trim() ?? '',
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

const pillTruncateLimit = 20
const ingredientsPreviewLimit = 280

const truncatePillValue = (value: string) =>
  value.length > pillTruncateLimit
    ? `${value.slice(0, pillTruncateLimit).trimEnd()}…`
    : value

const truncateIngredients = (value: string) =>
  value.length > ingredientsPreviewLimit
    ? `${value.slice(0, ingredientsPreviewLimit).trimEnd()}…`
    : value

const getPageFromLocation = () =>
  typeof window !== 'undefined' && window.location.hash === '#product'
    ? 'product'
    : 'capture'

function ScannerPage() {
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
  const [savedAtInput, setSavedAtInput] = useState('')
  const [history, setHistory] = useState<SavedProductRecord[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [recordPendingDeletion, setRecordPendingDeletion] =
    useState<SavedProductRecord | null>(null)
  const [selectedShop, setSelectedShop] = useState('')
  const [customShopName, setCustomShopName] = useState('')
  const [offDataFaulty, setOffDataFaulty] = useState(false)
  const [isDetailsEditMode, setIsDetailsEditMode] = useState(false)
  const [editingNutrientId, setEditingNutrientId] = useState<string | null>(null)
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false)
  const [isIngredientsDialogOpen, setIsIngredientsDialogOpen] = useState(false)
  const [cameraManuallyStopped, setCameraManuallyStopped] = useState(false)
  const [nutrientValueDrafts, setNutrientValueDrafts] = useState<
    Record<string, string>
  >({})
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

  const pricePreview = useMemo(() => {
    const trimmedPrice = priceInput.trim()

    if (!trimmedPrice) {
      return 'Add price'
    }

    const parsedPrice = toOptionalNumber(priceInput)
    return parsedPrice === null ? trimmedPrice : formatPrice(parsedPrice)
  }, [priceInput])

  const ingredientsPreview = useMemo(
    () =>
      currentProduct?.ingredients ? truncateIngredients(currentProduct.ingredients) : null,
    [currentProduct?.ingredients],
  )

  const hasLongIngredients = useMemo(
    () =>
      Boolean(
        currentProduct?.ingredients &&
          currentProduct.ingredients.length > ingredientsPreviewLimit,
      ),
    [currentProduct?.ingredients],
  )

  const loadSavedHistory = useCallback(async () => {
    const records = await listSavedRecords()
    setHistory(records)
  }, [])

  useEffect(() => {
    void loadSavedHistory()
  }, [loadSavedHistory])

  useEffect(() => {
    setNutrientValueDrafts({})
  }, [currentProduct?.barcode, isDetailsEditMode])

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
    setSavedAtInput('')
    setEditingRecordId(null)
    setOffDataFaulty(false)
    setIsDetailsEditMode(false)
    setIsPriceDialogOpen(false)
    setIsIngredientsDialogOpen(false)
  }, [])

  const openSavedRecord = useCallback(
    (
      record: SavedProductRecord,
      message = 'Editing saved item. Update any field and save your changes.',
      editMode = true,
    ) => {
      const product: ProductDetails = {
        barcode: record.barcode,
        name: record.name,
        ingredients: record.ingredients,
        brands: record.brands,
        imageUrl: record.imageUrl,
        nutriScore: record.nutriScore,
        novaGroup: record.novaGroup,
        quantity: record.quantity,
        servingSize: record.servingSize,
        allergens: record.allergens,
        categories: record.categories,
        labels: record.labels,
        ingredientsAnalysis: record.ingredientsAnalysis,
        nutrients: record.nutrients.map((nutrient) => ({ ...nutrient })),
        isProductFound: record.isProductFound,
      }

      const shopSelection = getShopSelectionState(record.shop)

      setCurrentProduct(product)
      setProductReference(cloneProductDetails(product))
      setPriceInput(record.price === null ? '' : String(record.price))
      setSavedAtInput(formatDateInputValue(record.savedAt))
      setEditingRecordId(record.id)
      setSelectedShop(shopSelection.selectedShop)
      setCustomShopName(shopSelection.customShopName)
      setOffDataFaulty(record.offDataFaulty)
      setIsDetailsEditMode(editMode)
      setIsPriceDialogOpen(false)
      setIsIngredientsDialogOpen(false)
      setLookupStatus('ready')
      setLookupMessage(message)
      setSaveMessage('')
      navigateToPage('product')
    },
    [navigateToPage],
  )

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

      const matchingRecord = history.find((record) => record.barcode === barcode)

      if (matchingRecord) {
        openSavedRecord(
          matchingRecord,
          'Saved item opened. Update any field and save your changes.',
          true,
        )
        return
      }

      try {
        const product = await fetchProductDetails(barcode)

        if (lookupRequestRef.current !== requestId) {
          return
        }

        setCurrentProduct(product)
        setProductReference(cloneProductDetails(product))
        setPriceInput('')
        setSavedAtInput('')
        setEditingRecordId(null)
        setOffDataFaulty(false)
        setIsDetailsEditMode(false)
        setIsPriceDialogOpen(false)
        setIsIngredientsDialogOpen(false)
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
    [history, navigateToPage, openSavedRecord],
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

  useEffect(() => {
    if (currentPage !== 'capture') {
      setCameraManuallyStopped((stopped) => (stopped ? false : stopped))
      return
    }

    if (
      cameraSupported &&
      !cameraManuallyStopped &&
      scannerStatus === 'idle'
    ) {
      void startScanner()
    }
  }, [cameraManuallyStopped, currentPage, scannerStatus, startScanner])

  const handleLookupSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleLookupProduct(barcodeInput)
    },
    [barcodeInput, handleLookupProduct],
  )

  const updateProductField = useCallback(
    (
      field:
        | 'barcode'
        | 'name'
        | 'ingredients'
        | 'brands'
        | 'imageUrl'
        | 'nutriScore'
        | 'quantity'
        | 'servingSize'
        | 'allergens'
        | 'categories'
        | 'labels'
        | 'ingredientsAnalysis',
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

  const updateNovaGroup = useCallback((value: string) => {
    setCurrentProduct((previousProduct) => {
      if (!previousProduct) {
        return previousProduct
      }

      const parsed = Number.parseInt(value, 10)
      const novaGroup =
        Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : null

      return { ...previousProduct, novaGroup }
    })
    setSaveMessage('')
  }, [])

  const updateNutrientValue = useCallback(
    (nutrientId: string, value: string, part: 'value' | 'kj' | 'kcal') => {
      if (part === 'value') {
        setNutrientValueDrafts((previousDrafts) => ({
          ...previousDrafts,
          [nutrientId]: value,
        }))
      }

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
    resetProductFlow()
    setLookupStatus('idle')
    setLookupMessage(initialLookupMessage)
    setSaveMessage('')
    navigateToPage('capture')
  }, [navigateToPage, resetProductFlow])

  const handleEditRecord = useCallback(
    (record: SavedProductRecord) => {
      openSavedRecord(record)
    },
    [openSavedRecord],
  )

  const handleOpenRecord = useCallback(
    (record: SavedProductRecord) => {
      openSavedRecord(
        record,
        'Saved item opened. Use Edit details if you want to make changes.',
        false,
      )
    },
    [openSavedRecord],
  )

  const handleRequestDeleteRecord = useCallback((record: SavedProductRecord) => {
    setRecordPendingDeletion(record)
  }, [])

  const handleCancelDeleteRecord = useCallback(() => {
    setRecordPendingDeletion(null)
  }, [])

  const handleConfirmDeleteRecord = useCallback(async () => {
    if (!recordPendingDeletion) {
      return
    }

    await deleteRecord(recordPendingDeletion.id)
    setHistory((previousHistory) =>
      previousHistory.filter((record) => record.id !== recordPendingDeletion.id),
    )

    if (editingRecordId === recordPendingDeletion.id) {
      resetProductFlow()
      setLookupStatus('idle')
      setLookupMessage(initialLookupMessage)
    }

    setSaveMessage(`Removed ${recordPendingDeletion.name ?? 'item'}.`)
    setRecordPendingDeletion(null)
  }, [editingRecordId, recordPendingDeletion, resetProductFlow])

  const handleSave = useCallback(async () => {
    if (!currentProduct) {
      return
    }

    const normalizedPrice = toOptionalNumber(priceInput)
    if (normalizedPrice !== null && normalizedPrice < 0) {
      setSaveMessage('Enter a valid price before saving.')
      return
    }

    if (!activeShopName) {
      setSaveMessage('Choose a shop before saving.')
      return
    }

    const normalizedSavedAt =
      editingRecordId || savedAtInput
        ? parseDateInputValue(savedAtInput)
        : new Date().toISOString()

    if (!normalizedSavedAt) {
      setSaveMessage('Enter a valid saved date before saving.')
      return
    }

    const record: SavedProductRecord = {
      id: editingRecordId ?? createRecordId(),
      barcode: currentProduct.barcode.trim(),
      name: currentProduct.name?.trim() || null,
      ingredients: currentProduct.ingredients?.trim() || null,
      brands: currentProduct.brands?.trim() || null,
      imageUrl: currentProduct.imageUrl?.trim() || null,
      nutriScore: currentProduct.nutriScore?.trim().toUpperCase() || null,
      novaGroup: currentProduct.novaGroup,
      quantity: currentProduct.quantity?.trim() || null,
      servingSize: currentProduct.servingSize?.trim() || null,
      allergens: currentProduct.allergens?.trim() || null,
      categories: currentProduct.categories?.trim() || null,
      labels: currentProduct.labels?.trim() || null,
      ingredientsAnalysis: currentProduct.ingredientsAnalysis?.trim() || null,
      nutrients: currentProduct.nutrients.map((nutrient) => ({ ...nutrient })),
      isProductFound: currentProduct.isProductFound,
      price: normalizedPrice,
      savedAt: normalizedSavedAt,
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
    record.price === null
      ? `${isEditing ? 'Updated' : 'Saved'} ${record.name ?? 'item'} at ${record.shop}.`
      : `${isEditing ? 'Updated' : 'Saved'} ${record.name ?? 'item'} at ${record.shop} for ${formatPrice(record.price)}.`,
    )
    setBarcodeInput('')
    navigateToPage('capture')
  }, [
    activeShopName,
    currentProduct,
    editingRecordId,
    navigateToPage,
    offDataFaultyMarkerVisible,
    priceInput,
    resetProductFlow,
    savedAtInput,
  ])

  const renderShopPicker = () => (
    <div className="shop-picker">
      <div className="field">
        <Select
          value={selectedShop}
          onValueChange={(value) => {
            setSelectedShop(value)
            if (value !== customShopOption) {
              setCustomShopName('')
            }
            setSaveMessage('')
          }}
        >
          <SelectTrigger aria-label="Shop">
            <SelectValue placeholder="Choose a shop" />
          </SelectTrigger>
          <SelectContent>
            {shopOptions.map((shopOption) => (
              <SelectItem key={shopOption} value={shopOption}>
                {shopOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedShop === customShopOption && (
        <label className="field">
          <span>Custom shop name</span>
          <Input
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
              <Button
                type="button"
                onClick={() => {
                  setCameraManuallyStopped(false)
                  void startScanner()
                }}
                disabled={scannerStatus === 'starting'}
              >
                {scannerStatus === 'active' ? 'Restart camera' : 'Start camera'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCameraManuallyStopped(true)
                  stopScanner()
                }}
                disabled={scannerStatus !== 'active'}
              >
                Stop camera
              </Button>
              <Badge
                variant={
                  scannerStatus === 'active'
                    ? 'default'
                    : scannerStatus === 'error'
                      ? 'destructive'
                      : 'secondary'
                }
                className="status-pill"
              >
                {scannerStatus === 'active'
                  ? 'Camera live'
                  : scannerStatus === 'starting'
                    ? 'Starting camera'
                    : scannerStatus === 'error'
                      ? 'Camera unavailable'
                      : 'Camera idle'}
              </Badge>
            </div>

            <form className="manual-form" onSubmit={handleLookupSubmit}>
              <div className="field">
                <Input
                  type="text"
                  aria-label="Manual barcode entry"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Example: 3017620422003"
                  value={barcodeInput}
                  onChange={(event) =>
                    setBarcodeInput(sanitizeBarcode(event.target.value))
                  }
                />
              </div>
              <Button
                type="submit"
                disabled={lookupStatus === 'loading'}
              >
                {lookupStatus === 'loading' ? 'Looking up…' : 'Lookup'}
              </Button>
            </form>

            {lookupStatus !== 'idle' && (
              <p
                className={`helper-text helper-text--${lookupStatus === 'error' ? 'error' : 'default'}`}
              >
                {lookupMessage}
              </p>
            )}
            {saveMessage && <p className="helper-text">{saveMessage}</p>}
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Browse and export your items</h2>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadRecordsCsv(history)}
                disabled={history.length === 0}
              >
                Export CSV
              </Button>
            </div>

            {history.length > 0 ? (
              <div className="history-list">
                {history.map((record) => (
                  <article
                    key={record.id}
                    className={`history-card${editingRecordId === record.id ? ' history-card--editing' : ''}`}
                  >
                    <div className="history-card__top">
                      <button
                        type="button"
                        className="history-card__summary"
                        onClick={() => handleOpenRecord(record)}
                      >
                        <h3>{record.name ?? 'Unknown product'}</h3>
                        <p className="history-card__meta">
                          {[
                            record.brands ?? 'Brand unavailable',
                            record.shop ?? 'Shop not set',
                            formatTimestamp(record.savedAt),
                          ].join(' · ')}
                        </p>
                      </button>
                      <div className="history-card__actions">
                        <strong>{formatPrice(record.price)}</strong>
                        {record.offDataFaulty && (
                          <Badge variant="outline" className="history-card__badge">
                            OFF data faulty
                          </Badge>
                        )}
                        <div className="history-card__icon-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${record.name ?? 'item'}`}
                            title="Edit"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${record.name ?? 'item'}`}
                            title="Remove"
                            onClick={() => handleRequestDeleteRecord(record)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
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
          <div className="panel-header panel-header--product-page detail-fixed-header">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigateToPage('capture')}
            >
              Back
            </Button>

            {currentProduct && (
              <div className="detail-header-actions">
                {isDetailsEditMode ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelProductEdit}
                  >
                    Cancel details edit
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleStartProductEdit}
                  >
                    Edit details
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleSave()}
                >
                  {editingRecordId ? 'Update saved item' : 'Save item locally'}
                </Button>
              </div>
            )}
          </div>

          <div className="detail-body">
            {renderShopPicker()}

          {currentProduct ? (
            <article className="product-card">
              <div className="product-card__header">
                <div className="product-card__summary">
                  {isDetailsEditMode ? (
                    <>
                      <label className="field">
                        <span>Barcode</span>
                        <Input
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
                        <Input
                          type="text"
                          value={currentProduct.name ?? ''}
                          onChange={(event) =>
                            updateProductField('name', event.target.value)
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Brand</span>
                        <Input
                          type="text"
                          value={currentProduct.brands ?? ''}
                          onChange={(event) =>
                            updateProductField('brands', event.target.value)
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Image URL</span>
                        <Input
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
                        {currentProduct.isProductFound
                          ? currentProduct.brands ?? 'Brand unavailable'
                          : 'No matching product data was found.'}
                      </p>
                    </>
                  )}

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
                  <h4>Product details</h4>
                  {isDetailsEditMode ? (
                    <div className="detail-fields">
                      <label className="field">
                        <span>Nutri-Score (A–E)</span>
                        <Input
                          type="text"
                          maxLength={1}
                          value={currentProduct.nutriScore ?? ''}
                          onChange={(event) =>
                            updateProductField('nutriScore', event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span>NOVA group (1–4)</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={
                            currentProduct.novaGroup === null
                              ? ''
                              : String(currentProduct.novaGroup)
                          }
                          onChange={(event) => updateNovaGroup(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Quantity</span>
                        <Input
                          type="text"
                          value={currentProduct.quantity ?? ''}
                          onChange={(event) =>
                            updateProductField('quantity', event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Serving size</span>
                        <Input
                          type="text"
                          value={currentProduct.servingSize ?? ''}
                          onChange={(event) =>
                            updateProductField('servingSize', event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Allergens</span>
                        <Input
                          type="text"
                          value={currentProduct.allergens ?? ''}
                          onChange={(event) =>
                            updateProductField('allergens', event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Categories</span>
                        <Input
                          type="text"
                          value={currentProduct.categories ?? ''}
                          onChange={(event) =>
                            updateProductField('categories', event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Labels</span>
                        <Input
                          type="text"
                          value={currentProduct.labels ?? ''}
                          onChange={(event) =>
                            updateProductField('labels', event.target.value)
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Dietary analysis</span>
                        <Input
                          type="text"
                          value={currentProduct.ingredientsAnalysis ?? ''}
                          onChange={(event) =>
                            updateProductField(
                              'ingredientsAnalysis',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : currentProduct.nutriScore ||
                    currentProduct.novaGroup !== null ||
                    currentProduct.quantity ||
                    currentProduct.servingSize ||
                    currentProduct.allergens ||
                    currentProduct.categories ||
                    currentProduct.labels ||
                    currentProduct.ingredientsAnalysis ? (
                    <div className="spec-summary">
                      <div className="spec-pills">
                        {currentProduct.nutriScore && (
                          <span className="spec-pill">
                            <span className="spec-pill__label">Nutri-Score</span>
                            <span className="spec-pill__value">
                              {currentProduct.nutriScore}
                            </span>
                          </span>
                        )}
                        {currentProduct.novaGroup !== null && (
                          <span className="spec-pill">
                            <span className="spec-pill__label">NOVA group</span>
                            <span className="spec-pill__value">
                              {currentProduct.novaGroup}
                            </span>
                          </span>
                        )}
                        {currentProduct.quantity && (
                          <span className="spec-pill">
                            <span className="spec-pill__label">Quantity</span>
                            <span
                              className="spec-pill__value"
                              title={currentProduct.quantity}
                            >
                              {truncatePillValue(currentProduct.quantity)}
                            </span>
                          </span>
                        )}
                        {currentProduct.servingSize && (
                          <span className="spec-pill">
                            <span className="spec-pill__label">Serving size</span>
                            <span
                              className="spec-pill__value"
                              title={currentProduct.servingSize}
                            >
                              {truncatePillValue(currentProduct.servingSize)}
                            </span>
                          </span>
                        )}
                        {currentProduct.ingredientsAnalysis
                          ?.split(',')
                          .map((entry) => entry.trim())
                          .filter((entry) => entry.length > 0)
                          .map((entry) => (
                            <span key={entry} className="spec-pill">
                              <span className="spec-pill__value" title={entry}>
                                {truncatePillValue(entry)}
                              </span>
                            </span>
                          ))}
                      </div>
                      {(currentProduct.allergens ||
                        currentProduct.categories ||
                        currentProduct.labels) && (
                        <div className="spec-pills">
                          {currentProduct.categories && (
                            <span className="spec-pill">
                              <span className="spec-pill__label">Categories</span>
                              <span className="spec-pill__values">
                                {currentProduct.categories
                                  .split(',')
                                  .map((entry) => entry.trim())
                                  .filter((entry) => entry.length > 0)
                                  .map((entry) => (
                                    <span
                                      key={entry}
                                      className="spec-pill__value"
                                      title={entry}
                                    >
                                      {truncatePillValue(entry)}
                                    </span>
                                  ))}
                              </span>
                            </span>
                          )}
                          {currentProduct.allergens && (
                            <span className="spec-pill">
                              <span className="spec-pill__label">Allergens</span>
                              <span className="spec-pill__values">
                                {currentProduct.allergens
                                  .split(',')
                                  .map((entry) => entry.trim())
                                  .filter((entry) => entry.length > 0)
                                  .map((entry) => (
                                    <span
                                      key={entry}
                                      className="spec-pill__value"
                                      title={entry}
                                    >
                                      {truncatePillValue(entry)}
                                    </span>
                                  ))}
                              </span>
                            </span>
                          )}
                          {currentProduct.labels && (
                            <span className="spec-pill">
                              <span className="spec-pill__label">Labels</span>
                              <span className="spec-pill__values">
                                {currentProduct.labels
                                  .split(',')
                                  .map((entry) => entry.trim())
                                  .filter((entry) => entry.length > 0)
                                  .map((entry) => (
                                    <span
                                      key={entry}
                                      className="spec-pill__value"
                                      title={entry}
                                    >
                                      {truncatePillValue(entry)}
                                    </span>
                                  ))}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>
                      No additional details were provided by Open Food Facts for
                      this barcode.
                    </p>
                  )}
                </section>
                <section className="detail-card">
                  <h4>Ingredients</h4>
                  {isDetailsEditMode ? (
                    <label className="field">
                      <span>Ingredients text</span>
                      <Textarea
                        value={currentProduct.ingredients ?? ''}
                        onChange={(event) =>
                          updateProductField('ingredients', event.target.value)
                        }
                      />
                    </label>
                  ) : (
                    <div className="ingredients-preview">
                      <p>
                        {ingredientsPreview ??
                          'No ingredients were provided by Open Food Facts for this barcode.'}
                      </p>
                      {hasLongIngredients && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsIngredientsDialogOpen(true)}
                        >
                          View all
                        </Button>
                      )}
                    </div>
                  )}
                </section>
                <section className="detail-card">
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
                                      <Input
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
                                      <Input
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
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={
                                        nutrientValueDrafts[nutrient.id] ??
                                        (nutrient.value === null
                                          ? ''
                                          : String(nutrient.value))
                                      }
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
                              ) : (
                                <button
                                  type="button"
                                  className="nutrition-value-button"
                                  onClick={() => setEditingNutrientId(nutrient.id)}
                                  title="Tap to edit"
                                >
                                  {nutrient.text
                                    ? nutrient.text
                                    : nutrient.value !== null
                                      ? `${nutrient.value} ${nutrient.unit}`.trim()
                                      : '—'}
                                </button>
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
                <div className="price-fields">
                  <label className="field">
                    <span>Price</span>
                    <button
                      type="button"
                      className={`price-value-button${priceInput.trim() ? '' : ' price-value-button--empty'}`}
                      onClick={() => setIsPriceDialogOpen(true)}
                      title="Tap to edit"
                    >
                      {pricePreview}
                    </button>
                  </label>

                  {editingRecordId && (
                    <label className="field">
                      <span>Saved on</span>
                      <Input
                        type="date"
                        value={savedAtInput}
                        onChange={(event) => {
                          setSavedAtInput(event.target.value)
                          setSaveMessage('')
                        }}
                      />
                    </label>
                  )}
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
          </div>
        </section>
      )}
      {recordPendingDeletion && (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={handleCancelDeleteRecord}
        >
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-delete-title">Remove entry?</h2>
            <p>
              This will permanently remove{' '}
              <strong>{recordPendingDeletion.name ?? 'this item'}</strong> from
              your saved history.
            </p>
            <div className="confirm-dialog__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelDeleteRecord}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleConfirmDeleteRecord()}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
      {editingNutrientId &&
        currentProduct &&
        (() => {
          const nutrient = currentProduct.nutrients.find(
            (item) => item.id === editingNutrientId,
          )

          if (!nutrient) {
            return null
          }

          const energyParts = parseEnergyText(nutrient.text)
          const closeDialog = () => setEditingNutrientId(null)

          return (
            <div
              className="confirm-dialog-backdrop"
              role="presentation"
              onClick={closeDialog}
            >
              <div
                className="confirm-dialog nutrient-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="nutrient-edit-title"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    closeDialog()
                  }
                }}
              >
                <h2 id="nutrient-edit-title">{nutrient.label}</h2>
                {nutrient.id === 'energy' ? (
                  <div className="nutrient-dialog__fields">
                    <label className="nutrient-dialog__field">
                      <span className="nutrient-dialog__unit">kJ</span>
                      <input
                        className="nutrient-dialog__input"
                        type="text"
                        inputMode="decimal"                        autoFocus
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
                    <label className="nutrient-dialog__field">
                      <span className="nutrient-dialog__unit">kcal</span>
                      <input
                        className="nutrient-dialog__input"
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
                  <label className="nutrient-dialog__field">
                    <input
                      className="nutrient-dialog__input"
                      type="text"
                      inputMode="decimal"                      autoFocus
                      value={
                        nutrientValueDrafts[nutrient.id] ??
                        (nutrient.value === null ? '' : String(nutrient.value))
                      }
                      onChange={(event) =>
                        updateNutrientValue(
                          nutrient.id,
                          event.target.value,
                          'value',
                        )
                      }
                    />
                    <span className="nutrient-dialog__unit">{nutrient.unit}</span>
                  </label>
                )}
                <div className="confirm-dialog__actions">
                  <Button type="button" onClick={closeDialog}>
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )
        })()}
      {isPriceDialogOpen && currentProduct && (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={() => setIsPriceDialogOpen(false)}
        >
          <div
            className="confirm-dialog nutrient-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="price-edit-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                setIsPriceDialogOpen(false)
              }
            }}
          >
            <h2 id="price-edit-title">Price</h2>
            <label className="nutrient-dialog__field">
              <span className="nutrient-dialog__unit">EUR</span>
              <input
                className="nutrient-dialog__input"
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="2.49"
                value={priceInput}
                onChange={(event) => {
                  setPriceInput(event.target.value)
                  setSaveMessage('')
                }}
              />
            </label>
            <div className="confirm-dialog__actions">
              <Button type="button" onClick={() => setIsPriceDialogOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      {isIngredientsDialogOpen && currentProduct?.ingredients && (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={() => setIsIngredientsDialogOpen(false)}
        >
          <div
            className="confirm-dialog ingredients-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingredients-dialog-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                setIsIngredientsDialogOpen(false)
              }
            }}
          >
            <h2 id="ingredients-dialog-title">Ingredients</h2>
            <p className="ingredients-dialog__content">{currentProduct.ingredients}</p>
            <div className="confirm-dialog__actions">
              <Button
                type="button"
                onClick={() => setIsIngredientsDialogOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ScannerPage
