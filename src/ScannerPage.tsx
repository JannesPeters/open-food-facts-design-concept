import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const cameraSupported =
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function'

const sanitizeBarcode = (value: string) => value.replace(/[^\d]/g, '')

const initialScannerMessage = cameraSupported
  ? 'Point your camera at a barcode to look up a product.'
  : 'Camera scanning is not available here — enter a barcode manually below.'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

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
    if (cameraSupported && !cameraManuallyStopped && scannerStatus === 'idle') {
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
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/off-logo.svg"
              alt="Open Food Facts"
              className="h-9 w-auto dark:hidden"
            />
            <img
              src="/off-logo-dark.svg"
              alt="Open Food Facts"
              className="hidden h-9 w-auto dark:block"
            />
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Concept
            </span>
          </Link>
        </div>
      </header>

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
          <p className="text-muted-foreground">
            Use your camera to jump straight to a product, or enter a barcode
            manually.
          </p>
        </div>

        <div className="space-y-6">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
            />
            {scannerStatus !== 'active' && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/80 p-6 text-center">
                <p className="max-w-sm text-sm text-muted-foreground">
                  {scannerMessage}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                setCameraManuallyStopped(false)
                void startScanner()
              }}
              disabled={!cameraSupported || scannerStatus === 'starting'}
            >
              <ScanLine className="size-4" />
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
            >
              {statusLabel}
            </Badge>
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
