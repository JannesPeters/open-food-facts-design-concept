import type { ReactNode } from 'react'
import { ArrowLeft, LogIn, ScanLine } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const scannerAction = (
  <Button
    asChild
    variant="outline"
    size="sm"
    className="w-9 px-0 sm:w-auto sm:px-3"
  >
    <Link to="/scanner" aria-label="Scanner">
      <ScanLine className="size-4" />
      <span className="hidden sm:inline">Scanner</span>
    </Link>
  </Button>
)

const loginAction = (
  <Button
    asChild
    variant="outline"
    size="sm"
    className="w-9 px-0 sm:w-auto sm:px-3"
  >
    <Link to="/login" aria-label="Sign in">
      <LogIn className="size-4" />
      <span className="hidden sm:inline">Sign in</span>
    </Link>
  </Button>
)

export function HeaderBackButton({ label = 'Back' }: { label?: string }) {
  const navigate = useNavigate()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate('/')
        }
      }}
    >
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  )
}

function SiteHeader({
  leading = null,
  trailing = scannerAction,
  showLoginAction = true,
  center = (
    <Link to="/" className="flex items-center gap-2.5 justify-self-center">
      <img
        src="/off-logo-icon-light.svg"
        alt="Open Food Facts"
        className="h-10 w-auto dark:hidden"
      />
      <img
        src="/off-logo-icon-dark.svg"
        alt="Open Food Facts"
        className="hidden h-10 w-auto dark:block"
      />
    </Link>
  ),
  tone = 'default',
}: {
  leading?: ReactNode
  trailing?: ReactNode
  showLoginAction?: boolean
  center?: ReactNode
  tone?: 'default' | 'edit'
}) {
  const headerClassName =
    tone === 'edit'
      ? 'fixed inset-x-0 top-0 z-40 border-b border-primary bg-primary'
      : 'fixed inset-x-0 top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'
  const isActionOnlyMode = center === null

  return (
    <>
      <header className={headerClassName}>
        {isActionOnlyMode ? (
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-2">
            <div className="flex min-w-0 items-center justify-start">{leading}</div>
            <div className="flex min-w-0 items-center justify-end gap-1.5">
              {trailing}
              {showLoginAction ? loginAction : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-6 py-2">
            <div className="flex min-w-0 items-center justify-start">
              {leading}
            </div>

            {center}

            <div className="flex min-w-0 items-center justify-end gap-1.5">
              {trailing}
              {showLoginAction ? loginAction : null}
            </div>
          </div>
        )}
      </header>
      <div className="h-[60px] shrink-0" aria-hidden />
    </>
  )
}

export default SiteHeader
