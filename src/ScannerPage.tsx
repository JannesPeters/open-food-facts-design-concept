import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SiteHeader from '@/components/SiteHeader'
import { cn } from '@/lib/utils'
import { sanitizeBarcode } from '@/lib/scores'

const cameraSupported =
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function'

// Common retail product barcode symbologies. Restricting the formats keeps
// each decode pass fast enough that TRY_HARDER (which also scans the image
// rotated) can run without noticeable lag, so angled barcodes are detected.
const scannerHints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ],
  ],
])

const initialScannerMessage = cameraSupported
  ? 'Point your camera at a barcode to look up a product.'
  : 'Camera scanning is not available here — enter a barcode manually below.'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

const RETURNING_USER_KEY = 'off-scanner-used'

const hasUsedScannerBefore = () => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(RETURNING_USER_KEY) === 'true'
  } catch {
    return false
  }
}

const markScannerUsed = () => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(RETURNING_USER_KEY, 'true')
  } catch {
    // Ignore storage failures (e.g. private mode); auto-start simply won't persist.
  }
}

type ScannerStatus = 'idle' | 'starting' | 'active' | 'error'

function ScannerPage() {
  const navigate = useNavigate()

  const [barcodeInput, setBarcodeInput] = useState('')
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle')
  const [scannerMessage, setScannerMessage] = useState(initialScannerMessage)
  const [cameraManuallyStopped, setCameraManuallyStopped] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)
  const scanHandledRef = useRef(false)

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

  const goToProduct = useCallback(
    (rawBarcode: string) => {
      const barcode = sanitizeBarcode(rawBarcode)
      if (!barcode) {
        return
      }
      stopScanner()
      navigate(`/product/${barcode}`)
    },
    [navigate, stopScanner],
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
    markScannerUsed()

    const reader = new BrowserMultiFormatReader(scannerHints)
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
            goToProduct(scannedBarcode)
            return
          }

          if (error && error.name !== 'NotFoundException') {
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
  }, [clearVideoStream, goToProduct, stopScanner])

  useEffect(() => {
    if (
      cameraSupported &&
      hasUsedScannerBefore() &&
      !cameraManuallyStopped &&
      scannerStatus === 'idle'
    ) {
      void startScanner()
    }
  }, [cameraManuallyStopped, scannerStatus, startScanner])

  useEffect(() => () => stopScanner(), [stopScanner])

  const handleLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    goToProduct(barcodeInput)
  }

  const statusLabel =
    scannerStatus === 'active'
      ? 'Camera live'
      : scannerStatus === 'starting'
        ? 'Starting camera'
        : scannerStatus === 'error'
          ? 'Camera unavailable'
          : 'Camera idle'

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader trailing={null} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <div className="mb-8 space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Home
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Scan a barcode
          </h1>
        </div>

        <div className="space-y-6">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
            />

            {/* Small camera status indicator */}
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-sm">
              <span
                className={cn('size-1.5 rounded-full', {
                  'animate-pulse bg-success': scannerStatus === 'active',
                  'animate-pulse bg-warning': scannerStatus === 'starting',
                  'bg-destructive': scannerStatus === 'error',
                  'bg-muted-foreground': scannerStatus === 'idle',
                })}
              />
              {statusLabel}
            </div>

            {/* Barcode scanner framing overlay */}
            {scannerStatus === 'active' && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden
              >
                <div className="relative h-1/2 w-4/5">
                  <span className="absolute left-0 top-0 size-8 rounded-tl-lg border-l-4 border-t-4 border-primary" />
                  <span className="absolute right-0 top-0 size-8 rounded-tr-lg border-r-4 border-t-4 border-primary" />
                  <span className="absolute bottom-0 left-0 size-8 rounded-bl-lg border-b-4 border-l-4 border-primary" />
                  <span className="absolute bottom-0 right-0 size-8 rounded-br-lg border-b-4 border-r-4 border-primary" />
                </div>
              </div>
            )}

            {/* Stop camera control, overlaid on the live preview */}
            {scannerStatus === 'active' && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute right-3 top-3 shadow-sm"
                onClick={() => {
                  setCameraManuallyStopped(true)
                  stopScanner()
                }}
              >
                Stop camera
              </Button>
            )}

            {/* Placeholder + centered start button when camera is not live */}
            {scannerStatus !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/85 p-6 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  {scannerMessage}
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setCameraManuallyStopped(false)
                    void startScanner()
                  }}
                  disabled={!cameraSupported || scannerStatus === 'starting'}
                >
                  <ScanLine className="size-4" />
                  {scannerStatus === 'starting' ? 'Starting…' : 'Start camera'}
                </Button>
              </div>
            )}
          </div>

          <form
            onSubmit={handleLookupSubmit}
            className="flex gap-2 border-t border-border pt-6"
          >
            <Input
              type="text"
              aria-label="Manual barcode entry"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Enter a barcode, e.g. 3017620422003"
              value={barcodeInput}
              onChange={(event) =>
                setBarcodeInput(sanitizeBarcode(event.target.value))
              }
            />
            <Button type="submit" disabled={!barcodeInput.trim()}>
              Look up
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default ScannerPage
