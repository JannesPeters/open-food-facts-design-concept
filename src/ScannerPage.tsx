import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import {
  BarcodeFormat,
  ChecksumException,
  DecodeHintType,
  FormatException,
  NotFoundException,
  type Result,
} from '@zxing/library'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

// The DOMException name for a camera failure carries the real meaning; the
// default `.message` ("Requested device not found", "Could not start video
// source") is cryptic to users. Note some browsers (Firefox's
// OverconstrainedError) don't subclass Error, so we read `.name` defensively.
const getErrorName = (error: unknown): string => {
  if (error && typeof error === 'object' && 'name' in error) {
    const { name } = error as { name?: unknown }
    if (typeof name === 'string') {
      return name
    }
  }
  return ''
}

// Turns a getUserMedia/camera failure into a friendly, actionable message that
// always points the user at the manual-entry field as a fallback.
const describeCameraError = (error: unknown): string => {
  switch (getErrorName(error)) {
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'No camera found. Connect a camera (or open your laptop lid), then tap “Start camera” — or enter a barcode below.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera is busy or unavailable — it may be in use by another app. Close it and try again, or enter a barcode below.'
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Camera access is blocked. Allow camera permission in your browser, or enter a barcode below.'
    case 'AbortError':
      return 'The camera stopped unexpectedly. Tap “Start camera” to try again, or enter a barcode below.'
    default:
      return 'Camera scanning is unavailable right now — enter a barcode below to look up a product.'
  }
}

// Remembers the user's explicitly chosen camera across navigations *and*
// reloads. This is what fixes Firefox with multiple webcams: instead of the
// vague `facingMode: 'environment'` hint (which Firefox resolves ambiguously
// between, say, an external Logitech and an unusable closed-lid built-in cam),
// we pass the concrete deviceId the user selected.
//
// We store the label alongside the deviceId because deviceIds are unreliable:
// Firefox regenerates them every session, so a remembered id is invalid on the
// next visit. The stable label lets us re-resolve to the current deviceId.
const PREFERRED_CAMERA_KEY = 'off-scanner-camera'

type CameraPreference = { deviceId: string; label: string }

const readCameraPreference = (): CameraPreference | null => {
  if (typeof localStorage === 'undefined') {
    return null
  }
  try {
    const raw = localStorage.getItem(PREFERRED_CAMERA_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<CameraPreference>
    if (typeof parsed?.deviceId === 'string') {
      return { deviceId: parsed.deviceId, label: parsed.label ?? '' }
    }
  } catch {
    // Corrupt/legacy value — ignore.
  }
  return null
}

const rememberCameraPreference = (preference: CameraPreference | null) => {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    if (preference) {
      localStorage.setItem(PREFERRED_CAMERA_KEY, JSON.stringify(preference))
    } else {
      localStorage.removeItem(PREFERRED_CAMERA_KEY)
    }
  } catch {
    // Ignore storage failures (private mode, quota); the picker still works for
    // the current session via component state.
  }
}

// Resolves a remembered preference against the cameras currently connected.
// Prefers an exact deviceId match, then falls back to matching the (stable)
// label, so a regenerated Firefox deviceId still maps to the right camera.
// Returns undefined when nothing matches, so we never pass an invalid deviceId.
const resolvePreferredDeviceId = (
  preference: CameraPreference | null,
  cameras: MediaDeviceInfo[],
): string | undefined => {
  if (!preference) {
    return undefined
  }
  const real = cameras.filter((camera) => camera.deviceId)
  if (real.some((camera) => camera.deviceId === preference.deviceId)) {
    return preference.deviceId
  }
  if (preference.label) {
    const byLabel = real.find((camera) => camera.label === preference.label)
    if (byLabel) {
      return byLabel.deviceId
    }
  }
  return undefined
}

// ZXing throws these on every video frame that doesn't (yet) contain a
// decodable barcode — they're normal "keep scanning" signals, not failures.
// We match with `instanceof` rather than `error.name`: ZXing derives the name
// from the constructor name (via ts-custom-error), which the production
// minifier renames, so a name check passes in dev but silently fails in the
// built app and kills the scanner on the first empty frame.
const isTransientScannerError = (error: unknown) =>
  error instanceof NotFoundException ||
  error instanceof ChecksumException ||
  error instanceof FormatException

// Remembers, for this page load, that the user explicitly stopped the camera.
// Module scope means the intent survives client-side navigation (Home ↔
// Scanner) so we don't auto-resume against their wishes, while a full reload
// starts fresh. Set when "Stop camera" is clicked, cleared on "Start camera".
let scannerStoppedByUser = false

// The browser remembers a granted camera permission across navigations, but
// only the Permissions API exposes it reliably. Subscribing lets us auto-resume
// the camera whenever it's *persistently* granted (Chrome/Edge) without ever
// showing a prompt, and stand down if it's revoked. Firefox/Safari don't
// support the `camera` query and only grant temporary permission, so there we
// require an explicit "Start camera" click instead of auto-prompting.
const supportsPermissionsQuery =
  typeof navigator !== 'undefined' &&
  typeof navigator.permissions?.query === 'function'

const watchCameraPermission = (
  onChange: (state: PermissionState) => void,
): (() => void) => {
  if (!supportsPermissionsQuery) {
    return () => {}
  }

  let permissionStatus: PermissionStatus | undefined
  let disposed = false

  const handleChange = () => {
    if (permissionStatus) {
      onChange(permissionStatus.state)
    }
  }

  navigator.permissions
    // `camera` isn't in the standard PermissionName union yet, but browsers
    // that support the query accept it.
    .query({ name: 'camera' as PermissionName })
    .then((status) => {
      if (disposed) {
        return
      }
      permissionStatus = status
      onChange(status.state)
      status.addEventListener('change', handleChange)
    })
    .catch(() => {
      // Some browsers (e.g. Safari, Firefox) reject the `camera` query; we fall
      // back to the in-session grant flag in that case.
    })

  return () => {
    disposed = true
    permissionStatus?.removeEventListener('change', handleChange)
  }
}

type ScannerStatus = 'idle' | 'starting' | 'active' | 'error'

function ScannerPage() {
  const navigate = useNavigate()

  const [barcodeInput, setBarcodeInput] = useState('')
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle')
  const [scannerMessage, setScannerMessage] = useState(initialScannerMessage)
  const [cameraManuallyStopped, setCameraManuallyStopped] = useState(
    () => scannerStoppedByUser,
  )
  const [cameraPermission, setCameraPermission] = useState<PermissionState | null>(
    null,
  )
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)
  const scanHandledRef = useRef(false)
  // Mirrors selectedCameraId so startScanner (a stable useCallback) can read the
  // current choice without being torn down and re-triggering the auto-start.
  const selectedCameraIdRef = useRef<string | null>(selectedCameraId)
  // Latest enumerated cameras, so startScanner can validate a deviceId without
  // depending on (and being recreated by) the cameras state.
  const camerasRef = useRef<MediaDeviceInfo[]>([])
  // Guards against a second camera start (and thus a duplicate permission
  // prompt) while one is already in flight or the scanner is live.
  const startInFlightRef = useRef(false)
  // Tracks whether a usable camera was connected last time we enumerated, so we
  // can auto-retry only on the transition from "no camera" to "camera present"
  // (e.g. plugging in a webcam / opening the lid) — never in a retry loop.
  const hadUsableCameraRef = useRef(false)

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

  // Keep the deviceId ref in step with the selection state.
  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId
  }, [selectedCameraId])

  // Enumerate available cameras so we can offer a picker. Device labels (and
  // stable deviceIds) only appear once camera permission has been granted, so
  // this is called on mount, after a successful start, when permission flips to
  // granted, and on hardware change (webcam plugged/unplugged).
  const refreshCameras = useCallback(async () => {
    if (
      !cameraSupported ||
      typeof navigator.mediaDevices?.enumerateDevices !== 'function'
    ) {
      return
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoInputs = devices.filter((device) => device.kind === 'videoinput')
      camerasRef.current = videoInputs
      setCameras(videoInputs)

      // Once real deviceIds are available, map any remembered preference onto a
      // currently-connected camera (by id, else by stable label).
      const hasRealIds = videoInputs.some((camera) => camera.deviceId)
      if (hasRealIds && !selectedCameraIdRef.current) {
        const resolved = resolvePreferredDeviceId(
          readCameraPreference(),
          videoInputs,
        )
        if (resolved) {
          selectedCameraIdRef.current = resolved
          setSelectedCameraId(resolved)
        }
      }
    } catch {
      // Enumeration can fail before permission is granted; retried later.
    }
  }, [])

  const stopScanner = useCallback(
    (nextStatus: 'idle' | 'error' = 'idle', nextMessage = initialScannerMessage) => {
      startInFlightRef.current = false
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
    const videoElement = videoRef.current

    // A start is already in progress or the camera is already live — don't
    // request the camera again (which would trigger a second permission prompt).
    if (startInFlightRef.current) {
      return
    }

    stopScanner()
    startInFlightRef.current = true
    setScannerStatus('starting')
    setScannerMessage('Starting camera…')

    scanHandledRef.current = false

    const handleDecode = (
      result: Result | undefined,
      error: unknown,
      activeControls: IScannerControls,
    ) => {
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

      if (error && !isTransientScannerError(error)) {
        stopScanner('error', describeCameraError(error))
      }
    }

    // A fresh reader per attempt — reusing one after a failed getUserMedia can
    // leave it in a bad state. `undefined` deviceId uses facingMode.
    const runDecode = (deviceId: string | undefined) => {
      const reader = new BrowserMultiFormatReader(scannerHints)
      scannerReaderRef.current = reader
      return reader.decodeFromVideoDevice(deviceId, videoElement, handleDecode)
    }

    // Only pass a deviceId we know is currently connected; otherwise fall back
    // to the browser default. This prevents "device not found" / "invalid
    // constraint" errors from a stale remembered id (e.g. Firefox rotates ids).
    const knownCameras = camerasRef.current.filter((camera) => camera.deviceId)
    const requestedDeviceId = selectedCameraIdRef.current ?? undefined
    const desiredDeviceId =
      requestedDeviceId &&
      (knownCameras.length === 0 ||
        knownCameras.some((camera) => camera.deviceId === requestedDeviceId))
        ? requestedDeviceId
        : undefined

    try {
      let controls: IScannerControls

      try {
        controls = await runDecode(desiredDeviceId)
      } catch (error) {
        // The chosen camera failed (gone, unusable closed-lid built-in, or a
        // stale id). Forget it and retry with the browser's default so the user
        // isn't left stuck. Note: not all browsers make this an `Error`
        // instance (Firefox's OverconstrainedError isn't), so we don't filter.
        if (desiredDeviceId) {
          selectedCameraIdRef.current = null
          setSelectedCameraId(null)
          controls = await runDecode(undefined)
        } else {
          throw error
        }
      }

      scannerControlsRef.current = controls
      setScannerStatus('active')
      setScannerMessage('Point the camera at a barcode.')

      // Permission is now granted, so labels/deviceIds are readable — refresh
      // the picker and reflect whichever camera actually started.
      void refreshCameras()
      const activeStream = videoRef.current?.srcObject
      if (activeStream instanceof MediaStream) {
        const activeDeviceId = activeStream
          .getVideoTracks()[0]
          ?.getSettings().deviceId
        if (activeDeviceId) {
          selectedCameraIdRef.current = activeDeviceId
          setSelectedCameraId(activeDeviceId)

          // Keep a remembered preference's id fresh when its label still matches
          // (handles Firefox regenerating ids between sessions).
          const preference = readCameraPreference()
          const activeCamera = camerasRef.current.find(
            (camera) => camera.deviceId === activeDeviceId,
          )
          if (
            preference &&
            activeCamera?.label &&
            preference.label === activeCamera.label &&
            preference.deviceId !== activeDeviceId
          ) {
            rememberCameraPreference({
              deviceId: activeDeviceId,
              label: activeCamera.label,
            })
          }
        }
      }
    } catch (error) {
      stopScanner('error', describeCameraError(error))
    }
  }, [clearVideoStream, goToProduct, refreshCameras, stopScanner])

  // Track the browser's remembered camera permission so we can auto-start
  // whenever it's already granted (and react if it later changes).
  useEffect(() => {
    if (!cameraSupported) {
      return
    }
    return watchCameraPermission(setCameraPermission)
  }, [])

  // Populate the camera list on mount and whenever the set of connected cameras
  // changes (webcam plugged in/unplugged), so the picker stays accurate.
  useEffect(() => {
    if (!cameraSupported) {
      return
    }

    void refreshCameras()

    const mediaDevices = navigator.mediaDevices
    if (typeof mediaDevices?.addEventListener !== 'function') {
      return
    }

    const handleDeviceChange = () => void refreshCameras()
    mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () =>
      mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [refreshCameras])

  // Once permission flips to granted, device labels become readable — re-run
  // enumeration so the picker shows real camera names instead of blanks.
  useEffect(() => {
    if (cameraPermission === 'granted') {
      void refreshCameras()
    }
  }, [cameraPermission, refreshCameras])

  // Auto-resume only when the Permissions API reports a *persistent* 'granted'
  // state, which guarantees re-acquiring the camera won't show a prompt
  // (Chrome/Edge). When the permission is 'prompt', 'denied', or can't be read
  // (Firefox/Safari), we wait for an explicit "Start camera" click so the user
  // never gets a surprise permission dialog on navigation.
  useEffect(() => {
    if (
      !cameraSupported ||
      cameraManuallyStopped ||
      scannerStatus !== 'idle' ||
      cameraPermission !== 'granted'
    ) {
      return
    }

    // Defer the auto-start to the next tick so React's StrictMode
    // setup→cleanup→setup double-invocation in development (and rapid
    // permission-state changes) collapse into a single camera start, instead
    // of opening the browser's permission dialog twice.
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void startScanner()
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [cameraManuallyStopped, cameraPermission, scannerStatus, startScanner])

  // Graceful recovery: if the camera was unavailable (error state) and a usable
  // camera later appears — the user plugs in a webcam or opens the laptop lid —
  // retry automatically. Gated on the *transition* to having a camera so it
  // can't loop, on real deviceIds (so we never surprise-prompt before
  // permission), and on the user not having manually stopped.
  useEffect(() => {
    if (!cameraSupported) {
      return
    }

    const hasUsableCamera = cameras.some((camera) => camera.deviceId)
    const cameraJustAppeared = hasUsableCamera && !hadUsableCameraRef.current
    hadUsableCameraRef.current = hasUsableCamera

    if (
      !cameraJustAppeared ||
      scannerStatus !== 'error' ||
      cameraManuallyStopped
    ) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        void startScanner()
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [cameras, scannerStatus, cameraManuallyStopped, startScanner])

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

  // Only cameras with a real deviceId are selectable; before permission is
  // granted the browser returns placeholder entries with blank ids/labels.
  const selectableCameras = cameras.filter((camera) => camera.deviceId)

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
                  scannerStoppedByUser = true
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
                    scannerStoppedByUser = false
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

          {/* Camera picker — only shown when there's a real choice to make.
              Passing an explicit deviceId is what keeps multi-webcam setups
              (notably on Firefox) from selecting the wrong or unusable camera. */}
          {selectableCameras.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="camera-select">Camera</Label>
              <Select
                value={selectedCameraId ?? undefined}
                onValueChange={(deviceId) => {
                  const chosen = selectableCameras.find(
                    (camera) => camera.deviceId === deviceId,
                  )
                  selectedCameraIdRef.current = deviceId
                  setSelectedCameraId(deviceId)
                  rememberCameraPreference({
                    deviceId,
                    label: chosen?.label ?? '',
                  })
                  scannerStoppedByUser = false
                  setCameraManuallyStopped(false)
                  // Re-acquire with the newly chosen camera if one is live.
                  if (scannerStatus === 'active' || scannerStatus === 'starting') {
                    stopScanner()
                    void startScanner()
                  }
                }}
              >
                <SelectTrigger id="camera-select">
                  <SelectValue placeholder="Select a camera" />
                </SelectTrigger>
                <SelectContent>
                  {selectableCameras.map((camera, index) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
